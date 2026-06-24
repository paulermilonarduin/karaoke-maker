<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AudioWaveform from '../components/AudioWaveform.vue'
import FileDropField from '../components/FileDropField.vue'
import ShortcutEditor from '../components/ShortcutEditor.vue'
import {
  buildSyncedLines,
  createKaraokeFile,
  formatTimestamp,
  isInterludeLine,
  parsePlainLyrics,
  serializeKaraokeFile,
  type DraftLyricLine,
  type DraftLyricSegment,
  type KaraokeProject,
} from '../domain/lyrics'
import {
  useGeneratorShortcutSettings,
  useGeneratorShortcuts,
} from '../generator/shortcuts'
import { useI18n } from '../i18n'

type DragMode =
  | 'move-line'
  | 'resize-line-start'
  | 'resize-line-end'
  | 'move-segment'
  | 'resize-segment-start'
  | 'resize-segment-end'

type TimelineDrag = {
  lineIndex: number
  mode: DragMode
  lastClientX: number
  segmentIndex?: number
  snapshotCaptured?: boolean
}

type TimelineSnapshot = {
  draftLines: DraftLyricLine[]
  manualInterludeCount: number
  selectedLineId?: string
  selectedSegmentId?: string
}

type SegmentGap = {
  id: string
  durationMs: number
  style: {
    left: string
    width: string
  }
}

defineProps<{
  accentColor: string
}>()

const minimumLineDurationMs = 250
const minimumSegmentDurationMs = 40
const defaultInterludeDurationMs = 2000
const defaultTimelineZoomPxPerSecond = 80
const maxUndoStackSize = 50

const project = ref<KaraokeProject>({
  title: '',
  artist: '',
  draftLines: [],
})
const manualInterludeCount = ref(0)
const audioUrl = ref<string>()
const currentTimeMs = ref(0)
const audioDurationMs = ref<number>()
const timelineZoomPxPerSecond = ref(defaultTimelineZoomPxPerSecond)
const selectedLineId = ref<string>()
const selectedSegmentId = ref<string>()
const splitTextInput = ref<HTMLTextAreaElement>()
const syncError = ref<string>()
const waveformRef = ref<InstanceType<typeof AudioWaveform>>()
const timelineScrollRef = ref<HTMLElement>()
const isCapturingShortcut = ref(false)
const timelineDrag = ref<TimelineDrag>()
const undoStack = ref<TimelineSnapshot[]>([])
const redoStack = ref<TimelineSnapshot[]>([])
const {
  actions: shortcutActions,
  hasCustomShortcuts,
  resetShortcuts,
  setShortcut,
} = useGeneratorShortcutSettings()
const { t } = useI18n()

const syncedLines = computed(() =>
  buildSyncedLines(project.value.draftLines, audioDurationMs.value),
)
const timelineWidthPx = computed(() => {
  const durationMs = audioDurationMs.value ?? 0

  return Math.max(900, Math.ceil((durationMs / 1000) * timelineZoomPxPerSecond.value))
})
const hasTimeline = computed(
  () =>
    audioDurationMs.value !== undefined &&
    project.value.draftLines.length > 0 &&
    project.value.draftLines.every((line) => hasTiming(line)),
)
const canExport = computed(
  () =>
    hasTimeline.value &&
    syncedLines.value.length === project.value.draftLines.length &&
    syncedLines.value.every((line) => line.endMs !== undefined),
)
const selectedLineIndex = computed(() =>
  project.value.draftLines.findIndex((line) => line.id === selectedLineId.value),
)
const selectedLine = computed(() => project.value.draftLines[selectedLineIndex.value])
const selectedSegmentIndex = computed(() => {
  const line = selectedLine.value

  if (!line || isInterludeLine(line)) {
    return -1
  }

  return line.segments.findIndex((segment) => segment.id === selectedSegmentId.value)
})
const selectedSegment = computed(() =>
  selectedSegmentIndex.value === -1
    ? undefined
    : selectedLine.value?.segments[selectedSegmentIndex.value],
)
const timelineSummary = computed(() =>
  t('generator.timelineSummary', {
    count: project.value.draftLines.length,
    duration: audioDurationMs.value ? formatTimestamp(audioDurationMs.value) : '00:00.000',
  }),
)
const timelineZoomLabel = computed(() => `${timelineZoomPxPerSecond.value} px/s`)
const timelinePlayheadStyle = computed(() => {
  const durationMs = audioDurationMs.value ?? 1

  return {
    left: `${(currentTimeMs.value / durationMs) * 100}%`,
  }
})
const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)
const canMergeWithPreviousSegment = computed(() => {
  const line = selectedLine.value

  return !!line && !isInterludeLine(line) && selectedSegmentIndex.value > 0
})
const canMergeWithNextSegment = computed(() => {
  const line = selectedLine.value

  return (
    !!line &&
    !isInterludeLine(line) &&
    selectedSegmentIndex.value !== -1 &&
    selectedSegmentIndex.value < line.segments.length - 1
  )
})

function hasTiming(line: DraftLyricLine): line is DraftLyricLine & {
  startMs: number
  endMs: number
} {
  return line.startMs !== undefined && line.endMs !== undefined && line.endMs > line.startMs
}

function hasSegmentTiming(segment: DraftLyricSegment): segment is DraftLyricSegment & {
  startMs: number
  endMs: number
} {
  return segment.startMs !== undefined && segment.endMs !== undefined && segment.endMs > segment.startMs
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function cloneDraftLines(lines: DraftLyricLine[]): DraftLyricLine[] {
  return lines.map((line) => ({
    ...line,
    segments: line.segments.map((segment) => ({ ...segment })),
  }))
}

function pushUndoSnapshot() {
  undoStack.value = [
    ...undoStack.value.slice(-(maxUndoStackSize - 1)),
    {
      draftLines: cloneDraftLines(project.value.draftLines),
      manualInterludeCount: manualInterludeCount.value,
      selectedLineId: selectedLineId.value,
      selectedSegmentId: selectedSegmentId.value,
    },
  ]
  redoStack.value = []
}

function clearUndoStack() {
  undoStack.value = []
  redoStack.value = []
}

function createTimelineSnapshot(): TimelineSnapshot {
  return {
    draftLines: cloneDraftLines(project.value.draftLines),
    manualInterludeCount: manualInterludeCount.value,
    selectedLineId: selectedLineId.value,
    selectedSegmentId: selectedSegmentId.value,
  }
}

function restoreTimelineSnapshot(snapshot: TimelineSnapshot) {
  project.value.draftLines = cloneDraftLines(snapshot.draftLines)
  manualInterludeCount.value = snapshot.manualInterludeCount
  selectedLineId.value = snapshot.selectedLineId
  selectedSegmentId.value = snapshot.selectedSegmentId
  syncError.value = undefined
}

function undoLastChange() {
  const snapshot = undoStack.value.at(-1)

  if (!snapshot) {
    return
  }

  undoStack.value = undoStack.value.slice(0, -1)
  redoStack.value = [
    ...redoStack.value.slice(-(maxUndoStackSize - 1)),
    createTimelineSnapshot(),
  ]
  restoreTimelineSnapshot(snapshot)
}

function redoLastChange() {
  const snapshot = redoStack.value.at(-1)

  if (!snapshot) {
    return
  }

  redoStack.value = redoStack.value.slice(0, -1)
  undoStack.value = [
    ...undoStack.value.slice(-(maxUndoStackSize - 1)),
    createTimelineSnapshot(),
  ]
  restoreTimelineSnapshot(snapshot)
}

function createSegmentId(line: DraftLyricLine): string {
  return `${line.id}:segment:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
}

function getLineDuration(line: DraftLyricLine): number {
  return hasTiming(line) ? line.endMs - line.startMs : 0
}

function getLineMinimumDuration(): number {
  const durationMs = audioDurationMs.value
  const lineCount = project.value.draftLines.length

  if (!durationMs || lineCount === 0) {
    return minimumLineDurationMs
  }

  return Math.max(1, Math.min(minimumLineDurationMs, Math.floor(durationMs / lineCount)))
}

function getSegmentMinimumDuration(line: DraftLyricLine): number {
  const lineDuration = getLineDuration(line)

  if (lineDuration <= 0 || line.segments.length === 0) {
    return 1
  }

  return Math.max(
    1,
    Math.min(minimumSegmentDurationMs, Math.floor(lineDuration / line.segments.length)),
  )
}

function getLineStyle(line: DraftLyricLine) {
  const durationMs = audioDurationMs.value ?? 1
  const startMs = line.startMs ?? 0
  const widthMs = getLineDuration(line)

  return {
    left: `${(startMs / durationMs) * 100}%`,
    width: `${(widthMs / durationMs) * 100}%`,
  }
}

function canMoveLine(lineIndex: number): boolean {
  return lineIndex > 0 && lineIndex < project.value.draftLines.length - 1
}

function canApplyTimelineDrag(drag: TimelineDrag): boolean {
  const line = project.value.draftLines[drag.lineIndex]

  if (!line) {
    return false
  }

  if (drag.mode === 'move-line') {
    return canMoveLine(drag.lineIndex)
  }

  if (drag.mode === 'resize-line-start') {
    return drag.lineIndex > 0
  }

  if (drag.mode === 'resize-line-end') {
    return drag.lineIndex < project.value.draftLines.length - 1
  }

  return drag.segmentIndex !== undefined && !isInterludeLine(line)
}

function getSegmentStyle(line: DraftLyricLine, segment: DraftLyricSegment) {
  if (!hasTiming(line) || !hasSegmentTiming(segment)) {
    return { left: '0%', width: '0%' }
  }

  const lineDuration = line.endMs - line.startMs

  return {
    left: `${((segment.startMs - line.startMs) / lineDuration) * 100}%`,
    width: `${((segment.endMs - segment.startMs) / lineDuration) * 100}%`,
  }
}

function getSegmentGaps(line: DraftLyricLine): SegmentGap[] {
  if (isInterludeLine(line) || !hasTiming(line)) {
    return []
  }

  const lineDuration = line.endMs - line.startMs

  return line.segments.flatMap((segment, index) => {
    const nextSegment = line.segments[index + 1]

    if (!hasSegmentTiming(segment) || !hasSegmentTiming(nextSegment)) {
      return []
    }

    const gapStartMs = segment.endMs
    const gapEndMs = nextSegment.startMs

    if (gapEndMs <= gapStartMs) {
      return []
    }

    return [
      {
        id: `${segment.id}:gap:${nextSegment.id}`,
        durationMs: gapEndMs - gapStartMs,
        style: {
          left: `${((gapStartMs - line.startMs) / lineDuration) * 100}%`,
          width: `${((gapEndMs - gapStartMs) / lineDuration) * 100}%`,
        },
      },
    ]
  })
}

function setTimelineZoom(value: number) {
  const nextZoom = clamp(Math.round(value), 20, 480)

  timelineZoomPxPerSecond.value = nextZoom
  waveformRef.value?.setZoom(nextZoom)
}

function zoomTimeline(delta: number) {
  setTimelineZoom(timelineZoomPxPerSecond.value + delta)
  requestAnimationFrame(() => centerTimelineOnCurrentTime())
}

function centerTimelineOnCurrentTime() {
  const scrollElement = timelineScrollRef.value
  const durationMs = audioDurationMs.value

  if (!scrollElement || !durationMs) {
    return
  }

  const playheadLeftPx = (currentTimeMs.value / durationMs) * timelineWidthPx.value

  scrollElement.scrollLeft = Math.max(0, playheadLeftPx - scrollElement.clientWidth / 2)
}

function onTimelineZoomInput(event: Event) {
  setTimelineZoom(Number((event.target as HTMLInputElement).value))
}

function onTimelineWheel(event: WheelEvent) {
  const scrollElement = timelineScrollRef.value

  if (!scrollElement || !hasTimeline.value) {
    return
  }

  if (event.ctrlKey) {
    event.preventDefault()
    zoomTimeline(event.deltaY > 0 ? -20 : 20)
    return
  }

  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    event.preventDefault()
    scrollElement.scrollLeft += event.deltaY
  }
}

function distributeSegments(line: DraftLyricLine) {
  if (isInterludeLine(line) || !hasTiming(line)) {
    return
  }

  if (
    line.segments.length === 0 ||
    line.segments.map((segment) => segment.text).join('') !== line.text
  ) {
    line.segments = [{ id: createSegmentId(line), text: line.text }]
  }

  const totalCharacters = Math.max(
    1,
    line.segments.reduce((total, segment) => total + segment.text.length, 0),
  )
  let cursorMs = line.startMs

  line.segments.forEach((segment, index) => {
    const isLast = index === line.segments.length - 1
    const segmentDuration = isLast
      ? line.endMs - cursorMs
      : Math.round(((line.endMs - line.startMs) * segment.text.length) / totalCharacters)

    segment.startMs = cursorMs
    segment.endMs = isLast ? line.endMs : cursorMs + segmentDuration
    cursorMs = segment.endMs
  })
}

function constrainSegments(line: DraftLyricLine) {
  if (isInterludeLine(line) || !hasTiming(line)) {
    return
  }

  if (line.segments.length === 0) {
    line.segments = [{ id: createSegmentId(line), text: line.text }]
    distributeSegments(line)
    return
  }

  line.segments.forEach((segment, index) => {
    const previousSegment = line.segments[index - 1]
    const nextSegment = line.segments[index + 1]
    const segmentMinimumDurationMs = getSegmentMinimumDuration(line)
    const minimumStart = previousSegment?.endMs ?? line.startMs
    const maximumEnd = nextSegment?.startMs ?? line.endMs
    const startMs = segment.startMs ?? minimumStart
    const endMs = segment.endMs ?? maximumEnd
    const maximumStart = Math.max(minimumStart, maximumEnd - segmentMinimumDurationMs)

    segment.startMs = clamp(startMs, minimumStart, maximumStart)
    segment.endMs = clamp(endMs, segment.startMs + segmentMinimumDurationMs, maximumEnd)
  })
}

function initializeTimelineIfPossible(force = false) {
  const durationMs = audioDurationMs.value
  const lines = project.value.draftLines

  if (!durationMs || lines.length === 0) {
    return
  }

  if (!force && lines.some((line) => line.startMs !== undefined || line.endMs !== undefined)) {
    return
  }

  lines.forEach((line, index) => {
    line.startMs = Math.round((durationMs * index) / lines.length)
    line.endMs = Math.round((durationMs * (index + 1)) / lines.length)

    if (!isInterludeLine(line)) {
      line.segments = [{ id: createSegmentId(line), text: line.text }]
      distributeSegments(line)
    }
  })

  selectedLineId.value = lines[0]?.id
  selectedSegmentId.value = lines[0]?.segments[0]?.id
}

function getPointerDeltaMs(clientX: number): number {
  const durationMs = audioDurationMs.value ?? 0
  const drag = timelineDrag.value

  if (!drag || durationMs <= 0) {
    return 0
  }

  const deltaPx = clientX - drag.lastClientX

  return Math.round((deltaPx / timelineWidthPx.value) * durationMs)
}

function setBoundaryAfter(lineIndex: number, boundaryMs: number) {
  const line = project.value.draftLines[lineIndex]
  const nextLine = project.value.draftLines[lineIndex + 1]

  if (!line || !nextLine || !hasTiming(line) || !hasTiming(nextLine)) {
    return
  }

  const lineMinimumDurationMs = getLineMinimumDuration()
  const minimumBoundary = line.startMs + lineMinimumDurationMs
  const maximumBoundary = nextLine.endMs - lineMinimumDurationMs

  if (maximumBoundary < minimumBoundary) {
    return
  }

  const nextBoundary = clamp(boundaryMs, minimumBoundary, maximumBoundary)

  line.endMs = nextBoundary
  constrainSegments(line)
  nextLine.startMs = nextBoundary
  constrainSegments(nextLine)
}

function shiftLineSegments(line: DraftLyricLine, deltaMs: number) {
  if (isInterludeLine(line)) {
    return
  }

  line.segments.forEach((segment) => {
    if (segment.startMs !== undefined) segment.startMs += deltaMs
    if (segment.endMs !== undefined) segment.endMs += deltaMs
  })
}

function moveLine(lineIndex: number, deltaMs: number) {
  const previousLine = project.value.draftLines[lineIndex - 1]
  const line = project.value.draftLines[lineIndex]
  const nextLine = project.value.draftLines[lineIndex + 1]

  if (!previousLine || !nextLine || !hasTiming(previousLine) || !hasTiming(line) || !hasTiming(nextLine)) {
    return
  }

  const duration = line.endMs - line.startMs
  const lineMinimumDurationMs = getLineMinimumDuration()
  const minimumStart = previousLine.startMs + lineMinimumDurationMs
  const maximumStart = nextLine.endMs - lineMinimumDurationMs - duration

  if (maximumStart < minimumStart) {
    return
  }

  const nextStart = clamp(line.startMs + deltaMs, minimumStart, maximumStart)
  const appliedDelta = nextStart - line.startMs

  if (appliedDelta === 0) {
    return
  }

  previousLine.endMs = nextStart
  line.startMs = nextStart
  line.endMs = nextStart + duration
  nextLine.startMs = line.endMs
  shiftLineSegments(line, appliedDelta)
  constrainSegments(previousLine)
  constrainSegments(line)
  constrainSegments(nextLine)
}

function moveSegment(line: DraftLyricLine, segmentIndex: number, deltaMs: number) {
  const segment = line.segments[segmentIndex]

  if (!hasTiming(line) || !hasSegmentTiming(segment)) {
    return
  }

  const previousSegment = line.segments[segmentIndex - 1]
  const nextSegment = line.segments[segmentIndex + 1]
  const duration = segment.endMs - segment.startMs
  const minimumStart = previousSegment?.endMs ?? line.startMs
  const maximumStart = (nextSegment?.startMs ?? line.endMs) - duration
  const nextStart = clamp(segment.startMs + deltaMs, minimumStart, maximumStart)

  segment.startMs = nextStart
  segment.endMs = nextStart + duration
}

function resizeSegmentStart(line: DraftLyricLine, segmentIndex: number, deltaMs: number) {
  const segment = line.segments[segmentIndex]

  if (!hasTiming(line) || !hasSegmentTiming(segment)) {
    return
  }

  const previousSegment = line.segments[segmentIndex - 1]
  const minimumStart = previousSegment?.endMs ?? line.startMs

  segment.startMs = clamp(
    segment.startMs + deltaMs,
    minimumStart,
    segment.endMs - minimumSegmentDurationMs,
  )
}

function resizeSegmentEnd(line: DraftLyricLine, segmentIndex: number, deltaMs: number) {
  const segment = line.segments[segmentIndex]

  if (!hasTiming(line) || !hasSegmentTiming(segment)) {
    return
  }

  const nextSegment = line.segments[segmentIndex + 1]
  const maximumEnd = nextSegment?.startMs ?? line.endMs

  segment.endMs = clamp(
    segment.endMs + deltaMs,
    segment.startMs + minimumSegmentDurationMs,
    maximumEnd,
  )
}

function applyDrag(deltaMs: number) {
  const drag = timelineDrag.value

  if (!drag || deltaMs === 0) {
    return
  }

  const line = project.value.draftLines[drag.lineIndex]

  if (!line || !canApplyTimelineDrag(drag)) {
    return
  }

  if (!drag.snapshotCaptured) {
    pushUndoSnapshot()
    drag.snapshotCaptured = true
  }

  if (drag.mode === 'resize-line-start') {
    if (drag.lineIndex > 0) setBoundaryAfter(drag.lineIndex - 1, (line.startMs ?? 0) + deltaMs)
  } else if (drag.mode === 'resize-line-end') {
    setBoundaryAfter(drag.lineIndex, (line.endMs ?? 0) + deltaMs)
  } else if (drag.mode === 'move-line') {
    moveLine(drag.lineIndex, deltaMs)
  } else if (drag.segmentIndex !== undefined && !isInterludeLine(line)) {
    if (drag.mode === 'move-segment') moveSegment(line, drag.segmentIndex, deltaMs)
    if (drag.mode === 'resize-segment-start') resizeSegmentStart(line, drag.segmentIndex, deltaMs)
    if (drag.mode === 'resize-segment-end') resizeSegmentEnd(line, drag.segmentIndex, deltaMs)
  }
}

function onTimelineMouseMove(event: MouseEvent) {
  const drag = timelineDrag.value

  if (!drag) {
    return
  }

  const deltaMs = getPointerDeltaMs(event.clientX)

  if (deltaMs !== 0) {
    applyDrag(deltaMs)
    drag.lastClientX = event.clientX
  }
}

function stopTimelineDrag() {
  timelineDrag.value = undefined
  window.removeEventListener('mousemove', onTimelineMouseMove)
  window.removeEventListener('mouseup', stopTimelineDrag)
}

function startTimelineDrag(
  event: MouseEvent,
  mode: DragMode,
  lineIndex: number,
  segmentIndex?: number,
) {
  event.preventDefault()
  selectLine(project.value.draftLines[lineIndex], segmentIndex)

  if (!canApplyTimelineDrag({ lineIndex, mode, segmentIndex, lastClientX: event.clientX })) {
    return
  }

  timelineDrag.value = { lineIndex, mode, segmentIndex, lastClientX: event.clientX }
  window.addEventListener('mousemove', onTimelineMouseMove)
  window.addEventListener('mouseup', stopTimelineDrag)
}

function selectLine(line?: DraftLyricLine, segmentIndex = 0) {
  if (!line) {
    return
  }

  selectedLineId.value = line.id
  selectedSegmentId.value = isInterludeLine(line) ? undefined : line.segments[segmentIndex]?.id
}

function getCaretPosition(): number | undefined {
  const input = splitTextInput.value

  if (!input || input.selectionStart === null) {
    return undefined
  }

  return input.selectionStart
}

function splitSegmentAtCursor() {
  const line = selectedLine.value
  const caretPosition = getCaretPosition()

  if (!line || isInterludeLine(line) || caretPosition === undefined) {
    syncError.value = t('generator.timelineNoLineSelected')
    return
  }

  let textCursor = 0
  const segmentIndex = line.segments.findIndex((segment) => {
    const start = textCursor
    const end = start + segment.text.length
    textCursor = end

    return caretPosition > start && caretPosition < end
  })

  if (segmentIndex === -1) {
    syncError.value = t('generator.timelineSplitBoundary')
    return
  }

  const segment = line.segments[segmentIndex]

  if (!hasSegmentTiming(segment)) {
    distributeSegments(line)
  }

  if (!hasSegmentTiming(segment)) {
    return
  }

  const previousCharacters = line.segments
    .slice(0, segmentIndex)
    .reduce((total, currentSegment) => total + currentSegment.text.length, 0)
  const localOffset = caretPosition - previousCharacters
  const ratio = localOffset / segment.text.length
  const splitMs = Math.round(segment.startMs + (segment.endMs - segment.startMs) * ratio)

  if (
    splitMs - segment.startMs < minimumSegmentDurationMs ||
    segment.endMs - splitMs < minimumSegmentDurationMs
  ) {
    syncError.value = t('generator.timelineSplitTooShort')
    return
  }

  const leftSegment = {
    id: createSegmentId(line),
    text: segment.text.slice(0, localOffset),
    startMs: segment.startMs,
    endMs: splitMs,
  }
  const rightSegment = {
    id: createSegmentId(line),
    text: segment.text.slice(localOffset),
    startMs: splitMs,
    endMs: segment.endMs,
  }

  pushUndoSnapshot()
  line.segments.splice(segmentIndex, 1, leftSegment, rightSegment)
  selectedSegmentId.value = rightSegment.id
  syncError.value = undefined
}

function mergeSegments(line: DraftLyricLine, leftIndex: number) {
  const leftSegment = line.segments[leftIndex]
  const rightSegment = line.segments[leftIndex + 1]

  if (!leftSegment || !rightSegment) {
    return
  }

  pushUndoSnapshot()
  const mergedSegment = {
    id: createSegmentId(line),
    text: `${leftSegment.text}${rightSegment.text}`,
    startMs: leftSegment.startMs,
    endMs: rightSegment.endMs,
  }

  line.segments.splice(leftIndex, 2, mergedSegment)
  selectedSegmentId.value = mergedSegment.id
  syncError.value = undefined
}

function mergeSelectedSegmentWithPrevious() {
  const line = selectedLine.value

  if (!line || isInterludeLine(line) || selectedSegmentIndex.value <= 0) {
    return
  }

  mergeSegments(line, selectedSegmentIndex.value - 1)
}

function mergeSelectedSegmentWithNext() {
  const line = selectedLine.value

  if (
    !line ||
    isInterludeLine(line) ||
    selectedSegmentIndex.value === -1 ||
    selectedSegmentIndex.value >= line.segments.length - 1
  ) {
    return
  }

  mergeSegments(line, selectedSegmentIndex.value)
}

function deleteSelectedSegmentSplit() {
  if (canMergeWithPreviousSegment.value) {
    mergeSelectedSegmentWithPrevious()
    return
  }

  if (canMergeWithNextSegment.value) {
    mergeSelectedSegmentWithNext()
  }
}

function findLineIndexAtTime(timeMs: number): number {
  const index = project.value.draftLines.findIndex(
    (line) => hasTiming(line) && timeMs >= line.startMs && timeMs < line.endMs,
  )

  return index === -1 ? Math.max(0, project.value.draftLines.length - 1) : index
}

function compressTimelineToDuration() {
  const durationMs = audioDurationMs.value
  const lines = project.value.draftLines

  if (!durationMs || lines.length === 0) {
    return
  }

  const lineMinimumDurationMs = getLineMinimumDuration()
  const totalDuration = lines.reduce(
    (total, line) => total + Math.max(lineMinimumDurationMs, getLineDuration(line)),
    0,
  )
  let cursorMs = 0

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1
    const sourceDuration = Math.max(lineMinimumDurationMs, getLineDuration(line))
    const nextDuration = isLast
      ? durationMs - cursorMs
      : Math.max(lineMinimumDurationMs, Math.round((sourceDuration / totalDuration) * durationMs))
    const previousStart = line.startMs ?? cursorMs
    const nextStart = cursorMs
    const nextEnd = isLast ? durationMs : Math.min(durationMs, cursorMs + nextDuration)
    const shift = nextStart - previousStart

    line.startMs = nextStart
    line.endMs = nextEnd
    shiftLineSegments(line, shift)
    constrainSegments(line)
    cursorMs = nextEnd
  })
}

function addInterludeBlock() {
  if (!audioDurationMs.value || project.value.draftLines.length === 0) {
    syncError.value = t('generator.error.missingAudio')
    return
  }

  const baseIndex =
    selectedLineIndex.value === -1 ? findLineIndexAtTime(currentTimeMs.value) : selectedLineIndex.value
  const baseLine = project.value.draftLines[baseIndex]

  if (!hasTiming(baseLine)) {
    return
  }

  pushUndoSnapshot()
  manualInterludeCount.value += 1
  const interlude = {
    id: `interlude:manual:${Date.now()}:${manualInterludeCount.value}`,
    kind: 'interlude' as const,
    text: '',
    startMs: baseLine.endMs,
    endMs: baseLine.endMs + defaultInterludeDurationMs,
    segments: [],
  }

  project.value.draftLines.splice(baseIndex + 1, 0, interlude)

  for (let index = baseIndex + 2; index < project.value.draftLines.length; index += 1) {
    const line = project.value.draftLines[index]

    if (hasTiming(line)) {
      line.startMs += defaultInterludeDurationMs
      line.endMs += defaultInterludeDurationMs
      shiftLineSegments(line, defaultInterludeDurationMs)
    }
  }

  compressTimelineToDuration()
  selectLine(interlude)
  syncError.value = undefined
}

function nudgeSelectedLine(deltaMs: number) {
  const index = selectedLineIndex.value

  if (index <= 0 || index >= project.value.draftLines.length - 1) {
    return
  }

  pushUndoSnapshot()
  moveLine(index, deltaMs)
}

function onAudioFile(file: File) {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }

  audioUrl.value = URL.createObjectURL(file)
  currentTimeMs.value = 0
  audioDurationMs.value = undefined
  syncError.value = undefined
  clearUndoStack()
  project.value.audioFileName = file.name
  project.value.title = file.name.replace(/\.[^.]+$/, '')
}

async function onLyricsFile(file: File) {
  const content = await file.text()

  project.value.lyricsFileName = file.name
  project.value.draftLines = parsePlainLyrics(content)
  selectedLineId.value = project.value.draftLines[0]?.id
  selectedSegmentId.value = project.value.draftLines[0]?.segments[0]?.id
  clearUndoStack()
  initializeTimelineIfPossible(true)
  syncError.value = undefined
}

function onDurationChange(durationMs: number) {
  audioDurationMs.value = durationMs
  initializeTimelineIfPossible()
}

function downloadKaraokeFile() {
  if (audioDurationMs.value === undefined) {
    return
  }

  try {
    const karaokeFile = createKaraokeFile(
      project.value,
      syncedLines.value,
      audioDurationMs.value,
    )
    const content = serializeKaraokeFile(karaokeFile)
    const fileName = `${project.value.title || 'karaoke'}.karaoke.json`
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    syncError.value = undefined
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : t('generator.error.export')
  }
}

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

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
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
      </div>

      <AudioWaveform
        ref="waveformRef"
        :accent-color="accentColor"
        :audio-url="audioUrl"
        @timeupdate="currentTimeMs = $event"
        @durationchange="onDurationChange"
        @zoomchange="timelineZoomPxPerSecond = $event"
      />

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
              {{ t('generator.exportJson') }}
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

        <p v-if="syncError" class="sync-panel__error" role="alert">{{ syncError }}</p>

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
