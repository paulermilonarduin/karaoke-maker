<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import type { LyricLine } from '../domain/lyrics'
import { formatTimestamp } from '../domain/lyrics'

const props = defineProps<{
  activeLine?: LyricLine
  previousLine?: LyricLine
  nextLine?: LyricLine
  placeholder?: string
}>()

type DisplayLine = {
  id: string
  position: 'previous' | 'current' | 'next'
  text: string
}

const displayElement = ref<HTMLElement>()
const lineElements = ref<HTMLElement[]>([])
let resizeObserver: ResizeObserver | undefined

const visibleLines = computed<DisplayLine[]>(() => {
  const lines: DisplayLine[] = []

  if (props.previousLine) {
    lines.push({
      id: props.previousLine.id,
      position: 'previous',
      text: props.previousLine.text,
    })
  }

  lines.push(
    props.activeLine
      ? { id: props.activeLine.id, position: 'current', text: props.activeLine.text }
      : {
          id: 'lyrics-placeholder',
          position: 'current',
          text: props.placeholder || 'Chargez un MP3 et des paroles brutes pour démarrer.',
        },
  )

  if (props.nextLine) {
    lines.push({ id: props.nextLine.id, position: 'next', text: props.nextLine.text })
  }

  return lines
})

function fitLine(element?: HTMLElement) {
  if (!element) {
    return
  }

  element.style.fontSize = ''
  const naturalFontSize = Number.parseFloat(getComputedStyle(element).fontSize)
  const scale = Math.min(1, element.clientWidth / element.scrollWidth)
  const targetFontSize = naturalFontSize * scale * (scale < 1 ? 0.98 : 1)

  element.style.fontSize = `${targetFontSize}px`
}

async function fitLyrics() {
  await nextTick()
  lineElements.value.forEach((element) => fitLine(element))
}

watch(
  () => visibleLines.value.map((line) => `${line.id}:${line.position}:${line.text}`).join('|'),
  () => void fitLyrics(),
)

onBeforeUpdate(() => {
  lineElements.value = []
})

onMounted(() => {
  resizeObserver = new ResizeObserver(() => void fitLyrics())

  if (displayElement.value) {
    resizeObserver.observe(displayElement.value)
  }

  void fitLyrics()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <section ref="displayElement" class="lyrics-display" aria-label="Aperçu karaoké">
    <p class="lyrics-display__time">
      {{ activeLine ? formatTimestamp(activeLine.start) : '00:00.000' }}
    </p>
    <div class="lyrics-display__stack">
      <p
        v-for="line in visibleLines"
        :key="line.id"
        ref="lineElements"
        class="lyrics-display__line"
        :class="`lyrics-display__${line.position}`"
      >
        {{ line.text }}
      </p>
    </div>
  </section>
</template>
