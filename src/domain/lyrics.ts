export type LyricToken = {
  text: string
  start: number
  end?: number
}

export type LyricLine = {
  id: string
  start: number
  end?: number
  text: string
  tokens?: LyricToken[]
}

export type DraftLyricLine = {
  id: string
  text: string
  start?: number
}

export type KaraokeProject = {
  title: string
  audioFileName?: string
  lyricsFileName?: string
  lines: LyricLine[]
  draftLines: DraftLyricLine[]
}

const lrcLinePattern = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/

export function parseLrc(content: string): LyricLine[] {
  const parsedLines = content
    .split(/\r?\n/)
    .map((rawLine) => {
      const match = rawLine.match(lrcLinePattern)

      if (!match) {
        return null
      }

      const minutes = Number(match[1])
      const seconds = Number(match[2])
      const fraction = match[3] ?? '0'
      const normalizedFraction = Number(fraction.padEnd(3, '0').slice(0, 3)) / 1000
      const text = match[4].trim()

      return {
        id: `${minutes}:${seconds}:${fraction}:${text}`,
        start: minutes * 60 + seconds + normalizedFraction,
        text,
      } satisfies LyricLine
    })
    .filter((line): line is LyricLine => line !== null)
    .sort((left, right) => left.start - right.start)

  return parsedLines.map((line, index) => ({
    ...line,
    end: parsedLines[index + 1]?.start,
  }))
}

export function parsePlainLyrics(content: string): DraftLyricLine[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${index}:${text}`,
      text,
    }))
}

export function buildSyncedLines(draftLines: DraftLyricLine[]): LyricLine[] {
  const syncedLines = draftLines
    .filter((line): line is DraftLyricLine & { start: number } => line.start !== undefined)
    .map((line) => ({
      id: line.id,
      start: line.start,
      text: line.text,
    }))

  return syncedLines.map((line, index) => ({
    ...line,
    end: syncedLines[index + 1]?.start,
  }))
}

export function serializeLrc(lines: LyricLine[]): string {
  return lines.map((line) => `[${formatLrcTimestamp(line.start)}]${line.text}`).join('\n')
}

export function findActiveLine(lines: LyricLine[], currentTime: number): LyricLine | undefined {
  return lines.find((line, index) => {
    const nextLine = lines[index + 1]
    const end = line.end ?? nextLine?.start ?? Number.POSITIVE_INFINITY

    return currentTime >= line.start && currentTime < end
  })
}

function formatLrcTimestamp(timeInSeconds: number): string {
  const safeTime = Math.max(0, timeInSeconds)
  const minutes = Math.floor(safeTime / 60)
  const seconds = Math.floor(safeTime % 60)
  const centiseconds = Math.floor((safeTime % 1) * 100)

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
}

export function formatTimestamp(timeInSeconds: number): string {
  const safeTime = Math.max(0, timeInSeconds)
  const minutes = Math.floor(safeTime / 60)
  const seconds = Math.floor(safeTime % 60)
  const milliseconds = Math.floor((safeTime % 1) * 1000)

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}
