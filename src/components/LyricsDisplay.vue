<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'
import type { LyricLine, LyricSegment } from '../domain/lyrics'
import { formatTimestamp, isInterludeLine } from '../domain/lyrics'
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
  kind: LyricLine['kind']
  position: 'previous' | 'current' | 'next'
  text: string
  segments?: LyricSegment[]
}

const displayElement = ref<HTMLElement>()
const lineElements = ref<HTMLElement[]>([])
const isFullscreen = ref(false)
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
      text: isInterludeLine(props.previousLine)
        ? t('lyricsDisplay.interludeLabel')
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
          text: isInterludeLine(props.activeLine)
            ? t('lyricsDisplay.interludeLabel')
            : props.activeLine.text,
          segments: props.activeLine.segments,
        }
      : {
          id: 'lyrics-placeholder',
          kind: 'lyrics',
          position: 'current',
          text: props.placeholder || t('lyricsDisplay.placeholder'),
        },
  )

  if (props.nextLine) {
    lines.push({
      id: props.nextLine.id,
      kind: props.nextLine.kind,
      position: 'next',
      text: isInterludeLine(props.nextLine)
        ? t('lyricsDisplay.interludeLabel')
        : props.nextLine.text,
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

function syncFullscreenState() {
  isFullscreen.value = document.fullscreenElement === displayElement.value
  void fitLyrics()
}

async function toggleFullscreen() {
  const element = displayElement.value

  if (!element) {
    return
  }

  try {
    if (document.fullscreenElement === element) {
      await document.exitFullscreen()
    } else {
      await element.requestFullscreen()
    }
  } catch {
    // Browser fullscreen can be denied outside user gestures. The button remains available.
  }
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

  document.addEventListener('fullscreenchange', syncFullscreenState)
  void fitLyrics()
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
  resizeObserver?.disconnect()
})
</script>

<template>
  <section ref="displayElement" class="lyrics-display" :aria-label="t('lyricsDisplay.ariaLabel')">
    <button
      class="lyrics-display__fullscreen"
      type="button"
      :aria-label="
        isFullscreen ? t('lyricsDisplay.exitFullscreen') : t('lyricsDisplay.enterFullscreen')
      "
      :title="
        isFullscreen ? t('lyricsDisplay.exitFullscreen') : t('lyricsDisplay.enterFullscreen')
      "
      @click="toggleFullscreen"
    >
      <span aria-hidden="true">{{ isFullscreen ? '×' : '⛶' }}</span>
    </button>
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
          v-if="line.position === 'current' && line.kind === 'interlude'"
          class="lyrics-display__text lyrics-display__interlude"
          :style="{ '--interlude-progress': `${activeLineProgress * 100}%` }"
          role="progressbar"
          :aria-label="t('lyricsDisplay.interludeLabel')"
          :aria-valuenow="Math.round(activeLineProgress * 100)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="lyrics-display__interlude-track" aria-hidden="true">
            <span class="lyrics-display__interlude-fill"></span>
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
