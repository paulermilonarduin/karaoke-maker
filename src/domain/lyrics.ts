export const KARAOKE_SCHEMA_VERSION = 2 as const

export type LyricSegment = {
  id: string
  text: string
  startMs: number
  endMs: number
}

export type LyricLineKind = 'lyrics' | 'interlude'

export type LyricLine = {
  id: string
  kind: LyricLineKind
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
  kind: LyricLineKind
  text: string
  startMs?: number
  endMs?: number
  segments: DraftLyricSegment[]
}

export type KaraokeProject = {
  title: string
  artist: string
  audioFileName?: string
  karaokeFileName?: string
  lyricsFileName?: string
  syncOffsetMs?: number
  draftLines: DraftLyricLine[]
}

export type KaraokeSong = {
  title: string
  artist: string
  durationMs: number
}

export type KaraokeFile = {
  schemaVersion: typeof KARAOKE_SCHEMA_VERSION
  song: KaraokeSong
  audio: {
    fileName?: string
  }
  assets?: {
    cover?: string | null
    background?: string | null
  }
  display?: {
    accentColor?: string | null
    backgroundColor?: string | null
  }
  sync?: {
    offsetMs: number
  }
  lines: Array<LyricLine & { endMs: number }>
}

export function isInterludeLine(line: Pick<LyricLine, 'kind'>): boolean {
  return line.kind === 'interlude'
}

function splitIntoSegments(text: string, lineId: string): DraftLyricSegment[] {
  return [
    {
      id: `${lineId}:segment:0`,
      text,
    },
  ]
}

export function parsePlainLyrics(content: string): DraftLyricLine[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => {
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

    if (isInterludeLine(line)) {
      return {
        id: line.id,
        kind: 'interlude',
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
    if (isInterludeLine(line)) {
      if (line.endMs === undefined) {
        throw new Error('L’interlude n’est pas entièrement synchronisé.')
      }

      return {
        id: line.id,
        kind: 'interlude' as const,
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
    song: {
      title: project.title,
      artist: project.artist,
      durationMs: audioDurationMs,
    },
    audio: {
      fileName: project.audioFileName,
    },
    assets: {
      cover: null,
      background: null,
    },
    display: {
      accentColor: null,
      backgroundColor: null,
    },
    sync: {
      offsetMs: project.syncOffsetMs ?? 0,
    },
    lines: completeLines,
  }

  // Temporary: export the current editor state without round-tripping through
  // the strict parser. The editor can currently produce useful draft timelines
  // with gaps or imperfect segment bounds while the timeline UX is still moving.
  return file
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

function isInteger(value: unknown): value is number {
  return Number.isInteger(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function parseOptionalAssets(value: unknown): KaraokeFile['assets'] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isRecord(value)) {
    return undefined
  }

  const { cover, background } = value

  if (
    (cover !== undefined && !isNullableString(cover)) ||
    (background !== undefined && !isNullableString(background))
  ) {
    return undefined
  }

  return {
    ...(cover !== undefined ? { cover } : {}),
    ...(background !== undefined ? { background } : {}),
  }
}

function parseOptionalDisplay(value: unknown): KaraokeFile['display'] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isRecord(value)) {
    return undefined
  }

  const { accentColor, backgroundColor } = value

  if (
    (accentColor !== undefined && !isNullableString(accentColor)) ||
    (backgroundColor !== undefined && !isNullableString(backgroundColor))
  ) {
    return undefined
  }

  return {
    ...(accentColor !== undefined ? { accentColor } : {}),
    ...(backgroundColor !== undefined ? { backgroundColor } : {}),
  }
}

function parseOptionalSync(value: unknown): KaraokeFile['sync'] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!isRecord(value) || !isInteger(value.offsetMs)) {
    return undefined
  }

  return {
    offsetMs: value.offsetMs,
  }
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

  if (kind === 'interlude') {
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
      kind: 'interlude',
      startMs,
      endMs,
      text: typeof text === 'string' ? text : '',
    }
  }

  if (
    typeof id !== 'string' ||
    kind !== 'lyrics' ||
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

  if (
    !isRecord(value.song) ||
    !isRecord(value.audio) ||
    !Array.isArray(value.lines) ||
    value.lines.length === 0
  ) {
    throw new Error('La structure du fichier karaoké est invalide.')
  }

  const { title, artist, durationMs } = value.song
  const { fileName } = value.audio
  const assets = parseOptionalAssets(value.assets)
  const display = parseOptionalDisplay(value.display)
  const sync = parseOptionalSync(value.sync)

  if (
    typeof title !== 'string' ||
    typeof artist !== 'string' ||
    !isNonNegativeInteger(durationMs) ||
    (fileName !== undefined && typeof fileName !== 'string') ||
    (value.assets !== undefined && assets === undefined) ||
    (value.display !== undefined && display === undefined) ||
    (value.sync !== undefined && sync === undefined)
  ) {
    throw new Error('Les informations du fichier karaoké sont invalides.')
  }

  const lines = value.lines.map((line, index) => parseLine(line, index))

  lines.forEach((line, index) => {
    const previousLine = lines[index - 1]

    if (index === 0 && line.startMs !== 0) {
      throw new Error('La première ligne doit commencer au début de la piste audio.')
    }

    if (previousLine && line.startMs !== previousLine.endMs) {
      throw new Error(
        `Les lignes « ${previousLine.text} » et « ${line.text} » doivent être continues.`,
      )
    }

    if (line.endMs > durationMs) {
      throw new Error(`La ligne « ${line.text} » dépasse la durée de la piste audio.`)
    }

    if (index === lines.length - 1 && line.endMs !== durationMs) {
      throw new Error('La dernière ligne doit terminer exactement avec la piste audio.')
    }
  })

  return {
    schemaVersion: KARAOKE_SCHEMA_VERSION,
    song: { title, artist, durationMs },
    audio: { fileName },
    ...(assets !== undefined ? { assets } : {}),
    ...(display !== undefined ? { display } : {}),
    ...(sync !== undefined ? { sync } : {}),
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

const minimumAlignmentDurationMs = 1

function splitTextIntoAlignmentSegments(text: string, lineId: string): DraftLyricSegment[] {
  const parts = text.match(/\S+\s*/g) ?? [text]

  return parts.map((part, index) => ({
    id: `${lineId}:segment:${index}`,
    text: part,
  }))
}

export function collectLyricWords(draftLines: DraftLyricLine[]): string[] {
  const words: string[] = []

  draftLines.forEach((line) => {
    if (isInterludeLine(line)) {
      return
    }

    splitTextIntoAlignmentSegments(line.text, line.id).forEach((segment) => {
      const word = segment.text.trim()

      if (word) {
        words.push(word)
      }
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

function interpolateStarts(values: (number | null)[], minimum: number, maximum: number): number[] {
  const result = values.slice()
  const anchors = result
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null)

  if (anchors.length === 0) {
    return result.map((_, index) =>
      Math.round(minimum + ((maximum - minimum) * index) / Math.max(1, result.length)),
    )
  }

  const first = anchors[0]

  for (let index = 0; index < first.index; index += 1) {
    result[index] = Math.round(minimum + ((first.value - minimum) * index) / first.index)
  }

  for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
    const left = anchors[anchorIndex]
    const right = anchors[anchorIndex + 1]
    const span = right.index - left.index

    for (let index = left.index + 1; index < right.index; index += 1) {
      const ratio = (index - left.index) / span

      result[index] = Math.round(left.value + (right.value - left.value) * ratio)
    }
  }

  const last = anchors[anchors.length - 1]
  const trailing = result.length - last.index - 1

  for (let offset = 1; offset <= trailing; offset += 1) {
    result[last.index + offset] = Math.round(
      last.value + ((maximum - last.value) * offset) / (trailing + 1),
    )
  }

  return result as number[]
}

export function applyWordAlignment(
  draftLines: DraftLyricLine[],
  words: AlignedWord[],
  durationMs: number,
  leadMs = 0,
): DraftLyricLine[] {
  const lines = draftLines.map(cloneDraftLine)
  const lead = Math.max(0, Math.round(leadMs))
  const shift = (value: number | null | undefined): number | null =>
    value === null || value === undefined ? null : Math.max(0, value - lead)
  const refs: { line: DraftLyricLine; segment: DraftLyricSegment }[] = []

  lines.forEach((line) => {
    if (isInterludeLine(line)) {
      return
    }

    line.segments = splitTextIntoAlignmentSegments(line.text, line.id)
    line.segments.forEach((segment) => refs.push({ line, segment }))
  })

  const rawStarts = refs.map((_, index) => shift(words[index]?.startMs))
  const rawEnds = refs.map((_, index) => shift(words[index]?.endMs))
  const starts = interpolateStarts(rawStarts, 0, durationMs)

  for (let index = 0; index < starts.length; index += 1) {
    const floor = index === 0 ? 0 : starts[index - 1] + minimumAlignmentDurationMs

    starts[index] = clamp(starts[index], floor, durationMs - minimumAlignmentDurationMs)
  }

  const ends = starts.map((start, index) => {
    const cap = index + 1 < starts.length ? starts[index + 1] : durationMs
    const aligned = rawEnds[index]
    const candidate = aligned ?? cap

    return clamp(
      candidate,
      start + minimumAlignmentDurationMs,
      Math.max(start + minimumAlignmentDurationMs, cap),
    )
  })

  refs.forEach((ref, index) => {
    ref.segment.startMs = starts[index]
    ref.segment.endMs = ends[index]
  })

  lines.forEach((line) => {
    if (isInterludeLine(line) || line.segments.length === 0) {
      return
    }

    line.startMs = line.segments[0].startMs
    line.endMs = line.segments[line.segments.length - 1].endMs
  })

  const nextLyricStart: number[] = new Array(lines.length)
  let following = durationMs

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    nextLyricStart[index] = following

    if (!isInterludeLine(lines[index]) && lines[index].startMs !== undefined) {
      following = lines[index].startMs as number
    }
  }

  let cursor = 0

  lines.forEach((line, index) => {
    if (isInterludeLine(line)) {
      const start = clamp(cursor, 0, durationMs - minimumAlignmentDurationMs)
      const end = clamp(nextLyricStart[index], start + minimumAlignmentDurationMs, durationMs)

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
      start + minimumAlignmentDurationMs,
      durationMs,
    )
    let segmentCursor = start

    line.segments.forEach((segment) => {
      const segmentStart = clamp(
        segment.startMs ?? segmentCursor,
        segmentCursor,
        end - minimumAlignmentDurationMs,
      )
      const segmentEnd = clamp(segment.endMs ?? end, segmentStart + minimumAlignmentDurationMs, end)

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

export function findActiveLine(
  lines: LyricLine[],
  currentTimeMs: number,
  offsetMs = 0,
): LyricLine | undefined {
  const effectiveTimeMs = currentTimeMs + offsetMs

  return lines.find((line, index) => {
    const endMs = line.endMs ?? lines[index + 1]?.startMs ?? Number.POSITIVE_INFINITY

    return effectiveTimeMs >= line.startMs && effectiveTimeMs < endMs
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
