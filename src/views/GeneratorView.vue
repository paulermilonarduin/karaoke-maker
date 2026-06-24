<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AudioWaveform from '../components/AudioWaveform.vue'
import FileDropField from '../components/FileDropField.vue'
import ShortcutEditor from '../components/ShortcutEditor.vue'
import {
  applyWordAlignment,
  buildSyncedLines,
  collectLyricWords,
  createKaraokeFile,
  findActiveLine,
  formatTimestamp,
  isBridgeLine,
  parsePlainLyrics,
  serializeKaraokeFile,
  type AlignmentResult,
  type DraftLyricLine,
  type KaraokeProject,
} from '../domain/lyrics'
import {
  isAlignmentAvailable,
  isCatalogAvailable,
  onAlignmentProgress,
  requestAlignment,
  saveToCatalog,
} from '../desktop/bridge'
import {
  useGeneratorShortcutSettings,
  useGeneratorShortcuts,
} from '../generator/shortcuts'
import { resultPlainLyrics, searchLyrics, type LyricsSearchResult } from '../lyrics/lrclib'
import type { WaveformRegionChange, WaveformRegionModel } from '../generator/timeline'
import { useI18n, type Locale } from '../i18n'

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
const audioFile = ref<File>()
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const syncError = ref<string>()
const exportMessage = ref<string>()
const waveformRef = ref<InstanceType<typeof AudioWaveform>>()
const isCapturingShortcut = ref(false)
const autoAlignAvailable = isAlignmentAvailable()
const autoAlignState = ref<'idle' | 'running' | 'error' | 'done'>('idle')
const autoAlignProgress = ref('')
const autoAlignError = ref('')
const autoAlignDismissed = ref(false)
const autoAlignResult = ref<AlignmentResult | null>(null)
const leadMs = ref(180)
const lyricsQuery = ref('')
const lyricsResults = ref<LyricsSearchResult[]>([])
const lyricsSearchState = ref<'idle' | 'loading' | 'error'>('idle')
const lyricsSearchError = ref('')
const { t, locale, localeOptions } = useI18n()
const songLanguage = ref<Locale>(locale.value)
const {
  actions: shortcutActions,
  hasCustomShortcuts,
  resetShortcuts,
  setShortcut,
} = useGeneratorShortcutSettings()

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

const showAutoAlign = computed(
  () =>
    autoAlignAvailable &&
    !!audioUrl.value &&
    project.value.draftLines.length > 0 &&
    !autoAlignDismissed.value &&
    (autoAlignState.value !== 'idle' || syncedLineCount.value === 0),
)

const exportLabel = computed(() =>
  isCatalogAvailable() ? t('generator.addToCatalog') : t('generator.exportJson'),
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
  audioFile.value = file
  currentTimeMs.value = 0
  audioDurationMs.value = undefined
  syncError.value = undefined
  resetAutoAlign()
  project.value.audioFileName = file.name
  project.value.title = file.name.replace(/\.[^.]+$/, '')
}

async function onLyricsFile(file: File) {
  const content = await file.text()

  project.value.lyricsFileName = file.name
  project.value.draftLines = parsePlainLyrics(content)
  syncError.value = undefined
  resetAutoAlign()
}

function resetAutoAlign() {
  autoAlignState.value = 'idle'
  autoAlignProgress.value = ''
  autoAlignError.value = ''
  autoAlignDismissed.value = false
  autoAlignResult.value = null
}

function formatSeconds(seconds?: number): string {
  if (!seconds) {
    return ''
  }

  const total = Math.round(seconds)

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

async function searchOnlineLyrics() {
  const query = lyricsQuery.value.trim()

  if (!query || lyricsSearchState.value === 'loading') {
    return
  }

  lyricsSearchState.value = 'loading'
  lyricsSearchError.value = ''
  lyricsResults.value = []

  try {
    lyricsResults.value = await searchLyrics(query)
    lyricsSearchState.value = 'idle'

    if (lyricsResults.value.length === 0) {
      lyricsSearchError.value = t('generator.lyricsSearchEmpty')
    }
  } catch (error) {
    lyricsSearchState.value = 'error'
    lyricsSearchError.value = t('generator.lyricsSearchError', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

function loadSearchedLyrics(event: Event) {
  const id = Number((event.target as HTMLSelectElement).value)
  const result = lyricsResults.value.find((item) => item.id === id)

  if (!result) {
    return
  }

  const plain = resultPlainLyrics(result)

  if (!plain.trim()) {
    lyricsSearchError.value = t('generator.lyricsSearchNoText')
    return
  }

  project.value.lyricsFileName = `${result.artistName} — ${result.trackName}`
  project.value.draftLines = parsePlainLyrics(plain)

  if (!project.value.title) {
    project.value.title = result.trackName
  }

  syncError.value = undefined
  lyricsSearchError.value = ''
  resetAutoAlign()
}

function applyAlignmentResult() {
  const result = autoAlignResult.value

  if (!result) {
    return
  }

  const durationMs = audioDurationMs.value ?? result.durationMs

  project.value.draftLines = applyWordAlignment(
    project.value.draftLines,
    result.words,
    durationMs,
    leadMs.value,
  )
}

// Re-merge instantly when the lead changes — no need to re-run the aligner.
watch(leadMs, () => {
  if (autoAlignResult.value) {
    applyAlignmentResult()
  }
})

async function runAutoAlignment() {
  if (!audioFile.value || autoAlignState.value === 'running') {
    return
  }

  const words = collectLyricWords(project.value.draftLines)

  if (words.length === 0) {
    autoAlignState.value = 'error'
    autoAlignError.value = t('generator.autoNoWords')
    return
  }

  autoAlignState.value = 'running'
  autoAlignProgress.value = t('generator.autoStarting')
  autoAlignError.value = ''

  const unsubscribe = onAlignmentProgress((line) => {
    autoAlignProgress.value = line.replace(/^(PROGRESS|ERROR):\s*/, '')
  })

  try {
    const audioBytes = await audioFile.value.arrayBuffer()
    const result = await requestAlignment({
      audioBytes,
      audioFileName: audioFile.value.name,
      words,
      language: songLanguage.value,
      device: 'cpu',
      useDemucs: true,
    })

    if (audioDurationMs.value === undefined) {
      audioDurationMs.value = result.durationMs
    }

    autoAlignResult.value = result
    applyAlignmentResult()
    autoAlignState.value = 'done'
    syncError.value = undefined
  } catch (error) {
    autoAlignState.value = 'error'
    autoAlignError.value = error instanceof Error ? error.message : t('generator.autoFailed')
  } finally {
    unsubscribe()
    autoAlignProgress.value = ''
  }
}

function dismissAutoAlign() {
  autoAlignDismissed.value = true
  autoAlignState.value = 'idle'
  autoAlignError.value = ''
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

async function exportKaraoke() {
  if (audioDurationMs.value === undefined) {
    return
  }

  exportMessage.value = undefined
  let content: string

  try {
    const karaokeFile = createKaraokeFile(project.value, syncedLines.value, audioDurationMs.value)
    content = serializeKaraokeFile(karaokeFile)
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : t('generator.error.export')
    return
  }

  const title = project.value.title || 'karaoke'

  // Desktop: save straight into the on-disk catalog (audio + json) so it shows
  // up in the Catalog without any manual file juggling.
  if (isCatalogAvailable() && audioFile.value) {
    try {
      const audioBytes = await audioFile.value.arrayBuffer()
      const id = await saveToCatalog({
        id: title,
        karaokeJson: content,
        audioBytes,
        audioFileName: project.value.audioFileName ?? audioFile.value.name,
      })

      syncError.value = undefined
      exportMessage.value = t('generator.exportedToCatalog', { id })
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : t('generator.error.export')
    }

    return
  }

  // Browser: download the file.
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${title}.karaoke.json`
  link.click()
  URL.revokeObjectURL(url)
  syncError.value = undefined
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

      <div class="lyrics-search">
        <p class="eyebrow">{{ t('generator.lyricsSearchLabel') }}</p>
        <div class="lyrics-search__row">
          <input
            v-model="lyricsQuery"
            class="lyrics-search__input"
            type="search"
            :placeholder="t('generator.lyricsSearchPlaceholder')"
            :aria-label="t('generator.lyricsSearchLabel')"
            @keyup.enter="searchOnlineLyrics"
          />
          <button
            class="button"
            type="button"
            :disabled="lyricsSearchState === 'loading' || !lyricsQuery.trim()"
            @click="searchOnlineLyrics"
          >
            {{
              lyricsSearchState === 'loading'
                ? t('generator.lyricsSearching')
                : t('generator.lyricsSearchButton')
            }}
          </button>
        </div>
        <select
          v-if="lyricsResults.length"
          class="lyrics-search__select"
          :aria-label="t('generator.lyricsSearchLabel')"
          @change="loadSearchedLyrics"
        >
          <option value="">{{ t('generator.lyricsSearchChoose') }}</option>
          <option v-for="result in lyricsResults" :key="result.id" :value="result.id">
            {{ result.artistName }} — {{ result.trackName
            }}{{ result.duration ? ` (${formatSeconds(result.duration)})` : '' }}
          </option>
        </select>
        <p v-if="lyricsSearchError" class="lyrics-search__error" role="alert">
          {{ lyricsSearchError }}
        </p>
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

      <div v-if="showAutoAlign" class="auto-align">
        <p class="eyebrow">{{ t('generator.autoTitle') }}</p>

        <template v-if="autoAlignState === 'running'">
          <p class="auto-align__progress">
            <span class="auto-align__spinner" aria-hidden="true"></span>
            {{ autoAlignProgress || t('generator.autoStarting') }}
          </p>
        </template>

        <template v-else-if="autoAlignState === 'done'">
          <p class="auto-align__title">✓ {{ t('generator.autoApplied') }}</p>

          <label class="auto-align__lead">
            <span class="auto-align__hint">{{ t('generator.autoLead') }} : {{ leadMs }} ms</span>
            <input
              v-model.number="leadMs"
              class="auto-align__lead-range"
              type="range"
              min="0"
              max="400"
              step="10"
              :aria-label="t('generator.autoLead')"
            />
          </label>

          <div class="action-row">
            <button class="button" type="button" @click="runAutoAlignment">
              {{ t('generator.autoRedo') }}
            </button>
            <button class="button" type="button" @click="dismissAutoAlign">
              {{ t('generator.autoHide') }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="auto-align__title">{{ t('generator.autoQuestion') }}</p>
          <p class="auto-align__hint">{{ t('generator.autoHint') }}</p>
          <p v-if="autoAlignState === 'error'" class="auto-align__error" role="alert">
            {{ t('generator.autoError', { message: autoAlignError }) }}
          </p>

          <div class="auto-align__language" role="group" :aria-label="t('generator.autoLanguage')">
            <span class="auto-align__hint">{{ t('generator.autoLanguage') }}</span>
            <div class="auto-align__lang-options">
              <button
                v-for="option in localeOptions"
                :key="option.value"
                class="button auto-align__lang"
                :class="{ 'auto-align__lang--active': songLanguage === option.value }"
                type="button"
                :aria-pressed="songLanguage === option.value"
                @click="songLanguage = option.value"
              >
                <span v-if="songLanguage === option.value" class="auto-align__lang-check" aria-hidden="true">✓ </span>{{ option.flag }} {{ option.label }}
              </button>
            </div>
          </div>

          <label class="auto-align__lead">
            <span class="auto-align__hint">{{ t('generator.autoLead') }} : {{ leadMs }} ms</span>
            <input
              v-model.number="leadMs"
              class="auto-align__lead-range"
              type="range"
              min="0"
              max="400"
              step="10"
              :aria-label="t('generator.autoLead')"
            />
          </label>

          <div class="action-row">
            <button class="button button--primary" type="button" @click="runAutoAlignment">
              {{ autoAlignState === 'error' ? t('generator.autoRetry') : t('generator.autoYes') }}
            </button>
            <button class="button" type="button" @click="dismissAutoAlign">
              {{ t('generator.autoNo') }}
            </button>
          </div>
        </template>
      </div>

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
          <p v-if="exportMessage" class="sync-panel__success" role="status">{{ exportMessage }}</p>

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
            <button class="button" type="button" :disabled="!canExport" @click="exportKaraoke">
              {{ exportLabel }}
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
