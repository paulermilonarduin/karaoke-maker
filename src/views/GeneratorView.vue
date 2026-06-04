<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AudioPlayer from '../components/AudioPlayer.vue'
import FileDropField from '../components/FileDropField.vue'
import LyricsDisplay from '../components/LyricsDisplay.vue'
import { findActiveLine, parseLrc, type KaraokeProject, type LyricLine } from '../domain/lyrics'

const project = ref<KaraokeProject>({
  title: 'Nouveau karaoké',
  lines: [],
})

const audioUrl = ref<string>()
const currentTime = ref(0)

const activeLine = computed(() => findActiveLine(project.value.lines, currentTime.value))
const nextLine = computed<LyricLine | undefined>(() => {
  const line = activeLine.value

  if (!line) {
    return project.value.lines[0]
  }

  const index = project.value.lines.findIndex((candidate) => candidate.id === line.id)

  return project.value.lines[index + 1]
})

function onAudioFile(file: File) {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }

  audioUrl.value = URL.createObjectURL(file)
  project.value.audioFileName = file.name
  project.value.title = file.name.replace(/\.[^.]+$/, '')
}

async function onLyricsFile(file: File) {
  const content = await file.text()
  project.value.lyricsFileName = file.name
  project.value.lines = parseLrc(content)
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
        <p class="line-count">{{ project.lines.length }} lignes</p>
      </div>

      <div class="file-grid">
        <FileDropField
          accept="audio/mpeg,audio/mp3,.mp3"
          label="Musique MP3"
          :value="project.audioFileName"
          @change="onAudioFile"
        />
        <FileDropField
          accept=".lrc,text/plain"
          label="Paroles LRC"
          :value="project.lyricsFileName"
          @change="onLyricsFile"
        />
      </div>

      <AudioPlayer :audio-url="audioUrl" @timeupdate="currentTime = $event" />
    </div>

    <LyricsDisplay :active-line="activeLine" :next-line="nextLine" />
  </section>
</template>
