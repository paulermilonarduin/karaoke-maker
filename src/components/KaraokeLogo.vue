<script setup lang="ts">
import { computed } from 'vue'

export type KaraokeLogoSize = 'small' | 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    animated?: boolean
    progress?: number
    size?: KaraokeLogoSize
    text?: string
    tilt?: number
  }>(),
  {
    animated: false,
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
    :class="[`karaoke-logo--${size}`, { 'karaoke-logo--animated': animated }]"
    :style="logoStyle"
    :aria-label="text"
    role="img"
  >
    <span class="text-highlight" :data-text="text" :style="highlightStyle" aria-hidden="true">
      {{ text }}
    </span>
  </span>
</template>
