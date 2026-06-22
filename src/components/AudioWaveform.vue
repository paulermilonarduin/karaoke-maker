<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import { formatTimestamp } from '../domain/lyrics'
import type { WaveformRegionChange, WaveformRegionModel } from '../generator/timeline'

const props = withDefaults(
  defineProps<{
    audioUrl?: string
    regions?: WaveformRegionModel[]
  }>(),
  {
    regions: () => [],
  },
)

const emit = defineEmits<{
  timeupdate: [timeMs: number]
  durationchange: [durationMs: number]
  regionchange: [change: WaveformRegionChange]
  error: [message: string]
}>()

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5]
const waveformElement = ref<HTMLElement>()
const currentTimeMs = ref(0)
const durationMs = ref(0)
const playbackRate = ref(1)
const zoomPxPerSecond = ref(80)
const isPlaying = ref(false)
const isLoading = ref(false)
const selectedRegionId = ref<string>()
const localError = ref<string>()

let wavesurfer: WaveSurfer | undefined
let regionsPlugin: RegionsPlugin | undefined
let mounted = false

function getRegionModel(id: string): WaveformRegionModel | undefined {
  return props.regions.find((region) => region.id === id)
}

function getRegionColor(region: WaveformRegionModel): string {
  if (region.kind === 'line') {
    return region.id === selectedRegionId.value
      ? 'rgba(44, 122, 104, 0.3)'
      : 'rgba(44, 122, 104, 0.13)'
  }

  return region.id === selectedRegionId.value
    ? 'rgba(123, 210, 189, 0.48)'
    : 'rgba(123, 210, 189, 0.25)'
}

function applyRegionColors() {
  regionsPlugin?.getRegions().forEach((region) => {
    const model = getRegionModel(region.id)

    if (model) {
      region.setOptions({ color: getRegionColor(model) })
    }
  })
}

function renderRegions() {
  if (!regionsPlugin || durationMs.value <= 0) {
    return
  }

  regionsPlugin.clearRegions()

  const sortedRegions = [...props.regions].sort((left, right) => {
    if (left.kind === right.kind) return left.startMs - right.startMs
    return left.kind === 'line' ? -1 : 1
  })

  sortedRegions.forEach((region) => {
    if (region.endMs !== undefined && region.endMs <= region.startMs) {
      return
    }

    regionsPlugin?.addRegion({
      id: region.id,
      start: region.startMs / 1000,
      end: region.endMs !== undefined ? region.endMs / 1000 : undefined,
      content: region.label,
      color: getRegionColor(region),
      drag: region.editable,
      resize: region.editable && region.endMs !== undefined,
      minLength: 0.01,
    })
  })
}

function destroyWaveSurfer() {
  wavesurfer?.destroy()
  wavesurfer = undefined
  regionsPlugin = undefined
  isPlaying.value = false
  isLoading.value = false
}

async function setupWaveSurfer(audioUrl?: string) {
  destroyWaveSurfer()
  currentTimeMs.value = 0
  durationMs.value = 0
  selectedRegionId.value = undefined
  localError.value = undefined
  emit('timeupdate', 0)

  if (!audioUrl) {
    return
  }

  await nextTick()

  if (!waveformElement.value) {
    return
  }

  isLoading.value = true
  regionsPlugin = RegionsPlugin.create()

  wavesurfer = WaveSurfer.create({
    container: waveformElement.value,
    url: audioUrl,
    backend: 'MediaElement',
    height: 148,
    waveColor: '#9aaca5',
    progressColor: '#2c7a68',
    cursorColor: '#e0a84b',
    cursorWidth: 2,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    minPxPerSec: zoomPxPerSecond.value,
    fillParent: false,
    autoScroll: true,
    autoCenter: true,
    dragToSeek: { debounceTime: 30 },
    plugins: [
      regionsPlugin,
      TimelinePlugin.create({
        height: 24,
        style: { color: '#68716c', fontSize: '11px' },
      }),
      MinimapPlugin.create({
        height: 48,
        waveColor: '#c4cec9',
        progressColor: '#7bd2bd',
        overlayColor: 'rgba(16, 20, 19, 0.12)',
      }),
    ],
  })

  regionsPlugin.on('region-clicked', (region, event) => {
    event.stopPropagation()
    selectedRegionId.value = region.id
    applyRegionColors()
  })

  regionsPlugin.on('region-updated', (region) => {
    const model = getRegionModel(region.id)

    if (!model) {
      return
    }

    selectedRegionId.value = region.id
    emit('regionchange', {
      id: region.id,
      kind: model.kind,
      startMs: Math.round(region.start * 1000),
      endMs: Math.round(region.end * 1000),
    })
    applyRegionColors()
  })

  wavesurfer.on('ready', (duration) => {
    isLoading.value = false
    durationMs.value = Math.round(duration * 1000)
    wavesurfer?.setPlaybackRate(playbackRate.value, true)
    emit('durationchange', durationMs.value)
    renderRegions()
  })

  wavesurfer.on('timeupdate', (time) => {
    currentTimeMs.value = Math.round(time * 1000)
    emit('timeupdate', currentTimeMs.value)
  })

  wavesurfer.on('play', () => {
    isPlaying.value = true
  })

  wavesurfer.on('pause', () => {
    isPlaying.value = false
  })

  wavesurfer.on('error', (error) => {
    isLoading.value = false
    localError.value = error.message
    emit('error', error.message)
  })
}

async function togglePlayback() {
  if (!wavesurfer) return

  try {
    await wavesurfer.playPause()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de lancer la lecture.'
    localError.value = message
    emit('error', message)
  }
}

function seekBy(deltaMs: number) {
  if (!wavesurfer) return

  const nextTime = Math.min(
    durationMs.value,
    Math.max(0, currentTimeMs.value + deltaMs),
  )

  wavesurfer.setTime(nextTime / 1000)
}

function setPlaybackRate(rate: number) {
  playbackRate.value = rate
  wavesurfer?.setPlaybackRate(rate, true)
}

function adjustPlaybackRate(direction: -1 | 1) {
  const currentIndex = playbackRates.indexOf(playbackRate.value)
  const safeIndex = currentIndex === -1 ? playbackRates.indexOf(1) : currentIndex
  const nextIndex = Math.min(playbackRates.length - 1, Math.max(0, safeIndex + direction))

  setPlaybackRate(playbackRates[nextIndex])
}

function setZoom(value: number) {
  zoomPxPerSecond.value = value
  wavesurfer?.zoom(value)
}

function onZoomInput(event: Event) {
  setZoom(Number((event.target as HTMLInputElement).value))
}

function nudgeSelectedRegion(deltaMs: number) {
  const region = regionsPlugin
    ?.getRegions()
    .find((candidate) => candidate.id === selectedRegionId.value)
  const model = region ? getRegionModel(region.id) : undefined

  if (!region || !model || !model.editable) {
    return
  }

  const length = region.end - region.start
  const duration = durationMs.value / 1000
  const start = Math.min(Math.max(0, region.start + deltaMs / 1000), duration - length)
  const end = start + length

  region.setOptions({ start, end })
  emit('regionchange', {
    id: region.id,
    kind: model.kind,
    startMs: Math.round(start * 1000),
    endMs: Math.round(end * 1000),
  })
}

watch(
  () => props.audioUrl,
  (audioUrl) => {
    if (mounted) void setupWaveSurfer(audioUrl)
  },
)

watch(
  () => props.regions,
  () => renderRegions(),
  { deep: true },
)

onMounted(() => {
  mounted = true
  void setupWaveSurfer(props.audioUrl)
})

onBeforeUnmount(() => {
  mounted = false
  destroyWaveSurfer()
})

defineExpose({
  adjustPlaybackRate,
  nudgeSelectedRegion,
  seekBy,
  setPlaybackRate,
  togglePlayback,
})
</script>

<template>
  <section class="audio-waveform" aria-label="Éditeur de waveform">
    <div class="audio-waveform__toolbar">
      <div class="audio-waveform__transport">
        <button class="button" type="button" :disabled="!audioUrl" @click="seekBy(-1000)">
          −1 s
        </button>
        <button
          class="button button--primary audio-waveform__play"
          type="button"
          :disabled="!audioUrl"
          @click="togglePlayback"
        >
          {{ isPlaying ? 'Pause' : 'Lecture' }}
        </button>
        <button class="button" type="button" :disabled="!audioUrl" @click="seekBy(1000)">
          +1 s
        </button>
      </div>

      <div class="audio-waveform__rates" aria-label="Vitesse de lecture">
        <button
          v-for="rate in playbackRates"
          :key="rate"
          class="audio-waveform__rate"
          :class="{ 'audio-waveform__rate--active': playbackRate === rate }"
          type="button"
          :disabled="!audioUrl"
          @click="setPlaybackRate(rate)"
        >
          {{ rate.toString().replace('.', ',') }}×
        </button>
      </div>
    </div>

    <div v-if="audioUrl" class="audio-waveform__canvas" :class="{ 'is-loading': isLoading }">
      <div ref="waveformElement" class="audio-waveform__wave"></div>
      <p v-if="isLoading" class="audio-waveform__loading">Analyse de la piste audio…</p>
    </div>
    <p v-else class="audio-waveform__empty">Chargez un MP3 pour afficher sa waveform.</p>

    <div class="audio-waveform__footer">
      <p class="audio-waveform__clock">
        {{ formatTimestamp(currentTimeMs) }} / {{ formatTimestamp(durationMs) }}
      </p>
      <label class="audio-waveform__zoom">
        Zoom
        <input
          type="range"
          min="20"
          max="320"
          step="10"
          :value="zoomPxPerSecond"
          :disabled="!audioUrl"
          @input="onZoomInput"
        />
      </label>
    </div>

    <p v-if="localError" class="sync-panel__error" role="alert">{{ localError }}</p>
  </section>
</template>
