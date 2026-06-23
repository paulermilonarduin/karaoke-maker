<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AudioWaveform from '../components/AudioWaveform.vue'
import FileDropField from '../components/FileDropField.vue'
import ShortcutEditor from '../components/ShortcutEditor.vue'
import {
  buildSyncedLines,
  createKaraokeFile,
  findActiveLine,
  formatTimestamp,
  isBridgeLine,
  parsePlainLyrics,
  serializeKaraokeFile,
  type DraftLyricLine,
  type KaraokeProject,
} from '../domain/lyrics'
import {
  useGeneratorShortcutSettings,
  useGeneratorShortcuts,
} from '../generator/shortcuts'
import type { WaveformRegionChange, WaveformRegionModel } from '../generator/timeline'
import { useI18n } from '../i18n'

type SegmentPosition = {
  lineIndex: number
  segmentIndex: number
}

defineProps<{
  accentColor: string
}>()

const project = ref<KaraokeProject>({
  title: '',
  draftLines: [],
})
const manualBridgeCount = ref(0)

const audioUrl = ref<string>()
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const syncError = ref<string>()
const waveformRef = ref<InstanceType<typeof AudioWaveform>>()
const isCapturingShortcut = ref(false)
const {
  actions: shortcutActions,
  hasCustomShortcuts,
  resetShortcuts,
  setShortcut,
} = useGeneratorShortcutSettings()
const { t } = useI18n()

const syncedLines = computed(() =>
  buildSyncedLines(project.value.draftLines, audioDurationMs.value),
)
const syncedLineCount = computed(
  () => project.value.draftLines.filter((line) => line.startMs !== undefined).length,
)
const totalSegmentCount = computed(() =>
  project.value.draftLines.reduce((total, line) => total + line.segments.length, 0),
)
const syncedSegmentCount = computed(() =>
  project.value.draftLines.reduce(
    (total, line) =>
      total + line.segments.filter((segment) => segment.startMs !== undefined).length,
    0,
  ),
)
const nextDraftLineIndex = computed(() =>
  project.value.draftLines.findIndex((line) => line.startMs === undefined),
)
const nextDraftLine = computed(() => project.value.draftLines[nextDraftLineIndex.value])
const nextSegmentPosition = computed<SegmentPosition | undefined>(() => {
  if (nextDraftLine.value) {
    return undefined
  }

  for (let lineIndex = 0; lineIndex < project.value.draftLines.length; lineIndex += 1) {
    const segmentIndex = project.value.draftLines[lineIndex].segments.findIndex(
      (segment) => segment.startMs === undefined,
    )

    if (segmentIndex !== -1) {
      return { lineIndex, segmentIndex }
    }
  }

  return undefined
})
const nextSegmentLine = computed(() =>
  nextSegmentPosition.value
    ? project.value.draftLines[nextSegmentPosition.value.lineIndex]
    : undefined,
)
const nextSegment = computed(() =>
  nextSegmentPosition.value
    ? nextSegmentLine.value?.segments[nextSegmentPosition.value.segmentIndex]
    : undefined,
)

const editingLineIndex = computed(() => {
  if (nextSegmentPosition.value) {
    return nextSegmentPosition.value.lineIndex
  }

  const activeLineId = activeLine.value?.id
  const activeIndex = project.value.draftLines.findIndex((line) => line.id === activeLineId)

  return activeIndex === -1 ? 0 : activeIndex
})

const timelineRegions = computed<WaveformRegionModel[]>(() => {
  const regions: WaveformRegionModel[] = []
  const allLinesStarted = nextDraftLine.value === undefined

  project.value.draftLines.forEach((line, lineIndex) => {
    if (line.startMs === undefined) {
      return
    }

    const lineEndMs =
      line.endMs ??
      project.value.draftLines[lineIndex + 1]?.startMs ??
      (allLinesStarted ? audioDurationMs.value : undefined)

    regions.push({
      id: `line/${line.id}`,
      kind: 'line',
      label: isBridgeLine(line) ? `B${lineIndex + 1}` : `L${lineIndex + 1}`,
      startMs: line.startMs,
      endMs: lineEndMs !== undefined && lineEndMs > line.startMs ? lineEndMs : undefined,
      editable: true,
    })

    if (
      isBridgeLine(line) ||
      lineEndMs === undefined ||
      syncPhase.value === 'lines' ||
      lineIndex !== editingLineIndex.value
    ) {
      return
    }

    line.segments.forEach((segment, segmentIndex) => {
      if (segment.startMs === undefined) {
        return
      }

      const segmentEndMs =
        segment.endMs ?? line.segments[segmentIndex + 1]?.startMs ?? lineEndMs

      if (segmentEndMs <= segment.startMs) {
        return
      }

      regions.push({
        id: `segment/${segment.id}`,
        kind: 'segment',
        label: segment.text.trim(),
        startMs: segment.startMs,
        endMs: segmentEndMs,
        editable: true,
      })
    })
  })

  return regions
})
const syncPhase = computed<'lines' | 'segments'>(() =>
  project.value.draftLines.length === 0 || nextDraftLine.value ? 'lines' : 'segments',
)
const syncProgress = computed(() =>
  syncPhase.value === 'lines'
    ? t('generator.progressBlocks', {
        current: syncedLineCount.value,
        total: project.value.draftLines.length,
      })
    : t('generator.progressWords', {
        current: syncedSegmentCount.value,
        total: totalSegmentCount.value,
      }),
)
const canExport = computed(
  () =>
    project.value.draftLines.length > 0 &&
    nextDraftLine.value === undefined &&
    nextSegmentPosition.value === undefined &&
    audioDurationMs.value !== undefined &&
    syncedLines.value.length === project.value.draftLines.length,
)

const activeLine = computed(() => findActiveLine(syncedLines.value, currentTimeMs.value))

const nextDraftLineLabel = computed(() => getDraftLineLabel(nextDraftLine.value))

function getDraftLineLabel(line?: DraftLyricLine): string | undefined {
  if (!line) {
    return undefined
  }

  return isBridgeLine(line) ? t('generator.bridgeBlock') : line.text
}

function onAudioFile(file: File) {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }

  audioUrl.value = URL.createObjectURL(file)
  currentTimeMs.value = 0
  audioDurationMs.value = undefined
  syncError.value = undefined
  project.value.audioFileName = file.name
  project.value.title = file.name.replace(/\.[^.]+$/, '')
}

async function onLyricsFile(file: File) {
  const content = await file.text()

  project.value.lyricsFileName = file.name
  project.value.draftLines = parsePlainLyrics(content)
  syncError.value = undefined
}

function markNextLine() {
  const index = nextDraftLineIndex.value

  if (index === -1) {
    return
  }

  const previousStartMs = project.value.draftLines[index - 1]?.startMs

  if (previousStartMs !== undefined && currentTimeMs.value <= previousStartMs) {
    syncError.value = t('generator.error.lineOrder')
    return
  }

  const line = project.value.draftLines[index]
  const previousLine = project.value.draftLines[index - 1]

  if (previousLine) {
    previousLine.endMs = currentTimeMs.value

    const previousLastSegment = previousLine.segments[previousLine.segments.length - 1]

    if (previousLastSegment?.startMs !== undefined) {
      previousLastSegment.endMs = currentTimeMs.value
    }
  }

  line.startMs = currentTimeMs.value
  line.endMs = undefined

  if (!isBridgeLine(line)) {
    line.segments[0].startMs = currentTimeMs.value
    line.segments[0].endMs = undefined
  }

  syncError.value = undefined
}

function addBridgeBlock() {
  if (syncPhase.value !== 'lines') {
    return
  }

  if (!audioUrl.value) {
    syncError.value = t('generator.error.missingAudio')
    return
  }

  const insertIndex =
    nextDraftLineIndex.value === -1 ? project.value.draftLines.length : nextDraftLineIndex.value
  const previousLine = project.value.draftLines[insertIndex - 1]

  if (previousLine?.startMs !== undefined && currentTimeMs.value <= previousLine.startMs) {
    syncError.value = t('generator.error.lineOrder')
    return
  }

  if (previousLine?.startMs !== undefined) {
    previousLine.endMs = currentTimeMs.value

    const previousLastSegment = previousLine.segments[previousLine.segments.length - 1]

    if (previousLastSegment?.startMs !== undefined) {
      previousLastSegment.endMs = currentTimeMs.value
    }
  }

  manualBridgeCount.value += 1
  project.value.draftLines.splice(insertIndex, 0, {
    id: `bridge:manual:${Date.now()}:${manualBridgeCount.value}`,
    kind: 'bridge',
    text: '',
    startMs: currentTimeMs.value,
    endMs: undefined,
    segments: [],
  })
  syncError.value = undefined
}

function markNextSegment() {
  const position = nextSegmentPosition.value

  if (!position) {
    return
  }

  const line = project.value.draftLines[position.lineIndex]
  const segment = line.segments[position.segmentIndex]
  const previousSegment = line.segments[position.segmentIndex - 1]
  const lineEndMs =
    project.value.draftLines[position.lineIndex + 1]?.startMs ?? audioDurationMs.value

  if (previousSegment?.startMs !== undefined && currentTimeMs.value <= previousSegment.startMs) {
    syncError.value = t('generator.error.wordOrder')
    return
  }

  if (lineEndMs !== undefined && currentTimeMs.value >= lineEndMs) {
    syncError.value = t('generator.error.lineBounds')
    return
  }

  if (previousSegment) {
    previousSegment.endMs = currentTimeMs.value
  }

  segment.startMs = currentTimeMs.value
  segment.endMs = undefined
  syncError.value = undefined
}

function markNextMarker() {
  if (!audioUrl.value) {
    syncError.value = t('generator.error.missingAudio')
    return
  }

  if (syncPhase.value === 'lines') {
    markNextLine()
  } else {
    markNextSegment()
  }
}

function undoLastMarker() {
  for (let lineIndex = project.value.draftLines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    const line = project.value.draftLines[lineIndex]

    for (let segmentIndex = line.segments.length - 1; segmentIndex >= 1; segmentIndex -= 1) {
      if (line.segments[segmentIndex].startMs !== undefined) {
        line.segments[segmentIndex - 1].endMs = undefined
        line.segments[segmentIndex].startMs = undefined
        line.segments[segmentIndex].endMs = undefined
        syncError.value = undefined
        return
      }
    }
  }

  for (let lineIndex = project.value.draftLines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    const line = project.value.draftLines[lineIndex]

    if (line.startMs !== undefined) {
      const previousLine = project.value.draftLines[lineIndex - 1]

      if (previousLine) {
        previousLine.endMs = undefined

        const previousLastSegment = previousLine.segments[previousLine.segments.length - 1]

        if (previousLastSegment) {
          previousLastSegment.endMs = undefined
        }
      }

      line.startMs = undefined
      line.endMs = undefined

      const firstSegment = line.segments[0]

      if (firstSegment) {
        firstSegment.startMs = undefined
        firstSegment.endMs = undefined
      }

      syncError.value = undefined
      return
    }
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function onRegionChange(change: WaveformRegionChange) {
  if (change.kind === 'line') {
    const lineId = change.id.replace(/^line\//, '')
    const lineIndex = project.value.draftLines.findIndex((line) => line.id === lineId)
    const line = project.value.draftLines[lineIndex]

    if (!line || line.startMs === undefined) {
      return
    }

    const oldRegion = timelineRegions.value.find((region) => region.id === change.id)

    if (oldRegion?.endMs === undefined) {
      const previousLine = project.value.draftLines[lineIndex - 1]
      const nextLine = project.value.draftLines[lineIndex + 1]
      const minimumStart = previousLine?.endMs ?? previousLine?.startMs ?? 0
      const maximumStart = Math.max(
        minimumStart,
        (nextLine?.startMs ?? audioDurationMs.value ?? change.startMs + 1) - 1,
      )
      const startMs = clamp(change.startMs, minimumStart, maximumStart)
      const delta = startMs - line.startMs

      line.startMs = startMs
      line.segments.forEach((segment) => {
        if (segment.startMs !== undefined) segment.startMs += delta
        if (segment.endMs !== undefined) segment.endMs += delta
      })
      syncError.value = undefined
      return
    }

    const previousLine = project.value.draftLines[lineIndex - 1]
    const nextLine = project.value.draftLines[lineIndex + 1]
    const minimumStart = previousLine?.endMs ?? 0
    const maximumEnd = nextLine?.startMs ?? audioDurationMs.value ?? change.endMs
    const oldStartMs = line.startMs
    const oldEndMs = line.endMs ?? oldRegion.endMs
    const rawStartDelta = change.startMs - oldStartMs
    const rawEndDelta = change.endMs - oldEndMs
    const movedAsBlock = Math.abs(rawStartDelta - rawEndDelta) <= 1
    const oldLengthMs = oldEndMs - oldStartMs
    const startMs = movedAsBlock
      ? clamp(change.startMs, minimumStart, maximumEnd - oldLengthMs)
      : clamp(change.startMs, minimumStart, maximumEnd - 1)
    const endMs = movedAsBlock
      ? startMs + oldLengthMs
      : clamp(change.endMs, startMs + 1, maximumEnd)
    const startDelta = startMs - oldStartMs

    line.startMs = startMs
    line.endMs = endMs

    if (movedAsBlock) {
      line.segments.forEach((segment) => {
        if (segment.startMs !== undefined) segment.startMs += startDelta
        if (segment.endMs !== undefined) segment.endMs += startDelta
      })
    } else {
      const firstSegment = line.segments[0]
      const lastSegment = line.segments[line.segments.length - 1]

      if (firstSegment?.startMs === oldStartMs) firstSegment.startMs = startMs
      if (lastSegment?.endMs === oldEndMs) lastSegment.endMs = endMs
    }

    syncError.value = undefined
    return
  }

  const segmentId = change.id.replace(/^segment\//, '')

  for (const line of project.value.draftLines) {
    const segmentIndex = line.segments.findIndex((segment) => segment.id === segmentId)

    if (segmentIndex === -1 || line.startMs === undefined) {
      continue
    }

    const segment = line.segments[segmentIndex]
    const previousSegment = line.segments[segmentIndex - 1]
    const nextSegment = line.segments[segmentIndex + 1]
    const oldRegion = timelineRegions.value.find((region) => region.id === change.id)
    const lineEndMs =
      line.endMs ??
      project.value.draftLines[project.value.draftLines.indexOf(line) + 1]?.startMs ??
      audioDurationMs.value ??
      change.endMs
    const minimumStart = previousSegment?.endMs ?? line.startMs
    const maximumEnd = nextSegment?.startMs ?? lineEndMs
    const oldStartMs = segment.startMs ?? oldRegion?.startMs ?? change.startMs
    const oldEndMs = segment.endMs ?? oldRegion?.endMs ?? change.endMs
    const rawStartDelta = change.startMs - oldStartMs
    const rawEndDelta = change.endMs - oldEndMs
    const movedAsBlock = Math.abs(rawStartDelta - rawEndDelta) <= 1
    const oldLengthMs = oldEndMs - oldStartMs
    const startMs = movedAsBlock
      ? clamp(change.startMs, minimumStart, maximumEnd - oldLengthMs)
      : clamp(change.startMs, minimumStart, maximumEnd - 1)
    const endMs = movedAsBlock
      ? startMs + oldLengthMs
      : clamp(change.endMs, startMs + 1, maximumEnd)

    segment.startMs = startMs
    segment.endMs = endMs
    syncError.value = undefined
    return
  }
}

function downloadKaraokeFile() {
  if (audioDurationMs.value === undefined) {
    return
  }

  try {
    const karaokeFile = createKaraokeFile(
      project.value,
      syncedLines.value,
      audioDurationMs.value,
    )
    const content = serializeKaraokeFile(karaokeFile)
    const fileName = `${project.value.title || 'karaoke'}.karaoke.json`
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    syncError.value = undefined
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : t('generator.error.export')
  }
}

useGeneratorShortcuts(
  {
    'player.toggle': () => void waveformRef.value?.togglePlayback(),
    'marker.create': markNextMarker,
    'marker.bridge': addBridgeBlock,
    'marker.undo': undoLastMarker,
    'player.seekBackward': () => waveformRef.value?.seekBy(-100),
    'player.seekForward': () => waveformRef.value?.seekBy(100),
    'marker.nudgeBackward': () => waveformRef.value?.nudgeSelectedRegion(-10),
    'marker.nudgeForward': () => waveformRef.value?.nudgeSelectedRegion(10),
    'player.slower': () => waveformRef.value?.adjustPlaybackRate(-1),
    'player.faster': () => waveformRef.value?.adjustPlaybackRate(1),
  },
  () => !isCapturingShortcut.value,
  () => shortcutActions.value,
)

onBeforeUnmount(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>

<template>
  <section class="generator-view">
    <div class="workspace-panel">
      <div class="workspace-panel__header">
        <div>
          <p class="eyebrow">{{ t('nav.generator') }}</p>
          <h2>{{ project.title || t('generator.newProjectTitle') }}</h2>
        </div>
        <p class="line-count">{{ syncProgress }}</p>
      </div>

      <div class="file-grid">
        <FileDropField
          accept="audio/mpeg,audio/mp3,.mp3"
          :label="t('generator.audioLabel')"
          :value="project.audioFileName"
          @change="onAudioFile"
        />
        <FileDropField
          accept=".txt,text/plain"
          :label="t('generator.lyricsLabel')"
          :value="project.lyricsFileName"
          @change="onLyricsFile"
        />
      </div>

      <AudioWaveform
        ref="waveformRef"
        :accent-color="accentColor"
        :audio-url="audioUrl"
        :regions="timelineRegions"
        @timeupdate="currentTimeMs = $event"
        @durationchange="audioDurationMs = $event"
        @regionchange="onRegionChange"
      />

      <div class="generator-tools">
        <div class="sync-panel">
          <div>
            <p class="eyebrow">
              {{ syncPhase === 'lines' ? t('generator.phaseLines') : t('generator.phaseWords') }}
            </p>
            <p class="sync-panel__time">{{ formatTimestamp(currentTimeMs) }}</p>
          </div>

          <p class="sync-panel__line">
            {{
              nextDraftLineLabel ||
              nextSegmentLine?.text ||
              t('generator.complete')
            }}
          </p>
          <p v-if="nextSegment" class="sync-panel__hint">
            {{ t('generator.nextWord') }} <strong>{{ nextSegment.text.trim() }}</strong>
          </p>
          <p v-if="syncError" class="sync-panel__error" role="alert">{{ syncError }}</p>

          <div class="action-row">
            <button
              class="button button--primary"
              type="button"
              :disabled="!audioUrl || (!nextDraftLine && !nextSegment)"
              @click="markNextMarker"
            >
              {{ t('generator.mark') }}
            </button>
            <button
              v-if="syncPhase === 'lines'"
              class="button"
              type="button"
              :disabled="!audioUrl"
              @click="addBridgeBlock"
            >
              {{ t('generator.addBridge') }}
            </button>
            <button
              class="button"
              type="button"
              :disabled="syncedLineCount === 0"
              @click="undoLastMarker"
            >
              {{ t('generator.undo') }}
            </button>
            <button class="button" type="button" :disabled="!canExport" @click="downloadKaraokeFile">
              {{ t('generator.exportJson') }}
            </button>
          </div>
        </div>

        <ShortcutEditor
          :actions="shortcutActions"
          :has-custom-shortcuts="hasCustomShortcuts"
          @capturechange="isCapturingShortcut = $event"
          @reset="resetShortcuts"
          @update="setShortcut"
        />
      </div>
    </div>
  </section>
</template>
