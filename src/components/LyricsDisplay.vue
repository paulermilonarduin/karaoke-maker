<script setup lang="ts">
import type { LyricLine } from '../domain/lyrics'
import { formatTimestamp } from '../domain/lyrics'

defineProps<{
  activeLine?: LyricLine
  nextLine?: LyricLine
}>()
</script>

<template>
  <section class="lyrics-display" aria-label="Aperçu karaoké">
    <p class="lyrics-display__time">
      {{ activeLine ? formatTimestamp(activeLine.start) : '00:00.000' }}
    </p>
    <p class="lyrics-display__current">
      {{ activeLine?.text || 'Chargez un MP3 et des paroles brutes pour démarrer.' }}
    </p>
    <p class="lyrics-display__next">
      {{ nextLine?.text || 'La prochaine ligne apparaîtra ici.' }}
    </p>
  </section>
</template>
