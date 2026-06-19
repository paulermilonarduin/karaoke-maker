<script setup lang="ts">
import { computed } from 'vue'

export type KaraokeLogoSize = 'small' | 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    progress?: number
    size?: KaraokeLogoSize
    text?: string
    tilt?: number
  }>(),
  {
    progress: 65,
    size: 'medium',
    text: 'KARAOKE MAKER',
    tilt: -5,
  },
)

const logoStyle = computed(() => ({
  '--logo-tilt': `${props.tilt}deg`,
}))

const highlightStyle = computed(() => ({
  '--highlight-progress': `${Math.min(100, Math.max(0, props.progress))}%`,
}))
</script>

<template>
  <span
    class="karaoke-logo"
    :class="`karaoke-logo--${size}`"
    :style="logoStyle"
  >
    <span class="text-highlight" :data-text="text" :style="highlightStyle">{{ text }}</span>
  </span>
</template>
