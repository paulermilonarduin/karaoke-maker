export const KARAOKE_SCHEMA_VERSION = 1 as const

export type LyricSegment = {
  id: string
  text: string
  startMs: number
  endMs: number
}

export type LyricLineKind = 'lyrics' | 'bridge'

export type LyricLine = {
  id: string
  kind?: LyricLineKind
  startMs: number
  endMs?: number
  text: string
  segments?: LyricSegment[]
}

export type DraftLyricSegment = {
  id: string
  text: string
  startMs?: number
  endMs?: number
}

export type DraftLyricLine = {
  id: string
  kind?: LyricLineKind
  text: string
  startMs?: number
  endMs?: number
  segments: DraftLyricSegment[]
}

export type KaraokeProject = {
  title: string
  audioFileName?: string
  lyricsFileName?: string
  draftLines: DraftLyricLine[]
}

export type KaraokeFile = {
  schemaVersion: typeof KARAOKE_SCHEMA_VERSION
  title: string
  audio: {
    fileName?: string
    durationMs: number
  }
  lines: Array<LyricLine & { endMs: number }>
}

export function isBridgeLine(line: Pick<LyricLine, 'kind'>): boolean {
  return line.kind === 'bridge'
}

function splitIntoSegments(text: string, lineId: string): DraftLyricSegment[] {
  return (text.match(/\S+\s*/g) ?? [text]).map((segmentText, index) => ({
    id: `${lineId}:segment:${index}`,
    text: segmentText,
  }))
}

function isBridgeMarker(text: string): boolean {
  return /^\[(bridge|instrumental|break|pause)\]$/i.test(text.trim())
}

export function parsePlainLyrics(content: string): DraftLyricLine[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => {
      if (isBridgeMarker(text)) {
        return {
          id: `bridge:${index}`,
          kind: 'bridge',
          text: '',
          segments: [],
        }
      }

      const id = `line:${index}`

      return {
        id,
        kind: 'lyrics',
        text,
        segments: splitIntoSegments(text, id),
      }
    })
}

export function buildSyncedLines(
  draftLines: DraftLyricLine[],
  audioDurationMs?: number,
): LyricLine[] {
  const startedLines = draftLines.filter(
    (line): line is DraftLyricLine & { startMs: number } => line.startMs !== undefined,
  )

  return startedLines.map((line, lineIndex) => {
    const endMs = line.endMs ?? startedLines[lineIndex + 1]?.startMs ?? audioDurationMs

    if (isBridgeLine(line)) {
      return {
        id: line.id,
        kind: 'bridge',
        startMs: line.startMs,
        endMs,
        text: '',
      }
    }

    const allSegmentsStarted = line.segments.every((segment) => segment.startMs !== undefined)
    const segments =
      endMs !== undefined && allSegmentsStarted
        ? line.segments.map((segment, segmentIndex) => ({
            id: segment.id,
            text: segment.text,
            startMs: segment.startMs as number,
            endMs: segment.endMs ?? line.segments[segmentIndex + 1]?.startMs ?? endMs,
          }))
        : undefined

    return {
      id: line.id,
      kind: 'lyrics',
      startMs: line.startMs,
      endMs,
      text: line.text,
      segments,
    }
  })
}

export function createKaraokeFile(
  project: KaraokeProject,
  lines: LyricLine[],
  audioDurationMs: number,
): KaraokeFile {
  const completeLines = lines.map((line) => {
    if (isBridgeLine(line)) {
      if (line.endMs === undefined) {
        throw new Error('L’interlude n’est pas entièrement synchronisé.')
      }

      return {
        id: line.id,
        kind: 'bridge' as const,
        startMs: line.startMs,
        endMs: line.endMs,
        text: '',
      }
    }

    if (line.endMs === undefined || !line.segments) {
      throw new Error(`La ligne « ${line.text} » n'est pas entièrement synchronisée.`)
    }

    return {
      ...line,
      kind: 'lyrics' as const,
      endMs: line.endMs,
      segments: line.segments,
    }
  })

  const file: KaraokeFile = {
    schemaVersion: KARAOKE_SCHEMA_VERSION,
    title: project.title,
    audio: {
      fileName: project.audioFileName,
      durationMs: audioDurationMs,
    },
    lines: completeLines,
  }

  return parseKaraokeFile(JSON.stringify(file))
}

export function serializeKaraokeFile(file: KaraokeFile): string {
  return `${JSON.stringify(file, null, 2)}\n`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function parseSegment(value: unknown, line: LyricLine, index: number): LyricSegment {
  if (!isRecord(value)) {
    throw new Error(`Le segment ${index + 1} de la ligne « ${line.text} » est invalide.`)
  }

  const { id, text, startMs, endMs } = value

  if (
    typeof id !== 'string' ||
    typeof text !== 'string' ||
    !isNonNegativeInteger(startMs) ||
    !isNonNegativeInteger(endMs) ||
    endMs <= startMs
  ) {
    throw new Error(`Le segment ${index + 1} de la ligne « ${line.text} » est invalide.`)
  }

  if (startMs < line.startMs || (line.endMs !== undefined && endMs > line.endMs)) {
    throw new Error(`Le segment « ${text} » dépasse les limites de sa ligne.`)
  }

  return { id, text, startMs, endMs }
}

function parseLine(value: unknown, index: number): KaraokeFile['lines'][number] {
  if (!isRecord(value)) {
    throw new Error(`La ligne ${index + 1} est invalide.`)
  }

  const { id, kind, text, startMs, endMs, segments } = value

  if (kind === 'bridge') {
    if (
      typeof id !== 'string' ||
      (text !== undefined && typeof text !== 'string') ||
      !isNonNegativeInteger(startMs) ||
      !isNonNegativeInteger(endMs) ||
      endMs <= startMs
    ) {
      throw new Error(`L’interlude ${index + 1} est invalide.`)
    }

    return {
      id,
      kind: 'bridge',
      startMs,
      endMs,
      text: typeof text === 'string' ? text : '',
    }
  }

  if (
    typeof id !== 'string' ||
    (kind !== undefined && kind !== 'lyrics') ||
    typeof text !== 'string' ||
    !isNonNegativeInteger(startMs) ||
    !isNonNegativeInteger(endMs) ||
    endMs <= startMs ||
    !Array.isArray(segments) ||
    segments.length === 0
  ) {
    throw new Error(`La ligne ${index + 1} est invalide.`)
  }

  const line: LyricLine & { endMs: number } = { id, kind: 'lyrics', text, startMs, endMs }
  const parsedSegments = segments.map((segment, segmentIndex) =>
    parseSegment(segment, line, segmentIndex),
  )

  parsedSegments.forEach((segment, segmentIndex) => {
    const previousSegment = parsedSegments[segmentIndex - 1]

    if (previousSegment && segment.startMs < previousSegment.endMs) {
      throw new Error(`Les segments de la ligne « ${text} » se chevauchent.`)
    }
  })

  if (parsedSegments.map((segment) => segment.text).join('') !== text) {
    throw new Error(`Les segments de la ligne « ${text} » ne reconstituent pas son texte.`)
  }

  return { ...line, segments: parsedSegments }
}

export function parseKaraokeFile(content: string): KaraokeFile {
  let value: unknown

  try {
    value = JSON.parse(content)
  } catch {
    throw new Error('Le fichier karaoké ne contient pas un JSON valide.')
  }

  if (!isRecord(value) || value.schemaVersion !== KARAOKE_SCHEMA_VERSION) {
    throw new Error(`La version du fichier karaoké n'est pas supportée.`)
  }

  if (typeof value.title !== 'string' || !isRecord(value.audio) || !Array.isArray(value.lines)) {
    throw new Error('La structure du fichier karaoké est invalide.')
  }

  const { fileName, durationMs } = value.audio

  if (
    (fileName !== undefined && typeof fileName !== 'string') ||
    !isNonNegativeInteger(durationMs)
  ) {
    throw new Error('Les informations audio du fichier karaoké sont invalides.')
  }

  const lines = value.lines.map((line, index) => parseLine(line, index))

  lines.forEach((line, index) => {
    const previousLine = lines[index - 1]

    if (previousLine && line.startMs < previousLine.endMs) {
      throw new Error(`Les lignes « ${previousLine.text} » et « ${line.text} » se chevauchent.`)
    }

    if (line.endMs > durationMs) {
      throw new Error(`La ligne « ${line.text} » dépasse la durée de la piste audio.`)
    }
  })

  return {
    schemaVersion: KARAOKE_SCHEMA_VERSION,
    title: value.title,
    audio: { fileName, durationMs },
    lines,
  }
}

export type AlignedWord = {
  index: number
  startMs: number | null
  endMs: number | null
  score: number | null
}

export type AlignmentResult = {
  durationMs: number
  words: AlignedWord[]
}

const MIN_DURATION_MS = 1

/**
 * Ordered list of words to feed the forced aligner: the trimmed text of every
 * segment of every lyric line (bridge lines carry no words). Tokenization stays
 * authoritative here, mirroring {@link parsePlainLyrics}.
 */
export function collectLyricWords(draftLines: DraftLyricLine[]): string[] {
  const words: string[] = []

  draftLines.forEach((line) => {
    if (isBridgeLine(line)) {
      return
    }

    line.segments.forEach((segment) => {
      words.push(segment.text.trim())
    })
  })

  return words
}

function cloneDraftLine(line: DraftLyricLine): DraftLyricLine {
  return {
    ...line,
    segments: line.segments.map((segment) => ({ ...segment })),
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

/**
 * Fill `null` entries of a monotonic timestamp series by linear interpolation
 * between known anchors, extrapolating leading/trailing gaps within [lo, hi].
 */
function interpolateStarts(values: (number | null)[], lo: number, hi: number): number[] {
  const result = values.slice()
  const anchors = result
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null)

  if (anchors.length === 0) {
    // No timing at all: spread evenly across the available range.
    return result.map((_, index) =>
      Math.round(lo + ((hi - lo) * index) / Math.max(1, result.length)),
    )
  }

  // Leading gap before the first anchor.
  const first = anchors[0]
  for (let index = 0; index < first.index; index += 1) {
    result[index] = Math.round(lo + ((first.value - lo) * index) / first.index)
  }

  // Interior gaps between consecutive anchors.
  for (let a = 0; a < anchors.length - 1; a += 1) {
    const left = anchors[a]
    const right = anchors[a + 1]
    const span = right.index - left.index

    for (let index = left.index + 1; index < right.index; index += 1) {
      const ratio = (index - left.index) / span
      result[index] = Math.round(left.value + (right.value - left.value) * ratio)
    }
  }

  // Trailing gap after the last anchor.
  const last = anchors[anchors.length - 1]
  const trailing = result.length - last.index - 1
  for (let offset = 1; offset <= trailing; offset += 1) {
    result[last.index + offset] = Math.round(
      last.value + ((hi - last.value) * offset) / (trailing + 1),
    )
  }

  return result as number[]
}

/**
 * Merge per-word forced-alignment timings into parsed draft lines, producing a
 * fully-timed, valid draft ready for review/export. Word timings map in order
 * onto the lyric segments; bridges are timed from their neighbours. The result
 * is normalized so it satisfies {@link parseKaraokeFile} (monotonic,
 * non-overlapping, within bounds, no zero-length spans). Segment text is never
 * touched, so its concatenation still reconstitutes each line.
 */
export function applyWordAlignment(
  draftLines: DraftLyricLine[],
  words: AlignedWord[],
  durationMs: number,
  leadMs = 0,
): DraftLyricLine[] {
  const lines = draftLines.map(cloneDraftLine)
  // Forced-alignment onsets (wav2vec2) lag the true start by a constant amount,
  // and a karaoke highlight reads better slightly ahead of the voice. `leadMs`
  // shifts every word earlier by that much (clamped at 0).
  const lead = Math.max(0, Math.round(leadMs))
  const shift = (value: number | null | undefined): number | null =>
    value === null || value === undefined ? null : Math.max(0, value - lead)

  // Flatten lyric segments in order and pull their raw timings from the words.
  const refs: { line: DraftLyricLine; segment: DraftLyricSegment }[] = []
  lines.forEach((line) => {
    if (!isBridgeLine(line)) {
      line.segments.forEach((segment) => refs.push({ line, segment }))
    }
  })

  const rawStarts = refs.map((_, index) => shift(words[index]?.startMs))
  const rawEnds = refs.map((_, index) => shift(words[index]?.endMs))
  const starts = interpolateStarts(rawStarts, 0, durationMs)

  // Enforce strictly increasing starts with a minimal gap.
  for (let index = 0; index < starts.length; index += 1) {
    const floor = index === 0 ? 0 : starts[index - 1] + MIN_DURATION_MS
    starts[index] = clamp(starts[index], floor, durationMs - MIN_DURATION_MS)
  }

  // End of each segment: prefer the aligner's end (keeps natural gaps), else
  // extend to the next segment's start; always within (start, cap].
  const ends = starts.map((start, index) => {
    const cap = index + 1 < starts.length ? starts[index + 1] : durationMs
    const aligned = rawEnds[index]
    const candidate = aligned ?? cap

    return clamp(candidate, start + MIN_DURATION_MS, Math.max(start + MIN_DURATION_MS, cap))
  })

  refs.forEach((ref, index) => {
    ref.segment.startMs = starts[index]
    ref.segment.endMs = ends[index]
  })

  lines.forEach((line) => {
    if (isBridgeLine(line) || line.segments.length === 0) {
      return
    }

    line.startMs = line.segments[0].startMs
    line.endMs = line.segments[line.segments.length - 1].endMs
  })

  // Index of the nearest following lyric line start, used to bound bridges.
  const nextLyricStart: number[] = new Array(lines.length)
  let following = durationMs
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    nextLyricStart[index] = following
    if (!isBridgeLine(lines[index]) && lines[index].startMs !== undefined) {
      following = lines[index].startMs as number
    }
  }

  // Final forward pass: assign bridge spans and guarantee a globally valid,
  // non-overlapping timeline. A bumped line is shifted whole to keep the
  // alignment spacing intact.
  let cursor = 0
  lines.forEach((line, index) => {
    if (isBridgeLine(line)) {
      const start = clamp(cursor, 0, durationMs - MIN_DURATION_MS)
      const end = clamp(
        nextLyricStart[index],
        start + MIN_DURATION_MS,
        durationMs,
      )

      line.startMs = start
      line.endMs = end
      cursor = end
      return
    }

    const oldStart = line.startMs ?? cursor
    const start = Math.max(oldStart, cursor)
    const delta = start - oldStart

    if (delta > 0) {
      line.segments.forEach((segment) => {
        if (segment.startMs !== undefined) segment.startMs += delta
        if (segment.endMs !== undefined) segment.endMs += delta
      })
    }

    const end = clamp(
      (line.endMs ?? start) + delta,
      start + MIN_DURATION_MS,
      durationMs,
    )

    // Keep segments inside the (possibly duration-clamped) line bounds.
    let segmentCursor = start
    line.segments.forEach((segment) => {
      const segmentStart = clamp(segment.startMs ?? segmentCursor, segmentCursor, end - MIN_DURATION_MS)
      const segmentEnd = clamp(segment.endMs ?? end, segmentStart + MIN_DURATION_MS, end)

      segment.startMs = segmentStart
      segment.endMs = segmentEnd
      segmentCursor = segmentEnd
    })

    line.startMs = start
    line.endMs = end
    cursor = end
  })

  return lines
}

export function findActiveLine(lines: LyricLine[], currentTimeMs: number): LyricLine | undefined {
  return lines.find((line, index) => {
    const endMs = line.endMs ?? lines[index + 1]?.startMs ?? Number.POSITIVE_INFINITY

    return currentTimeMs >= line.startMs && currentTimeMs < endMs
  })
}

export function formatTimestamp(timeMs: number): string {
  const safeTimeMs = Math.max(0, Math.floor(timeMs))
  const minutes = Math.floor(safeTimeMs / 60_000)
  const seconds = Math.floor((safeTimeMs % 60_000) / 1000)
  const milliseconds = safeTimeMs % 1000

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}
