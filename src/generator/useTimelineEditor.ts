import { computed, ref, type Ref } from 'vue'
import {
  formatTimestamp,
  isInterludeLine,
  type DraftLyricLine,
  type DraftLyricSegment,
  type KaraokeProject,
} from '../domain/lyrics'
import { validateDraftTimeline } from './timelineValidation'

export type DragMode =
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

type SegmentGap = {
  id: string
  durationMs: number
  style: {
    left: string
    width: string
  }
}

type TimelineTranslationKey =
  | 'generator.timelineNoLineSelected'
  | 'generator.timelineSplitBoundary'
  | 'generator.timelineSplitTooShort'
  | 'generator.error.missingAudio'

type TimelineTranslate = (key: TimelineTranslationKey) => string

type UseTimelineEditorOptions = {
  project: Ref<KaraokeProject>
  audioDurationMs: Ref<number | undefined>
  currentTimeMs: Ref<number>
  manualInterludeCount: Ref<number>
  selectedLineId: Ref<string | undefined>
  selectedSegmentId: Ref<string | undefined>
  splitTextInput: Ref<HTMLTextAreaElement | undefined>
  syncError: Ref<string | undefined>
  timelineScrollRef: Ref<HTMLElement | undefined>
  pushUndoSnapshot: () => void
  t: TimelineTranslate
}

const minimumLineDurationMs = 250
const minimumSegmentDurationMs = 40
const defaultInterludeDurationMs = 2000
const defaultTimelineZoomPxPerSecond = 80

export function hasTiming(line: DraftLyricLine | undefined): line is DraftLyricLine & {
  startMs: number
  endMs: number
} {
  return !!line && line.startMs !== undefined && line.endMs !== undefined && line.endMs > line.startMs
}

function hasSegmentTiming(segment: DraftLyricSegment | undefined): segment is DraftLyricSegment & {
  startMs: number
  endMs: number
} {
  return !!segment && segment.startMs !== undefined && segment.endMs !== undefined && segment.endMs > segment.startMs
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function useTimelineEditor({
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
  t,
}: UseTimelineEditorOptions) {
  const timelineZoomPxPerSecond = ref(defaultTimelineZoomPxPerSecond)
  const timelineDrag = ref<TimelineDrag>()

  // Temporary: keep the validator available, but do not block editing/export
  // while the generator timeline UX is still being adjusted.
  const timelineValidationIssues = computed<ReturnType<typeof validateDraftTimeline>>(() => {
    void validateDraftTimeline(project.value.draftLines, audioDurationMs.value)

    return []
  })
  const timelineDurationMs = computed(() =>
    Math.max(
      audioDurationMs.value ?? 0,
      ...project.value.draftLines.map((line) => line.endMs ?? 0),
    ),
  )
  const timelineWidthPx = computed(() => {
    const durationMs = timelineDurationMs.value

    return Math.max(900, Math.ceil((durationMs / 1000) * timelineZoomPxPerSecond.value))
  })
  const hasTimeline = computed(
    () =>
      audioDurationMs.value !== undefined &&
      project.value.draftLines.length > 0 &&
      project.value.draftLines.every((line) => hasTiming(line)),
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
  const syncOffsetLabel = computed(() => formatTimestamp(Math.abs(project.value.syncOffsetMs ?? 0)))
  const timelinePlayheadStyle = computed(() => {
    const durationMs = timelineDurationMs.value || 1

    return {
      left: `${(currentTimeMs.value / durationMs) * 100}%`,
    }
  })
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
    const durationMs = timelineDurationMs.value || 1
    const startMs = line.startMs ?? 0
    const widthMs = getLineDuration(line)

    return {
      left: `${(startMs / durationMs) * 100}%`,
      width: `${(widthMs / durationMs) * 100}%`,
    }
  }

  function canMoveLine(lineIndex: number): boolean {
    const line = project.value.draftLines[lineIndex]

    return !!line && hasTiming(line) && project.value.draftLines.length > 1
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

  function centerTimelineOnCurrentTime() {
    const scrollElement = timelineScrollRef.value
    const durationMs = timelineDurationMs.value

    if (!scrollElement || !durationMs) {
      return
    }

    const playheadLeftPx = (currentTimeMs.value / durationMs) * timelineWidthPx.value

    scrollElement.scrollLeft = Math.max(0, playheadLeftPx - scrollElement.clientWidth / 2)
  }

  function onTimelineWheel(event: WheelEvent) {
    const scrollElement = timelineScrollRef.value

    if (!scrollElement || !hasTimeline.value) {
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
    const durationMs = timelineDurationMs.value
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

    if (!hasTiming(line) || !hasTiming(nextLine)) {
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

  function shiftLineTiming(line: DraftLyricLine, deltaMs: number) {
    if (!hasTiming(line) || deltaMs === 0) {
      return
    }

    line.startMs += deltaMs
    line.endMs += deltaMs
    shiftLineSegments(line, deltaMs)
  }

  function resizeLineStartAndShiftPrevious(lineIndex: number, deltaMs: number) {
    const lines = project.value.draftLines
    const firstLine = lines[0]
    const line = lines[lineIndex]
    const previousLine = lines[lineIndex - 1]

    if (!hasTiming(firstLine) || !hasTiming(previousLine) || !hasTiming(line)) {
      return
    }

    const lineMinimumDurationMs = getLineMinimumDuration()
    const minimumStart = line.startMs - firstLine.startMs
    const maximumStart = line.endMs - lineMinimumDurationMs

    if (maximumStart < minimumStart) {
      return
    }

    const nextStart = clamp(line.startMs + deltaMs, minimumStart, maximumStart)
    const appliedDelta = nextStart - line.startMs

    if (appliedDelta === 0) {
      return
    }

    for (let index = 0; index < lineIndex; index += 1) {
      shiftLineTiming(lines[index], appliedDelta)
    }

    line.startMs = nextStart
    constrainSegments(line)
  }

  function resizeLineEndAndShiftFollowing(lineIndex: number, deltaMs: number) {
    const lines = project.value.draftLines
    const line = lines[lineIndex]
    const nextLine = lines[lineIndex + 1]

    if (!hasTiming(line) || !hasTiming(nextLine)) {
      return
    }

    const lineMinimumDurationMs = getLineMinimumDuration()
    const minimumEnd = line.startMs + lineMinimumDurationMs
    const nextEnd = Math.max(minimumEnd, line.endMs + deltaMs)
    const appliedDelta = nextEnd - line.endMs

    if (appliedDelta === 0) {
      return
    }

    line.endMs = nextEnd
    constrainSegments(line)

    for (let index = lineIndex + 1; index < lines.length; index += 1) {
      shiftLineTiming(lines[index], appliedDelta)
    }
  }

  function createInterlude(startMs: number, endMs: number): DraftLyricLine {
    manualInterludeCount.value += 1

    return {
      id: `interlude:manual:${Date.now()}:${manualInterludeCount.value}`,
      kind: 'interlude',
      text: '',
      startMs,
      endMs,
      segments: [],
    }
  }

  function moveLineRight(lineIndex: number, deltaMs: number) {
    if (lineIndex <= 0) {
      return
    }

    const lines = project.value.draftLines
    const previousLine = lines[lineIndex - 1]
    const line = lines[lineIndex]

    if (!hasTiming(previousLine) || !hasTiming(line)) {
      return
    }

    previousLine.endMs += deltaMs
    constrainSegments(previousLine)

    for (let index = lineIndex; index < lines.length; index += 1) {
      shiftLineTiming(lines[index], deltaMs)
    }
  }

  function moveLineLeft(lineIndex: number, deltaMs: number) {
    const lines = project.value.draftLines

    if (lineIndex >= lines.length - 1) {
      return
    }

    const firstLine = lines[0]
    const line = lines[lineIndex]
    const nextLine = lines[lineIndex + 1]

    if (!hasTiming(firstLine) || !hasTiming(line) || !hasTiming(nextLine)) {
      return
    }

    const appliedDelta = -Math.min(Math.abs(deltaMs), firstLine.startMs)

    if (appliedDelta === 0) {
      return
    }

    for (let index = 0; index <= lineIndex; index += 1) {
      shiftLineTiming(lines[index], appliedDelta)
    }

    nextLine.startMs += appliedDelta
    constrainSegments(nextLine)
  }

  function moveLine(lineIndex: number, deltaMs: number) {
    if (deltaMs > 0) {
      moveLineRight(lineIndex, deltaMs)
      return
    }

    if (deltaMs < 0) {
      moveLineLeft(lineIndex, deltaMs)
    }
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

  function applyDrag(deltaMs: number, resizeAdjacentLine: boolean) {
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
      if (resizeAdjacentLine) {
        if (drag.lineIndex > 0) setBoundaryAfter(drag.lineIndex - 1, (line.startMs ?? 0) + deltaMs)
      } else {
        resizeLineStartAndShiftPrevious(drag.lineIndex, deltaMs)
      }
    } else if (drag.mode === 'resize-line-end') {
      if (resizeAdjacentLine) {
        setBoundaryAfter(drag.lineIndex, (line.endMs ?? 0) + deltaMs)
      } else {
        resizeLineEndAndShiftFollowing(drag.lineIndex, deltaMs)
      }
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
      applyDrag(deltaMs, event.altKey)
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

  function addInterludeBlock(position: 'before' | 'after' = 'after') {
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

    if (position === 'before' && baseIndex === 0 && baseLine.startMs > 0) {
      const interlude = createInterlude(0, baseLine.startMs)

      project.value.draftLines.splice(0, 0, interlude)
      selectLine(interlude)
      syncError.value = undefined
      return
    }

    const insertIndex = position === 'before' ? baseIndex : baseIndex + 1
    const insertStartMs = position === 'before' ? baseLine.startMs : baseLine.endMs
    const interlude = createInterlude(
      insertStartMs,
      insertStartMs + defaultInterludeDurationMs,
    )

    project.value.draftLines.splice(insertIndex, 0, interlude)

    for (let index = insertIndex + 1; index < project.value.draftLines.length; index += 1) {
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

    if (index === -1 || !canMoveLine(index)) {
      return
    }

    pushUndoSnapshot()
    moveLine(index, deltaMs)
  }

  function setGlobalOffset(value: number, recordUndo = false) {
    const nextOffsetMs = clamp(Math.round(value), -300_000, 300_000)

    if ((project.value.syncOffsetMs ?? 0) === nextOffsetMs) {
      return
    }

    if (recordUndo) {
      pushUndoSnapshot()
    }

    project.value.syncOffsetMs = nextOffsetMs
  }

  function adjustGlobalOffset(deltaMs: number) {
    setGlobalOffset((project.value.syncOffsetMs ?? 0) + deltaMs, true)
  }

  function onGlobalOffsetInput(event: Event) {
    setGlobalOffset(Number((event.target as HTMLInputElement).value), true)
  }

  return {
    timelineZoomPxPerSecond,
    timelineValidationIssues,
    timelineWidthPx,
    hasTimeline,
    selectedLineIndex,
    selectedLine,
    selectedSegmentIndex,
    selectedSegment,
    syncOffsetLabel,
    timelinePlayheadStyle,
    canMergeWithPreviousSegment,
    canMergeWithNextSegment,
    hasTiming,
    getLineStyle,
    canMoveLine,
    getSegmentStyle,
    getSegmentGaps,
    centerTimelineOnCurrentTime,
    onTimelineWheel,
    distributeSegments,
    constrainSegments,
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
  }
}
