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
  lyricsFileName?: string
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

  if (!isRecord(value.song) || !isRecord(value.audio) || !Array.isArray(value.lines)) {
    throw new Error('La structure du fichier karaoké est invalide.')
  }

  const { title, artist, durationMs } = value.song
  const { fileName } = value.audio
  const assets = parseOptionalAssets(value.assets)
  const display = parseOptionalDisplay(value.display)

  if (
    typeof title !== 'string' ||
    typeof artist !== 'string' ||
    !isNonNegativeInteger(durationMs) ||
    (fileName !== undefined && typeof fileName !== 'string') ||
    (value.assets !== undefined && assets === undefined) ||
    (value.display !== undefined && display === undefined)
  ) {
    throw new Error('Les informations du fichier karaoké sont invalides.')
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
    song: { title, artist, durationMs },
    audio: { fileName },
    ...(assets !== undefined ? { assets } : {}),
    ...(display !== undefined ? { display } : {}),
    lines,
  }
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
