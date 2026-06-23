<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { formatTimestamp } from '../domain/lyrics'
import { useI18n } from '../i18n'

defineProps<{
  audioUrl?: string
}>()

const emit = defineEmits<{
  timeupdate: [time: number]
  durationchange: [duration: number]
}>()

const audioElement = ref<HTMLAudioElement>()
const { t } = useI18n()
const currentTimeMs = ref(0)
const durationMs = ref(0)
const isPlaying = ref(false)
const volume = ref(1)
let animationFrameId: number | undefined

function emitCurrentTime() {
  if (audioElement.value) {
    currentTimeMs.value = Math.round(audioElement.value.currentTime * 1000)
    emit('timeupdate', currentTimeMs.value)
  }
}

function emitMetadata() {
  emitCurrentTime()

  if (audioElement.value && Number.isFinite(audioElement.value.duration)) {
    durationMs.value = Math.round(audioElement.value.duration * 1000)
    emit('durationchange', durationMs.value)
  }
}

function startLoop() {
  stopLoop()

  const tick = () => {
    emitCurrentTime()
    animationFrameId = requestAnimationFrame(tick)
  }

  animationFrameId = requestAnimationFrame(tick)
}

function stopLoop() {
  if (animationFrameId !== undefined) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = undefined
  }

  emitCurrentTime()
}

function onPlay() {
  isPlaying.value = true
  startLoop()
}

function onPause() {
  isPlaying.value = false
  stopLoop()
}

async function togglePlayback() {
  if (!audioElement.value) {
    return
  }

  if (audioElement.value.paused) {
    await audioElement.value.play()
  } else {
    audioElement.value.pause()
  }
}

function onSeekInput(event: Event) {
  if (!audioElement.value) {
    return
  }

  const nextTimeMs = Number((event.target as HTMLInputElement).value)

  audioElement.value.currentTime = nextTimeMs / 1000
  currentTimeMs.value = nextTimeMs
  emit('timeupdate', nextTimeMs)
}

function onVolumeInput(event: Event) {
  const nextVolume = Number((event.target as HTMLInputElement).value)

  volume.value = nextVolume

  if (audioElement.value) {
    audioElement.value.volume = nextVolume
  }
}

onBeforeUnmount(stopLoop)
</script>

<template>
  <div v-if="audioUrl" class="audio-player">
    <audio
      ref="audioElement"
      :src="audioUrl"
      preload="metadata"
      @ended="onPause"
      @loadedmetadata="emitMetadata"
      @pause="onPause"
      @play="onPlay"
      @seeked="emitCurrentTime"
      @volumechange="volume = audioElement?.volume ?? volume"
    />

    <button
      class="audio-player__play"
      type="button"
      :aria-label="isPlaying ? t('audioPlayer.pause') : t('audioPlayer.play')"
      @click="togglePlayback"
    >
      {{ isPlaying ? 'Ⅱ' : '▶' }}
    </button>

    <input
      class="audio-player__seek"
      type="range"
      min="0"
      :max="durationMs || 0"
      step="100"
      :value="currentTimeMs"
      :aria-label="t('audioPlayer.seek')"
      @input="onSeekInput"
    />

    <span class="audio-player__time">
      {{ formatTimestamp(currentTimeMs) }} / {{ formatTimestamp(durationMs) }}
    </span>

    <label class="audio-player__volume">
      <span>{{ t('audioPlayer.volume') }}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        :aria-label="t('audioPlayer.volume')"
        @input="onVolumeInput"
      />
    </label>
  </div>
  <p v-else class="audio-player audio-player--empty">{{ t('audioPlayer.empty') }}</p>
</template>
