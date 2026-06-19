<script setup lang="ts">
import { computed, ref } from 'vue'
import { catalogTracks, type CatalogTrack } from '../catalog/tracks'
import AudioPlayer from '../components/AudioPlayer.vue'
import LyricsDisplay from '../components/LyricsDisplay.vue'
import { findActiveLine, parseLrc, type LyricLine } from '../domain/lyrics'

const selectedTrack = ref<CatalogTrack>(catalogTracks[0])
const currentTime = ref(0)
const audioDuration = ref<number>()
const lyrics = computed(() => parseLrc(selectedTrack.value.lyricsContent))
const activeLine = computed(() => findActiveLine(lyrics.value, currentTime.value))
const previousLine = computed<LyricLine | undefined>(() => {
  const line = activeLine.value

  if (!line) {
    return undefined
  }

  const index = lyrics.value.findIndex((candidate) => candidate.id === line.id)

  return lyrics.value[index - 1]
})
const nextLine = computed<LyricLine | undefined>(() => {
  const line = activeLine.value

  if (!line) {
    return lyrics.value[0]
  }

  const index = lyrics.value.findIndex((candidate) => candidate.id === line.id)

  return lyrics.value[index + 1]
})

function selectTrack(track: CatalogTrack) {
  selectedTrack.value = track
  currentTime.value = 0
  audioDuration.value = undefined
}
</script>

<template>
  <section class="catalog-view">
    <div class="catalog-view__header">
      <div>
        <p class="eyebrow">Catalogue</p>
        <h2>Musiques préparées</h2>
      </div>
      <p class="line-count">{{ catalogTracks.length }} titre</p>
    </div>

    <div class="catalog-layout">
      <aside class="catalog-list" aria-label="Titres disponibles">
        <button
          v-for="track in catalogTracks"
          :key="track.id"
          class="catalog-track"
          :class="{ 'catalog-track--active': selectedTrack.id === track.id }"
          type="button"
          @click="selectTrack(track)"
        >
          <span>{{ track.title }}</span>
          <span class="catalog-track__format">MP3 + LRC</span>
        </button>
      </aside>

      <div class="catalog-player">
        <div>
          <p class="eyebrow">Lecture</p>
          <h3>{{ selectedTrack.title }}</h3>
        </div>
        <AudioPlayer
          :key="selectedTrack.id"
          :audio-url="selectedTrack.audioUrl"
          @timeupdate="currentTime = $event"
          @durationchange="audioDuration = $event"
        />
        <LyricsDisplay
          :current-time="currentTime"
          :fallback-end-time="audioDuration"
          :active-line="activeLine"
          :previous-line="previousLine"
          :next-line="nextLine"
          placeholder="Lancez la lecture pour démarrer le karaoké."
        />
      </div>
    </div>
  </section>
</template>
