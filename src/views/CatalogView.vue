<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { catalogTracks } from '../catalog/tracks'
import AudioPlayer from '../components/AudioPlayer.vue'
import LyricsDisplay from '../components/LyricsDisplay.vue'
import { isCatalogAvailable, listCatalog, readCatalogAudioUrl } from '../desktop/bridge'
import { findActiveLine, parseKaraokeFile, type LyricLine } from '../domain/lyrics'
import { useI18n } from '../i18n'

type PlayableTrack = {
  id: string
  title: string
  karaokeContent: string
  // Bundled tracks carry a ready Vite asset URL; disk tracks resolve their
  // audio to a blob URL on selection.
  audioUrl?: string
  audioFileName?: string
}

const tracks = ref<PlayableTrack[]>([])
const selectedTrack = ref<PlayableTrack>()
const resolvedAudioUrl = ref<string>()
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const loadError = ref<string>()
const { t } = useI18n()

const karaokeFile = computed(() => {
  const content = selectedTrack.value?.karaokeContent

  if (!content) {
    return undefined
  }

  try {
    return parseKaraokeFile(content)
  } catch {
    return undefined
  }
})
const lyrics = computed(() => karaokeFile.value?.lines ?? [])
// A gap shorter than this just lingers on the last line; a longer one shows an
// interlude countdown (a filling bar) to keep singers engaged until the next line.
const INTERLUDE_MIN_GAP_MS = 2500

const activeLine = computed(() => findActiveLine(lyrics.value, currentTimeMs.value))

// Resolves what to show, including instrumental gaps where no line is strictly
// active: short gaps linger on the last sung line, long gaps render a synthetic
// "bridge" interlude (the existing progress-bar loader) counting to the next line.
const playback = computed<{
  display?: LyricLine
  previous?: LyricLine
  next?: LyricLine
}>(() => {
  const active = activeLine.value

  if (active) {
    const index = lyrics.value.findIndex((line) => line.id === active.id)
    return { display: active, previous: lyrics.value[index - 1], next: lyrics.value[index + 1] }
  }

  let lingeringIndex = -1

  for (let index = 0; index < lyrics.value.length; index += 1) {
    if (lyrics.value[index].startMs <= currentTimeMs.value) {
      lingeringIndex = index
    } else {
      break
    }
  }

  const lingering = lyrics.value[lingeringIndex]
  const upcoming = lyrics.value[lingeringIndex + 1]

  if (upcoming) {
    const gapStart = lingering?.endMs ?? 0

    if (upcoming.startMs - gapStart >= INTERLUDE_MIN_GAP_MS) {
      const interlude: LyricLine = {
        id: `interlude:${lingeringIndex}`,
        kind: 'bridge',
        startMs: gapStart,
        endMs: upcoming.startMs,
        text: '',
      }

      return { display: interlude, previous: lingering, next: upcoming }
    }
  }

  return { display: lingering, previous: lyrics.value[lingeringIndex - 1], next: upcoming }
})

const displayLine = computed(() => playback.value.display)
const previousLine = computed(() => playback.value.previous)
const nextLine = computed(() => playback.value.next)

function revokeAudio() {
  if (resolvedAudioUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(resolvedAudioUrl.value)
  }
}

async function selectTrack(track: PlayableTrack) {
  selectedTrack.value = track
  currentTimeMs.value = 0
  audioDurationMs.value = undefined
  loadError.value = undefined
  revokeAudio()
  resolvedAudioUrl.value = undefined

  try {
    resolvedAudioUrl.value = track.audioUrl
      ? track.audioUrl
      : track.audioFileName
        ? await readCatalogAudioUrl(track.id, track.audioFileName)
        : undefined
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  }
}

function bundledTracks(): PlayableTrack[] {
  return catalogTracks.map((track) => ({
    id: track.id,
    title: track.title,
    karaokeContent: track.karaokeContent,
    audioUrl: track.audioUrl,
  }))
}

onMounted(async () => {
  if (isCatalogAvailable()) {
    try {
      const entries = await listCatalog()

      tracks.value = entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        karaokeContent: entry.karaokeContent,
        audioFileName: entry.audioFileName,
      }))
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
    }
  }

  // Browser, or an empty on-disk catalog: fall back to the bundled tracks.
  if (tracks.value.length === 0) {
    tracks.value = bundledTracks()
  }

  if (tracks.value[0]) {
    await selectTrack(tracks.value[0])
  }
})

onBeforeUnmount(revokeAudio)
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
      <aside class="catalog-list" :aria-label="t('catalog.availableTracks')">
        <button
          v-for="track in tracks"
          :key="track.id"
          class="catalog-track"
          :class="{ 'catalog-track--active': selectedTrack?.id === track.id }"
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
          :active-line="displayLine"
          :previous-line="previousLine"
          :next-line="nextLine"
          :placeholder="t('catalog.placeholder')"
          :title="selectedTrack?.title"
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
