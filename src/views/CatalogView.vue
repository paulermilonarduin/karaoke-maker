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
const trackSearchQuery = ref('')
const karaokeFile = computed(() => parseKaraokeFile(selectedTrack.value.karaokeContent))
const lyrics = computed(() => karaokeFile.value.lines)
const activeLine = computed(() => findActiveLine(lyrics.value, currentTimeMs.value))
const { t } = useI18n()
const normalizedTrackSearchQuery = computed(() => normalizeTrackSearch(trackSearchQuery.value))
const filteredTracks = computed(() => {
  const query = normalizedTrackSearchQuery.value

  if (!query) {
    return catalogTracks
  }

  return catalogTracks.filter((track) =>
    normalizeTrackSearch(`${track.title} ${track.artist}`).includes(query),
  )
})
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

function normalizeTrackSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function selectTrack(track: CatalogTrack) {
  selectedTrack.value = track
  currentTimeMs.value = 0
  audioDurationMs.value = undefined
}

function formatCatalogDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
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
      <aside class="catalog-panel" :aria-label="t('catalog.availableTracks')">
        <label class="catalog-search">
          <svg class="catalog-search__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.8 18.1a7.3 7.3 0 1 1 5.15-2.14l4.14 4.13-1.41 1.41-4.14-4.13a7.25 7.25 0 0 1-3.74 1.03Zm0-2a5.3 5.3 0 1 0 0-10.6 5.3 5.3 0 0 0 0 10.6Z"
            />
          </svg>
          <span class="sr-only">{{ t('catalog.searchLabel') }}</span>
          <input
            v-model="trackSearchQuery"
            type="search"
            :placeholder="t('catalog.searchPlaceholder')"
            :aria-label="t('catalog.searchLabel')"
          />
        </label>

        <p class="catalog-search__meta">
          {{
            t('catalog.searchResults', {
              count: filteredTracks.length,
              total: catalogTracks.length,
            })
          }}
        </p>

        <div class="catalog-list" role="list">
          <button
            v-for="track in filteredTracks"
            :key="track.id"
            class="catalog-track"
            :class="{ 'catalog-track--active': selectedTrack.id === track.id }"
            type="button"
            role="listitem"
            @click="selectTrack(track)"
          >
            <span class="catalog-track__title">{{ track.title }}</span>
            <span class="catalog-track__artist">{{ track.artist }}</span>
            <span class="catalog-track__format">
              {{ formatCatalogDuration(track.durationMs) }} · {{ t('catalog.format') }}
            </span>
          </button>

          <p v-if="filteredTracks.length === 0" class="catalog-empty">
            {{ t('catalog.emptySearch') }}
          </p>
        </div>
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
          :artist="selectedTrack.artist"
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
