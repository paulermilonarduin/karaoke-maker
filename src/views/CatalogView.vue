<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { catalogTracks, type CatalogTrack } from '../catalog/tracks'
import AudioPlayer from '../components/AudioPlayer.vue'
import LyricsDisplay from '../components/LyricsDisplay.vue'
import {
  isCatalogAvailable,
  listCatalog,
  readCatalogAudioUrl,
  type CatalogEntry,
} from '../desktop/bridge'
import { findActiveLine, parseKaraokeFile, type LyricLine } from '../domain/lyrics'
import { useI18n } from '../i18n'

type PlayableTrack = CatalogTrack | {
  id: string
  title: string
  artist: string
  durationMs: number
  karaokeContent: string
  audioFileName: string
}

const instrumentalInterludeThresholdMs = 2500

const tracks = ref<PlayableTrack[]>(catalogTracks)
const selectedTrack = ref<PlayableTrack | undefined>(catalogTracks[0])
const resolvedAudioUrl = ref<string | undefined>(catalogTracks[0]?.audioUrl)
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const trackSearchQuery = ref('')
const loadError = ref<string>()
const karaokeFile = computed(() => {
  const content = selectedTrack.value?.karaokeContent

  return content ? parseKaraokeFile(content) : undefined
})
const lyrics = computed(() => karaokeFile.value?.lines ?? [])
const syncOffsetMs = computed(() => karaokeFile.value?.sync?.offsetMs ?? 0)
const displayTimeMs = computed(() => currentTimeMs.value + syncOffsetMs.value)
const activeLine = computed(() =>
  findActiveLine(lyrics.value, currentTimeMs.value, syncOffsetMs.value),
)
const { t } = useI18n()
const normalizedTrackSearchQuery = computed(() => normalizeTrackSearch(trackSearchQuery.value))
const filteredTracks = computed(() => {
  const query = normalizedTrackSearchQuery.value

  if (!query) {
    return tracks.value
  }

  return tracks.value.filter((track) =>
    normalizeTrackSearch(`${track.title} ${track.artist}`).includes(query),
  )
})
const playback = computed<{
  display?: LyricLine
  previous?: LyricLine
  next?: LyricLine
}>(() => {
  const active = activeLine.value

  if (active) {
    const index = lyrics.value.findIndex((candidate) => candidate.id === active.id)

    return {
      display: active,
      previous: lyrics.value[index - 1],
      next: lyrics.value[index + 1],
    }
  }

  let lingeringIndex = -1

  for (let index = 0; index < lyrics.value.length; index += 1) {
    if (lyrics.value[index].startMs <= displayTimeMs.value) {
      lingeringIndex = index
    } else {
      break
    }
  }

  const lingering = lyrics.value[lingeringIndex]
  const upcoming = lyrics.value[lingeringIndex + 1]

  if (upcoming) {
    const gapStartMs = lingering?.endMs ?? 0

    if (upcoming.startMs - gapStartMs >= instrumentalInterludeThresholdMs) {
      return {
        display: {
          id: `interlude:gap:${lingeringIndex}`,
          kind: 'interlude',
          startMs: gapStartMs,
          endMs: upcoming.startMs,
          text: '',
        },
        previous: lingering,
        next: upcoming,
      }
    }
  }

  return {
    display: lingering,
    previous: lyrics.value[lingeringIndex - 1],
    next: upcoming,
  }
})
const displayLine = computed(() => playback.value.display)
const previousLine = computed(() => playback.value.previous)
const nextLine = computed(() => playback.value.next)

function isBundledTrack(track: PlayableTrack): track is CatalogTrack {
  return 'audioUrl' in track
}

function normalizeTrackSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function createDiskTrack(entry: CatalogEntry): PlayableTrack | undefined {
  try {
    const file = parseKaraokeFile(entry.karaokeContent)

    return {
      id: entry.id,
      title: file.song.title,
      artist: file.song.artist,
      durationMs: file.song.durationMs,
      karaokeContent: entry.karaokeContent,
      audioFileName: entry.audioFileName,
    }
  } catch {
    return undefined
  }
}

function revokeResolvedAudioUrl() {
  if (resolvedAudioUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(resolvedAudioUrl.value)
  }
}

async function selectTrack(track: PlayableTrack) {
  selectedTrack.value = track
  currentTimeMs.value = 0
  audioDurationMs.value = undefined
  loadError.value = undefined
  revokeResolvedAudioUrl()
  resolvedAudioUrl.value = undefined

  if (isBundledTrack(track)) {
    resolvedAudioUrl.value = track.audioUrl
    return
  }

  try {
    resolvedAudioUrl.value = await readCatalogAudioUrl(track.id, track.audioFileName)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  }
}

function formatCatalogDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

onMounted(async () => {
  if (isCatalogAvailable()) {
    try {
      const entries = await listCatalog()
      const diskTracks = entries
        .map((entry) => createDiskTrack(entry))
        .filter((track): track is PlayableTrack => track !== undefined)

      if (diskTracks.length > 0) {
        tracks.value = diskTracks
      }
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
    }
  }

  if (tracks.value[0]) {
    await selectTrack(tracks.value[0])
  }
})

onBeforeUnmount(revokeResolvedAudioUrl)
</script>

<template>
  <section class="catalog-view">
    <div class="catalog-view__header">
      <div>
        <p class="eyebrow">{{ t('catalog.eyebrow') }}</p>
        <p class="line-count">{{ t('catalog.count', { count: tracks.length }) }}</p>
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

        <div class="catalog-list" role="list">
          <button
            v-for="track in filteredTracks"
            :key="track.id"
            class="catalog-track"
            :class="{ 'catalog-track--active': selectedTrack?.id === track.id }"
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
          :current-time-ms="displayTimeMs"
          :fallback-end-time-ms="audioDurationMs"
          :active-line="displayLine"
          :previous-line="previousLine"
          :next-line="nextLine"
          :placeholder="t('catalog.placeholder')"
          :title="selectedTrack?.title"
          :artist="selectedTrack?.artist"
        >
          <template #footer>
            <p v-if="loadError" class="sync-panel__error" role="alert">{{ loadError }}</p>
            <AudioPlayer
              :key="selectedTrack?.id"
              :audio-url="resolvedAudioUrl"
              @timeupdate="currentTimeMs = $event"
              @durationchange="audioDurationMs = $event"
            />
          </template>
        </LyricsDisplay>
      </div>
    </div>
  </section>
</template>
