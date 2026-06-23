<script setup lang="ts">
import { computed, ref } from 'vue'
import { catalogTracks, type CatalogTrack } from '../catalog/tracks'
import AudioPlayer from '../components/AudioPlayer.vue'
import LyricsDisplay from '../components/LyricsDisplay.vue'
import { findActiveLine, parseKaraokeFile, type LyricLine } from '../domain/lyrics'
import { useI18n } from '../i18n'

const selectedTrack = ref<CatalogTrack>(catalogTracks[0])
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const karaokeFile = computed(() => parseKaraokeFile(selectedTrack.value.karaokeContent))
const lyrics = computed(() => karaokeFile.value.lines)
const activeLine = computed(() => findActiveLine(lyrics.value, currentTimeMs.value))
const { t } = useI18n()
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
  currentTimeMs.value = 0
  audioDurationMs.value = undefined
}
</script>

<template>
  <section class="catalog-view">
    <div class="catalog-view__header">
      <div>
        <p class="eyebrow">{{ t('catalog.eyebrow') }}</p>
        <p class="line-count">{{ t('catalog.count', { count: catalogTracks.length }) }}</p>
      </div>
    </div>

    <div class="catalog-layout">
      <aside class="catalog-list" :aria-label="t('catalog.availableTracks')">
        <button
          v-for="track in catalogTracks"
          :key="track.id"
          class="catalog-track"
          :class="{ 'catalog-track--active': selectedTrack.id === track.id }"
          type="button"
          @click="selectTrack(track)"
        >
          <span>{{ track.title }}</span>
          <span class="catalog-track__format">{{ t('catalog.format') }}</span>
        </button>
      </aside>

      <div class="catalog-player">
        <LyricsDisplay
          :current-time-ms="currentTimeMs"
          :fallback-end-time-ms="audioDurationMs"
          :active-line="activeLine"
          :previous-line="previousLine"
          :next-line="nextLine"
          :placeholder="t('catalog.placeholder')"
          :title="selectedTrack.title"
        >
          <template #footer>
            <AudioPlayer
              :key="selectedTrack.id"
              :audio-url="selectedTrack.audioUrl"
              @timeupdate="currentTimeMs = $event"
              @durationchange="audioDurationMs = $event"
            />
          </template>
        </LyricsDisplay>
      </div>
    </div>
  </section>
</template>
