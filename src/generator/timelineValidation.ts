import { isInterludeLine, type DraftLyricLine } from '../domain/lyrics'

export type TimelineValidationIssue =
  | 'empty'
  | 'first-line-start'
  | 'line-gap'
  | 'line-out-of-duration'
  | 'last-line-end'
  | 'segment-out-of-line'
  | 'segment-overlap'
  | 'segment-text-mismatch'

export type TimelineValidationResult = {
  issue: TimelineValidationIssue
  lineId?: string
  segmentId?: string
}

function hasLineTiming(line: DraftLyricLine): line is DraftLyricLine & {
  startMs: number
  endMs: number
} {
  return line.startMs !== undefined && line.endMs !== undefined && line.endMs > line.startMs
}

function hasSegmentTiming(segment: DraftLyricLine['segments'][number]): segment is DraftLyricLine['segments'][number] & {
  startMs: number
  endMs: number
} {
  return segment.startMs !== undefined && segment.endMs !== undefined && segment.endMs > segment.startMs
}

export function validateDraftTimeline(
  lines: DraftLyricLine[],
  durationMs?: number,
): TimelineValidationResult[] {
  const issues: TimelineValidationResult[] = []

  if (lines.length === 0) {
    return [{ issue: 'empty' }]
  }

  lines.forEach((line, index) => {
    const previousLine = lines[index - 1]

    if (!hasLineTiming(line)) {
      issues.push({ issue: 'line-out-of-duration', lineId: line.id })
      return
    }

    if (index === 0 && line.startMs !== 0) {
      issues.push({ issue: 'first-line-start', lineId: line.id })
    }

    if (previousLine && hasLineTiming(previousLine) && line.startMs !== previousLine.endMs) {
      issues.push({ issue: 'line-gap', lineId: line.id })
    }

    if (durationMs !== undefined && line.endMs > durationMs) {
      issues.push({ issue: 'line-out-of-duration', lineId: line.id })
    }

    if (durationMs !== undefined && index === lines.length - 1 && line.endMs !== durationMs) {
      issues.push({ issue: 'last-line-end', lineId: line.id })
    }

    if (isInterludeLine(line)) {
      return
    }

    if (line.segments.map((segment) => segment.text).join('') !== line.text) {
      issues.push({ issue: 'segment-text-mismatch', lineId: line.id })
    }

    line.segments.forEach((segment, segmentIndex) => {
      const previousSegment = line.segments[segmentIndex - 1]

      if (!hasSegmentTiming(segment)) {
        issues.push({ issue: 'segment-out-of-line', lineId: line.id, segmentId: segment.id })
        return
      }

      if (segment.startMs < line.startMs || segment.endMs > line.endMs) {
        issues.push({ issue: 'segment-out-of-line', lineId: line.id, segmentId: segment.id })
      }

      if (
        previousSegment &&
        hasSegmentTiming(previousSegment) &&
        segment.startMs < previousSegment.endMs
      ) {
        issues.push({ issue: 'segment-overlap', lineId: line.id, segmentId: segment.id })
      }
    })
  })

  return issues
}
