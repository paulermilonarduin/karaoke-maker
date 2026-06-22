<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AudioPlayer from '../components/AudioPlayer.vue'
import FileDropField from '../components/FileDropField.vue'
import LyricsDisplay from '../components/LyricsDisplay.vue'
import {
  buildSyncedLines,
  createKaraokeFile,
  findActiveLine,
  formatTimestamp,
  parsePlainLyrics,
  serializeKaraokeFile,
  type KaraokeProject,
  type LyricLine,
} from '../domain/lyrics'

type SegmentPosition = {
  lineIndex: number
  segmentIndex: number
}

const project = ref<KaraokeProject>({
  title: 'Nouveau karaoké',
  draftLines: [],
})

const audioUrl = ref<string>()
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const syncError = ref<string>()

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
const syncPhase = computed<'lines' | 'segments'>(() =>
  project.value.draftLines.length === 0 || nextDraftLine.value ? 'lines' : 'segments',
)
const syncProgress = computed(() =>
  syncPhase.value === 'lines'
    ? `${syncedLineCount.value} / ${project.value.draftLines.length} lignes`
    : `${syncedSegmentCount.value} / ${totalSegmentCount.value} mots`,
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
const previousLine = computed<LyricLine | undefined>(() => {
  const line = activeLine.value

  if (!line) {
    return undefined
  }

  const index = syncedLines.value.findIndex((candidate) => candidate.id === line.id)

  return syncedLines.value[index - 1]
})
const nextLine = computed<LyricLine | undefined>(() => {
  const line = activeLine.value

  if (!line) {
    return syncedLines.value[0]
  }

  const index = syncedLines.value.findIndex((candidate) => candidate.id === line.id)

  return syncedLines.value[index + 1]
})

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
    syncError.value = 'Le marqueur doit être placé après celui de la ligne précédente.'
    return
  }

  const line = project.value.draftLines[index]

  line.startMs = currentTimeMs.value
  line.segments[0].startMs = currentTimeMs.value
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
    syncError.value = 'Le marqueur doit être placé après celui du mot précédent.'
    return
  }

  if (lineEndMs !== undefined && currentTimeMs.value >= lineEndMs) {
    syncError.value = 'Le marqueur doit rester dans les limites de la ligne.'
    return
  }

  segment.startMs = currentTimeMs.value
  syncError.value = undefined
}

function markNextMarker() {
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
        line.segments[segmentIndex].startMs = undefined
        syncError.value = undefined
        return
      }
    }
  }

  for (let lineIndex = project.value.draftLines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    const line = project.value.draftLines[lineIndex]

    if (line.startMs !== undefined) {
      line.startMs = undefined
      line.segments[0].startMs = undefined
      syncError.value = undefined
      return
    }
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
    syncError.value = error instanceof Error ? error.message : 'Impossible de générer le fichier.'
  }
}

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
          <p class="eyebrow">Génération</p>
          <h2>{{ project.title }}</h2>
        </div>
        <p class="line-count">{{ syncProgress }}</p>
      </div>

      <div class="file-grid">
        <FileDropField
          accept="audio/mpeg,audio/mp3,.mp3"
          label="Musique MP3"
          :value="project.audioFileName"
          @change="onAudioFile"
        />
        <FileDropField
          accept=".txt,text/plain"
          label="Paroles brutes"
          :value="project.lyricsFileName"
          @change="onLyricsFile"
        />
      </div>

      <AudioPlayer
        :audio-url="audioUrl"
        @timeupdate="currentTimeMs = $event"
        @durationchange="audioDurationMs = $event"
      />

      <div class="sync-panel">
        <div>
          <p class="eyebrow">
            {{ syncPhase === 'lines' ? 'Synchronisation des lignes' : 'Synchronisation des mots' }}
          </p>
          <p class="sync-panel__time">{{ formatTimestamp(currentTimeMs) }}</p>
        </div>

        <p class="sync-panel__line">
          {{
            nextDraftLine?.text ||
            nextSegmentLine?.text ||
            'Toutes les paroles sont synchronisées.'
          }}
        </p>
        <p v-if="nextSegment" class="sync-panel__hint">
          Prochain mot : <strong>{{ nextSegment.text.trim() }}</strong>
        </p>
        <p v-if="syncError" class="sync-panel__error" role="alert">{{ syncError }}</p>

        <div class="action-row">
          <button
            class="button button--primary"
            type="button"
            :disabled="!nextDraftLine && !nextSegment"
            @click="markNextMarker"
          >
            {{ syncPhase === 'lines' ? 'Marquer la ligne' : 'Marquer le mot' }}
          </button>
          <button
            class="button"
            type="button"
            :disabled="syncedLineCount === 0"
            @click="undoLastMarker"
          >
            Annuler
          </button>
          <button class="button" type="button" :disabled="!canExport" @click="downloadKaraokeFile">
            Exporter JSON
          </button>
        </div>
      </div>
    </div>

    <LyricsDisplay
      :current-time-ms="currentTimeMs"
      :fallback-end-time-ms="audioDurationMs"
      :active-line="activeLine"
      :previous-line="previousLine"
      :next-line="nextLine"
    />
  </section>
</template>
