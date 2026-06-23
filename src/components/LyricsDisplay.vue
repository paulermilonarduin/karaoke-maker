<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import type { LyricLine, LyricSegment } from '../domain/lyrics'
import { formatTimestamp, isBridgeLine } from '../domain/lyrics'
import { useI18n } from '../i18n'

const props = defineProps<{
  currentTimeMs: number
  fallbackEndTimeMs?: number
  activeLine?: LyricLine
  previousLine?: LyricLine
  nextLine?: LyricLine
  placeholder?: string
  title?: string
}>()

type DisplayLine = {
  id: string
  kind?: LyricLine['kind']
  position: 'previous' | 'current' | 'next'
  text: string
  segments?: LyricSegment[]
}

const displayElement = ref<HTMLElement>()
const lineElements = ref<HTMLElement[]>([])
const { t } = useI18n()
let resizeObserver: ResizeObserver | undefined

const activeLineProgress = computed(() => {
  const line = props.activeLine
  const endMs = line?.endMs ?? props.fallbackEndTimeMs

  if (!line || endMs === undefined || endMs <= line.startMs) {
    return 0
  }

  const progress = (props.currentTimeMs - line.startMs) / (endMs - line.startMs)

  return Math.min(1, Math.max(0, progress))
})

function getSegmentProgress(segment: LyricSegment): number {
  const progress = (props.currentTimeMs - segment.startMs) / (segment.endMs - segment.startMs)

  return Math.min(1, Math.max(0, progress))
}

const visibleLines = computed<DisplayLine[]>(() => {
  const lines: DisplayLine[] = []

  if (props.previousLine) {
    lines.push({
      id: props.previousLine.id,
      kind: props.previousLine.kind,
      position: 'previous',
      text: isBridgeLine(props.previousLine)
        ? t('lyricsDisplay.bridgeLabel')
        : props.previousLine.text,
      segments: props.previousLine.segments,
    })
  }

  lines.push(
    props.activeLine
      ? {
          id: props.activeLine.id,
          kind: props.activeLine.kind,
          position: 'current',
          text: isBridgeLine(props.activeLine)
            ? t('lyricsDisplay.bridgeLabel')
            : props.activeLine.text,
          segments: props.activeLine.segments,
        }
      : {
          id: 'lyrics-placeholder',
          position: 'current',
          text: props.placeholder || t('lyricsDisplay.placeholder'),
        },
  )

  if (props.nextLine) {
    lines.push({
      id: props.nextLine.id,
      kind: props.nextLine.kind,
      position: 'next',
      text: isBridgeLine(props.nextLine) ? t('lyricsDisplay.bridgeLabel') : props.nextLine.text,
      segments: props.nextLine.segments,
    })
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
  <section ref="displayElement" class="lyrics-display" :aria-label="t('lyricsDisplay.ariaLabel')">
    <p v-if="title" class="lyrics-display__title">{{ title }}</p>
    <p class="lyrics-display__time">
      {{ activeLine ? formatTimestamp(activeLine.startMs) : '00:00.000' }}
    </p>
    <div class="lyrics-display__stack">
      <p
        v-for="line in visibleLines"
        :key="line.id"
        ref="lineElements"
        class="lyrics-display__line"
        :class="`lyrics-display__${line.position}`"
      >
        <span
          v-if="line.position === 'current' && line.kind === 'bridge'"
          class="lyrics-display__text lyrics-display__bridge"
          :style="{ '--bridge-progress': `${activeLineProgress * 100}%` }"
          role="progressbar"
          :aria-label="t('lyricsDisplay.bridgeLabel')"
          :aria-valuenow="Math.round(activeLineProgress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="lyrics-display__bridge-track" aria-hidden="true">
            <span class="lyrics-display__bridge-fill"></span>
          </span>
        </span>
        <span
          v-else-if="line.position === 'current' && line.segments"
          class="lyrics-display__text lyrics-display__segments"
        >
          <span
            v-for="segment in line.segments"
            :key="segment.id"
            class="text-highlight"
            :data-text="segment.text"
            :style="{ '--highlight-progress': `${getSegmentProgress(segment) * 100}%` }"
          >{{ segment.text }}</span>
        </span>
        <span
          v-else-if="line.position === 'current'"
          class="lyrics-display__text text-highlight"
          :data-text="line.text"
          :style="{ '--highlight-progress': `${activeLineProgress * 100}%` }"
        >
          {{ line.text }}
        </span>
        <span v-else class="lyrics-display__text">
          {{ line.text }}
        </span>
      </p>
    </div>
    <div v-if="$slots.footer" class="lyrics-display__footer">
      <slot name="footer"></slot>
    </div>
  </section>
</template>
