<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AudioWaveform from '../components/AudioWaveform.vue'
import FileDropField from '../components/FileDropField.vue'
import ShortcutEditor from '../components/ShortcutEditor.vue'
import {
  buildSyncedLines,
  formatTimestamp,
  isInterludeLine,
  type KaraokeProject,
} from '../domain/lyrics'
import { isCatalogAvailable } from '../desktop/bridge'
import {
  useGeneratorShortcutSettings,
  useGeneratorShortcuts,
} from '../generator/shortcuts'
import { useAutoAlignment } from '../generator/useAutoAlignment'
import { useGeneratorFiles } from '../generator/useGeneratorFiles'
import { useLyricsSearch } from '../generator/useLyricsSearch'
import { useTimelineEditor } from '../generator/useTimelineEditor'
import { useTimelineUndo } from '../generator/useTimelineUndo'
import { useI18n } from '../i18n'

defineProps<{
  accentColor: string
}>()

const project = ref<KaraokeProject>({
  title: '',
  artist: '',
  draftLines: [],
})
const manualInterludeCount = ref(0)
const audioUrl = ref<string>()
const audioFile = ref<File>()
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const selectedLineId = ref<string>()
const selectedSegmentId = ref<string>()
const splitTextInput = ref<HTMLTextAreaElement>()
const syncError = ref<string>()
const exportMessage = ref<string>()
const waveformRef = ref<InstanceType<typeof AudioWaveform>>()
const timelineScrollRef = ref<HTMLElement>()
const isCapturingShortcut = ref(false)

const {
  actions: shortcutActions,
  hasCustomShortcuts,
  resetShortcuts,
  setShortcut,
} = useGeneratorShortcutSettings()
const { t, locale, localeOptions } = useI18n()

const {
  canUndo,
  canRedo,
  pushUndoSnapshot,
  clearUndoStack,
  undoLastChange,
  redoLastChange,
} = useTimelineUndo({
  project,
  manualInterludeCount,
  selectedLineId,
  selectedSegmentId,
  syncError,
})

const syncedLines = computed(() =>
  buildSyncedLines(project.value.draftLines, audioDurationMs.value),
)

const {
  timelineZoomPxPerSecond,
  timelineValidationIssues,
  timelineWidthPx,
  hasTimeline,
  selectedLine,
  selectedSegment,
  timelineZoomLabel,
  syncOffsetLabel,
  timelinePlayheadStyle,
  canMergeWithPreviousSegment,
  canMergeWithNextSegment,
  hasTiming,
  getLineStyle,
  canMoveLine,
  getSegmentStyle,
  getSegmentGaps,
  zoomTimeline,
  centerTimelineOnCurrentTime,
  onTimelineZoomInput,
  onTimelineWheel,
  initializeTimelineIfPossible,
  stopTimelineDrag,
  startTimelineDrag,
  selectLine,
  splitSegmentAtCursor,
  mergeSelectedSegmentWithPrevious,
  mergeSelectedSegmentWithNext,
  deleteSelectedSegmentSplit,
  addInterludeBlock,
  nudgeSelectedLine,
  setGlobalOffset,
  adjustGlobalOffset,
  onGlobalOffsetInput,
} = useTimelineEditor({
  project,
  audioDurationMs,
  currentTimeMs,
  manualInterludeCount,
  selectedLineId,
  selectedSegmentId,
  splitTextInput,
  syncError,
  timelineScrollRef,
  pushUndoSnapshot,
  setWaveformZoom: (zoom) => waveformRef.value?.setZoom(zoom),
  t,
})

const timelineSummary = computed(() =>
  t('generator.timelineSummary', {
    count: project.value.draftLines.length,
    duration: audioDurationMs.value ? formatTimestamp(audioDurationMs.value) : '00:00.000',
  }),
)
const canExport = computed(
  () =>
    hasTimeline.value &&
    timelineValidationIssues.value.length === 0 &&
    syncedLines.value.length === project.value.draftLines.length &&
    syncedLines.value.every((line) => line.endMs !== undefined),
)
const exportLabel = computed(() =>
  isCatalogAvailable() && audioFile.value ? t('generator.addToCatalog') : t('generator.exportJson'),
)

const {
  autoAlignState,
  autoAlignProgress,
  autoAlignError,
  leadMs,
  songLanguage,
  showAutoAlign,
  resetAutoAlign,
  runAutoAlignment,
  dismissAutoAlign,
} = useAutoAlignment({
  project,
  audioFile,
  audioDurationMs,
  selectedLineId,
  selectedSegmentId,
  syncError,
  defaultLanguage: locale.value,
  pushUndoSnapshot,
  t,
})

const {
  lyricsQuery,
  lyricsResults,
  lyricsSearchState,
  lyricsSearchError,
  formatSeconds,
  searchOnlineLyrics,
  loadSearchedLyrics,
} = useLyricsSearch({
  project,
  selectedLineId,
  selectedSegmentId,
  syncError,
  clearUndoStack,
  initializeTimelineIfPossible,
  onProjectInput: resetAutoAlign,
  t,
})

const {
  revokeAudioUrl,
  onAudioFile,
  onLyricsFile,
  onKaraokeFile,
  onDurationChange,
  downloadKaraokeFile,
} = useGeneratorFiles({
  project,
  audioUrl,
  audioFile,
  currentTimeMs,
  audioDurationMs,
  selectedLineId,
  selectedSegmentId,
  syncError,
  exportMessage,
  syncedLines,
  clearUndoStack,
  initializeTimelineIfPossible,
  onProjectInput: resetAutoAlign,
  t,
})

watch(
  () => project.value.draftLines.map((line) => `${line.id}:${line.startMs}:${line.endMs}`).join('|'),
  () => {
    const selected = selectedLine.value

    if (selected && !isInterludeLine(selected) && !selectedSegment.value) {
      selectedSegmentId.value = selected.segments[0]?.id
    }
  },
)

useGeneratorShortcuts(
  {
    'player.toggle': () => void waveformRef.value?.togglePlayback(),
    'timeline.splitSegment': splitSegmentAtCursor,
    'timeline.addInterlude': addInterludeBlock,
    'timeline.undo': undoLastChange,
    'timeline.redo': redoLastChange,
    'player.seekBackward': () => waveformRef.value?.seekBy(-100),
    'player.seekForward': () => waveformRef.value?.seekBy(100),
    'timeline.nudgeBackward': () => nudgeSelectedLine(-100),
    'timeline.nudgeForward': () => nudgeSelectedLine(100),
    'player.slower': () => waveformRef.value?.adjustPlaybackRate(-1),
    'player.faster': () => waveformRef.value?.adjustPlaybackRate(1),
  },
  () => !isCapturingShortcut.value,
  () => shortcutActions.value,
)

onBeforeUnmount(() => {
  stopTimelineDrag()
  revokeAudioUrl()
})
</script>

<template>
  <section class="generator-view">
    <div class="workspace-panel">
      <div class="workspace-panel__header">
        <div>
          <p class="eyebrow">{{ t('nav.generator') }}</p>
          <h2>{{ project.title || t('generator.newProjectTitle') }}</h2>
        </div>
        <p class="line-count">{{ timelineSummary }}</p>
      </div>

      <div class="file-grid">
        <FileDropField
          accept="audio/mpeg,audio/mp3,.mp3"
          :label="t('generator.audioLabel')"
          :value="project.audioFileName"
          @change="onAudioFile"
        />
        <FileDropField
          accept=".txt,text/plain"
          :label="t('generator.lyricsLabel')"
          :value="project.lyricsFileName"
          @change="onLyricsFile"
        />
        <FileDropField
          accept=".json,application/json"
          :label="t('generator.karaokeJsonLabel')"
          :value="project.karaokeFileName"
          @change="onKaraokeFile"
        />
      </div>

      <div class="lyrics-search">
        <p class="eyebrow">{{ t('generator.lyricsSearchLabel') }}</p>
        <div class="lyrics-search__row">
          <input
            v-model="lyricsQuery"
            class="lyrics-search__input"
            type="search"
            :placeholder="t('generator.lyricsSearchPlaceholder')"
            :aria-label="t('generator.lyricsSearchLabel')"
            @keyup.enter="searchOnlineLyrics"
          />
          <button
            class="button"
            type="button"
            :disabled="lyricsSearchState === 'loading' || !lyricsQuery.trim()"
            @click="searchOnlineLyrics"
          >
            {{
              lyricsSearchState === 'loading'
                ? t('generator.lyricsSearching')
                : t('generator.lyricsSearchButton')
            }}
          </button>
        </div>
        <select
          v-if="lyricsResults.length"
          class="lyrics-search__select"
          :aria-label="t('generator.lyricsSearchLabel')"
          @change="loadSearchedLyrics"
        >
          <option value="">{{ t('generator.lyricsSearchChoose') }}</option>
          <option v-for="result in lyricsResults" :key="result.id" :value="result.id">
            {{ result.artistName }} — {{ result.trackName
            }}{{ result.duration ? ` (${formatSeconds(result.duration)})` : '' }}
          </option>
        </select>
        <p v-if="lyricsSearchError" class="lyrics-search__error" role="alert">
          {{ lyricsSearchError }}
        </p>
      </div>

      <AudioWaveform
        ref="waveformRef"
        :accent-color="accentColor"
        :audio-url="audioUrl"
        @timeupdate="currentTimeMs = $event"
        @durationchange="onDurationChange"
        @zoomchange="timelineZoomPxPerSecond = $event"
      />

      <div v-if="showAutoAlign" class="auto-align">
        <p class="eyebrow">{{ t('generator.autoTitle') }}</p>

        <template v-if="autoAlignState === 'running'">
          <p class="auto-align__progress">
            <span class="auto-align__spinner" aria-hidden="true"></span>
            {{ autoAlignProgress || t('generator.autoStarting') }}
          </p>
        </template>

        <template v-else-if="autoAlignState === 'done'">
          <p class="auto-align__title">✓ {{ t('generator.autoApplied') }}</p>

          <label class="auto-align__lead">
            <span class="auto-align__hint">{{ t('generator.autoLead') }} : {{ leadMs }} ms</span>
            <input
              v-model.number="leadMs"
              class="auto-align__lead-range"
              type="range"
              min="0"
              max="400"
              step="10"
              :aria-label="t('generator.autoLead')"
            />
          </label>

          <div class="action-row">
            <button class="button" type="button" @click="runAutoAlignment">
              {{ t('generator.autoRedo') }}
            </button>
            <button class="button" type="button" @click="dismissAutoAlign">
              {{ t('generator.autoHide') }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="auto-align__title">{{ t('generator.autoQuestion') }}</p>
          <p class="auto-align__hint">{{ t('generator.autoHint') }}</p>
          <p v-if="autoAlignState === 'error'" class="auto-align__error" role="alert">
            {{ t('generator.autoError', { message: autoAlignError }) }}
          </p>

          <div class="auto-align__language" role="group" :aria-label="t('generator.autoLanguage')">
            <span class="auto-align__hint">{{ t('generator.autoLanguage') }}</span>
            <div class="auto-align__lang-options">
              <button
                v-for="option in localeOptions"
                :key="option.value"
                class="button auto-align__lang"
                :class="{ 'auto-align__lang--active': songLanguage === option.value }"
                type="button"
                :aria-pressed="songLanguage === option.value"
                @click="songLanguage = option.value"
              >
                <span v-if="songLanguage === option.value" class="auto-align__lang-check" aria-hidden="true">✓ </span>{{ option.flag }} {{ option.label }}
              </button>
            </div>
          </div>

          <label class="auto-align__lead">
            <span class="auto-align__hint">{{ t('generator.autoLead') }} : {{ leadMs }} ms</span>
            <input
              v-model.number="leadMs"
              class="auto-align__lead-range"
              type="range"
              min="0"
              max="400"
              step="10"
              :aria-label="t('generator.autoLead')"
            />
          </label>

          <div class="action-row">
            <button class="button button--primary" type="button" @click="runAutoAlignment">
              {{ autoAlignState === 'error' ? t('generator.autoRetry') : t('generator.autoYes') }}
            </button>
            <button class="button" type="button" @click="dismissAutoAlign">
              {{ t('generator.autoNo') }}
            </button>
          </div>
        </template>
      </div>

      <section class="timeline-editor" :aria-label="t('generator.timelineTitle')">
        <div class="timeline-editor__header">
          <div>
            <p class="eyebrow">{{ t('generator.timelineTitle') }}</p>
            <p class="timeline-editor__help">{{ t('generator.timelineHelp') }}</p>
          </div>
          <div class="timeline-editor__actions">
            <button class="button" type="button" :disabled="!hasTimeline" @click="addInterludeBlock">
              {{ t('generator.addInterlude') }}
            </button>
            <button class="button" type="button" :disabled="!canUndo" @click="undoLastChange">
              {{ t('generator.undo') }}
            </button>
            <button class="button" type="button" :disabled="!canRedo" @click="redoLastChange">
              {{ t('generator.redo') }}
            </button>
            <button
              class="button button--primary"
              type="button"
              :disabled="!canExport"
              @click="downloadKaraokeFile"
            >
              {{ exportLabel }}
            </button>
          </div>
        </div>

        <div class="timeline-editor__tools">
          <button class="button" type="button" :disabled="!hasTimeline" @click="zoomTimeline(-20)">
            {{ t('generator.zoomOut') }}
          </button>
          <label class="timeline-editor__zoom">
            {{ t('generator.timelineZoom') }}
            <input
              type="range"
              min="20"
              max="480"
              step="10"
              :value="timelineZoomPxPerSecond"
              :disabled="!hasTimeline"
              @input="onTimelineZoomInput"
            />
            <span>{{ timelineZoomLabel }}</span>
          </label>
          <button class="button" type="button" :disabled="!hasTimeline" @click="zoomTimeline(20)">
            {{ t('generator.zoomIn') }}
          </button>
          <button class="button" type="button" :disabled="!hasTimeline" @click="centerTimelineOnCurrentTime">
            {{ t('generator.centerPlayhead') }}
          </button>
        </div>

        <div class="timeline-offset">
          <div>
            <p class="timeline-offset__title">{{ t('generator.offsetTitle') }}</p>
            <p class="timeline-offset__help">{{ t('generator.offsetHelp') }}</p>
          </div>
          <button class="button" type="button" @click="adjustGlobalOffset(-100)">−100 ms</button>
          <label class="timeline-offset__input">
            {{ t('generator.offsetMs') }}
            <input
              type="number"
              step="10"
              :value="project.syncOffsetMs ?? 0"
              @change="onGlobalOffsetInput"
            />
          </label>
          <button class="button" type="button" @click="adjustGlobalOffset(100)">+100 ms</button>
          <button class="button" type="button" :disabled="(project.syncOffsetMs ?? 0) === 0" @click="setGlobalOffset(0, true)">
            {{ t('generator.offsetReset') }}
          </button>
          <span class="timeline-offset__value">
            {{ (project.syncOffsetMs ?? 0) < 0 ? '−' : '+' }}{{ syncOffsetLabel }}
          </span>
        </div>

        <p v-if="syncError" class="sync-panel__error" role="alert">{{ syncError }}</p>
        <p v-if="exportMessage" class="sync-panel__success" role="status">{{ exportMessage }}</p>

        <div
          v-if="hasTimeline"
          ref="timelineScrollRef"
          class="timeline-editor__scroll"
          @wheel="onTimelineWheel"
        >
          <div class="timeline-editor__track" :style="{ width: `${timelineWidthPx}px` }">
            <span
              class="timeline-playhead"
              :style="timelinePlayheadStyle"
              :aria-label="t('generator.playhead')"
            >
              <span class="timeline-playhead__label">{{ formatTimestamp(currentTimeMs) }}</span>
            </span>
            <div
              v-for="(line, lineIndex) in project.draftLines"
              :key="line.id"
              class="timeline-block"
              :class="{
                'timeline-block--active': selectedLineId === line.id,
                'timeline-block--interlude': isInterludeLine(line),
                'timeline-block--movable': canMoveLine(lineIndex),
              }"
              :style="getLineStyle(line)"
              role="button"
              tabindex="0"
              @click="selectLine(line)"
              @mousedown="startTimelineDrag($event, 'move-line', lineIndex)"
            >
              <span
                v-if="lineIndex > 0"
                class="timeline-block__handle timeline-block__handle--left"
                @mousedown.stop="startTimelineDrag($event, 'resize-line-start', lineIndex)"
              ></span>
              <span class="timeline-block__label">
                {{ isInterludeLine(line) ? t('generator.interludeBlock') : line.text }}
              </span>
              <span v-if="!isInterludeLine(line)" class="timeline-block__segments">
                <span
                  v-for="gap in getSegmentGaps(line)"
                  :key="gap.id"
                  class="timeline-gap"
                  :style="gap.style"
                  :title="t('generator.segmentGap', { duration: formatTimestamp(gap.durationMs) })"
                  aria-hidden="true"
                ></span>
                <span
                  v-for="(segment, segmentIndex) in line.segments"
                  :key="segment.id"
                  class="timeline-segment"
                  :class="{ 'timeline-segment--active': selectedSegmentId === segment.id }"
                  :style="getSegmentStyle(line, segment)"
                  @click.stop="selectLine(line, segmentIndex)"
                  @mousedown.stop="startTimelineDrag($event, 'move-segment', lineIndex, segmentIndex)"
                >
                  <span
                    class="timeline-segment__handle timeline-segment__handle--left"
                    @mousedown.stop="
                      startTimelineDrag($event, 'resize-segment-start', lineIndex, segmentIndex)
                    "
                  ></span>
                  <span class="timeline-segment__label">{{ segment.text }}</span>
                  <span
                    class="timeline-segment__handle timeline-segment__handle--right"
                    @mousedown.stop="
                      startTimelineDrag($event, 'resize-segment-end', lineIndex, segmentIndex)
                    "
                  ></span>
                </span>
              </span>
              <span
                v-if="lineIndex < project.draftLines.length - 1"
                class="timeline-block__handle timeline-block__handle--right"
                @mousedown.stop="startTimelineDrag($event, 'resize-line-end', lineIndex)"
              ></span>
            </div>
          </div>
        </div>

        <p v-else class="timeline-editor__empty">{{ t('generator.timelineEmpty') }}</p>

        <div v-if="selectedLine" class="timeline-inspector">
          <div>
            <p class="eyebrow">{{ t('generator.selectedBlock') }}</p>
            <p class="timeline-inspector__title">
              {{
                isInterludeLine(selectedLine)
                  ? t('generator.interludeBlock')
                  : selectedLine.text
              }}
            </p>
            <p v-if="hasTiming(selectedLine)" class="timeline-inspector__meta">
              {{ formatTimestamp(selectedLine.startMs) }} → {{ formatTimestamp(selectedLine.endMs) }}
            </p>
          </div>

          <div v-if="!isInterludeLine(selectedLine)" class="timeline-inspector__split">
            <label class="sr-only" for="timeline-split-text">
              {{ t('generator.timelineSplitText') }}
            </label>
            <textarea
              id="timeline-split-text"
              ref="splitTextInput"
              class="timeline-inspector__textarea"
              :value="selectedLine.text"
              readonly
              rows="2"
            ></textarea>
            <button class="button" type="button" @click="splitSegmentAtCursor">
              {{ t('generator.splitSegment') }}
            </button>
            <div class="timeline-inspector__segment-actions">
              <button
                class="button"
                type="button"
                :disabled="!canMergeWithPreviousSegment"
                @click="mergeSelectedSegmentWithPrevious"
              >
                {{ t('generator.mergePreviousSegment') }}
              </button>
              <button
                class="button"
                type="button"
                :disabled="!canMergeWithNextSegment"
                @click="mergeSelectedSegmentWithNext"
              >
                {{ t('generator.mergeNextSegment') }}
              </button>
              <button
                class="button"
                type="button"
                :disabled="!canMergeWithPreviousSegment && !canMergeWithNextSegment"
                @click="deleteSelectedSegmentSplit"
              >
                {{ t('generator.deleteSegmentSplit') }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <ShortcutEditor
        :actions="shortcutActions"
        :has-custom-shortcuts="hasCustomShortcuts"
        @capturechange="isCapturingShortcut = $event"
        @reset="resetShortcuts"
        @update="setShortcut"
      />
    </div>
  </section>
</template>
