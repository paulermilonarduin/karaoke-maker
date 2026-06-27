<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import MinimapPlugin from 'wavesurfer.js/dist/plugins/minimap.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import { formatTimestamp } from '../domain/lyrics'
import type { WaveformRegionChange, WaveformRegionModel } from '../generator/timeline'
import { useI18n } from '../i18n'

const props = withDefaults(
  defineProps<{
    accentColor?: string
    audioUrl?: string
    regions?: WaveformRegionModel[]
  }>(),
  {
    accentColor: '#7bd2bd',
    regions: () => [],
  },
)

const emit = defineEmits<{
  timeupdate: [timeMs: number]
  durationchange: [durationMs: number]
  zoomchange: [pxPerSecond: number]
  scrollchange: [scrollLeftPx: number]
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
const { t } = useI18n()

let wavesurfer: WaveSurfer | undefined
let regionsPlugin: RegionsPlugin | undefined
let mounted = false

function withAlpha(color: string, alpha: number): string {
  const normalized = color.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function getRegionModel(id: string): WaveformRegionModel | undefined {
  return props.regions.find((region) => region.id === id)
}

function getRegionColor(region: WaveformRegionModel): string {
  if (region.kind === 'line') {
    return region.id === selectedRegionId.value
      ? withAlpha(props.accentColor, 0.4)
      : withAlpha(props.accentColor, 0.2)
  }

  return region.id === selectedRegionId.value
    ? withAlpha(props.accentColor, 0.58)
    : withAlpha(props.accentColor, 0.32)
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
    height: 88,
    waveColor: '#40504b',
    progressColor: props.accentColor,
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
        height: 16,
        style: { color: '#b7c2bd', fontSize: '11px' },
      }),
      MinimapPlugin.create({
        height: 24,
        waveColor: '#33403c',
        progressColor: props.accentColor,
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

  wavesurfer.on('scroll', (_visibleStartTime, _visibleEndTime, scrollLeft) => {
    emit('scrollchange', scrollLeft)
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
    const message = error instanceof Error ? error.message : t('audioWaveform.playbackError')
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

function onPlaybackRateInput(event: Event) {
  setPlaybackRate(Number((event.target as HTMLSelectElement).value))
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
  emit('zoomchange', value)
}

function setScrollTime(timeSeconds: number) {
  wavesurfer?.setScrollTime(Math.max(0, timeSeconds))
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
  setScrollTime,
  setZoom,
  setPlaybackRate,
  togglePlayback,
})
</script>

<template>
  <section class="audio-waveform" :aria-label="t('audioWaveform.ariaLabel')">
    <div class="audio-waveform__toolbar">
      <div class="audio-waveform__transport">
        <button
          class="button button--primary audio-waveform__play"
          type="button"
          :disabled="!audioUrl"
          @click="togglePlayback"
        >
          {{ isPlaying ? t('audioWaveform.pause') : t('audioWaveform.play') }}
        </button>
      </div>

      <label class="audio-waveform__rate-control">
        <span>{{ t('audioWaveform.playbackRate') }}</span>
        <select
          class="audio-waveform__rate-select"
          :value="playbackRate"
          :disabled="!audioUrl"
          @change="onPlaybackRateInput"
        >
          <option v-for="rate in playbackRates" :key="rate" :value="rate">
            {{ rate.toString().replace('.', ',') }}×
          </option>
        </select>
      </label>
    </div>

    <div v-if="audioUrl" class="audio-waveform__canvas" :class="{ 'is-loading': isLoading }">
      <div ref="waveformElement" class="audio-waveform__wave"></div>
      <p v-if="isLoading" class="audio-waveform__loading">{{ t('audioWaveform.loading') }}</p>
    </div>
    <p v-else class="audio-waveform__empty">{{ t('audioWaveform.empty') }}</p>

    <div class="audio-waveform__footer">
      <p class="audio-waveform__clock">
        {{ formatTimestamp(currentTimeMs) }} / {{ formatTimestamp(durationMs) }}
      </p>
      <label class="audio-waveform__zoom">
        {{ t('audioWaveform.zoom') }}
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
