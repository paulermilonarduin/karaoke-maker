<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AudioPlayer from '../components/AudioPlayer.vue'
import FileDropField from '../components/FileDropField.vue'
import LyricsDisplay from '../components/LyricsDisplay.vue'
import {
  buildSyncedLines,
  findActiveLine,
  formatTimestamp,
  parsePlainLyrics,
  serializeLrc,
  type KaraokeProject,
  type LyricLine,
} from '../domain/lyrics'

const project = ref<KaraokeProject>({
  title: 'Nouveau karaoké',
  lines: [],
  draftLines: [],
})

const audioUrl = ref<string>()
const currentTime = ref(0)
const audioDuration = ref<number>()

const syncedLines = computed(() => buildSyncedLines(project.value.draftLines))
const syncedCount = computed(() => syncedLines.value.length)
const nextDraftLineIndex = computed(() =>
  project.value.draftLines.findIndex((line) => line.start === undefined),
)
const nextDraftLine = computed(() => project.value.draftLines[nextDraftLineIndex.value])
const canExport = computed(() => syncedLines.value.length > 0)

const activeLine = computed(() => findActiveLine(syncedLines.value, currentTime.value))
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
  audioDuration.value = undefined
  project.value.audioFileName = file.name
  project.value.title = file.name.replace(/\.[^.]+$/, '')
}

async function onLyricsFile(file: File) {
  const content = await file.text()
  project.value.lyricsFileName = file.name
  project.value.draftLines = parsePlainLyrics(content)
  project.value.lines = []
}

function markNextLine() {
  const index = nextDraftLineIndex.value

  if (index === -1) {
    return
  }

  project.value.draftLines[index].start = currentTime.value
  project.value.lines = syncedLines.value
}

function undoLastMarker() {
  let lastSyncedIndex = -1

  for (let index = project.value.draftLines.length - 1; index >= 0; index -= 1) {
    if (project.value.draftLines[index].start !== undefined) {
      lastSyncedIndex = index
      break
    }
  }

  if (lastSyncedIndex === -1) {
    return
  }

  project.value.draftLines[lastSyncedIndex].start = undefined
  project.value.lines = syncedLines.value
}

function downloadLrc() {
  const lrcContent = serializeLrc(syncedLines.value)
  const fileName = `${project.value.title || 'karaoke'}.lrc`
  const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
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
        <p class="line-count">{{ syncedCount }} / {{ project.draftLines.length }} marquées</p>
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
        @timeupdate="currentTime = $event"
        @durationchange="audioDuration = $event"
      />

      <div class="sync-panel">
        <div>
          <p class="eyebrow">Synchronisation</p>
          <p class="sync-panel__time">{{ formatTimestamp(currentTime) }}</p>
        </div>

        <p class="sync-panel__line">
          {{ nextDraftLine?.text || 'Toutes les lignes ont un marqueur temporel.' }}
        </p>

        <div class="action-row">
          <button
            class="button button--primary"
            type="button"
            :disabled="!nextDraftLine"
            @click="markNextLine"
          >
            Marquer la ligne
          </button>
          <button
            class="button"
            type="button"
            :disabled="syncedCount === 0"
            @click="undoLastMarker"
          >
            Annuler
          </button>
          <button class="button" type="button" :disabled="!canExport" @click="downloadLrc">
            Exporter LRC
          </button>
        </div>
      </div>
    </div>

    <LyricsDisplay
      :current-time="currentTime"
      :fallback-end-time="audioDuration"
      :active-line="activeLine"
      :previous-line="previousLine"
      :next-line="nextLine"
    />
  </section>
</template>
