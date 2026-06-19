<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

defineProps<{
  audioUrl?: string
}>()

const emit = defineEmits<{
  timeupdate: [time: number]
  durationchange: [duration: number]
}>()

const audioElement = ref<HTMLAudioElement>()
let animationFrameId: number | undefined

function emitCurrentTime() {
  if (audioElement.value) {
    emit('timeupdate', audioElement.value.currentTime)
  }
}

function emitMetadata() {
  emitCurrentTime()

  if (audioElement.value && Number.isFinite(audioElement.value.duration)) {
    emit('durationchange', audioElement.value.duration)
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

onBeforeUnmount(stopLoop)
</script>

<template>
  <audio
    v-if="audioUrl"
    ref="audioElement"
    class="audio-player"
    controls
    :src="audioUrl"
    @loadedmetadata="emitMetadata"
    @pause="stopLoop"
    @play="startLoop"
    @seeked="emitCurrentTime"
  />
  <p v-else class="audio-player audio-player--empty">Aucun MP3 chargé</p>
</template>
