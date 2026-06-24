// Lyrics lookup via LRCLIB (https://lrclib.net) — a free, open, no-auth lyrics
// database. Its API sends `Access-Control-Allow-Origin: *`, so the browser can
// call it directly; no backend or Electron proxy needed.

const SEARCH_ENDPOINT = 'https://lrclib.net/api/search'

export type LyricsSearchResult = {
  id: number
  trackName: string
  artistName: string
  albumName?: string
  duration?: number
  plainLyrics?: string
  syncedLyrics?: string
}

/** Plain lyrics for a result, deriving them from the synced (LRC) text if the
 * plain field is missing by stripping the `[mm:ss.xx]` timestamps. */
export function resultPlainLyrics(result: LyricsSearchResult): string {
  if (result.plainLyrics?.trim()) {
    return result.plainLyrics
  }

  if (result.syncedLyrics?.trim()) {
    return result.syncedLyrics.replace(/^\s*\[\d+:\d+(?:\.\d+)?\]\s*/gm, '')
  }

  return ''
}

export async function searchLyrics(query: string): Promise<LyricsSearchResult[]> {
  const trimmed = query.trim()

  if (!trimmed) {
    return []
  }

  const response = await fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(trimmed)}`)

  if (!response.ok) {
    throw new Error(`LRCLIB ${response.status}`)
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    return []
  }

  return data
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      id: Number(entry.id),
      trackName: typeof entry.trackName === 'string' ? entry.trackName : '',
      artistName: typeof entry.artistName === 'string' ? entry.artistName : '',
      albumName: typeof entry.albumName === 'string' ? entry.albumName : undefined,
      duration: typeof entry.duration === 'number' ? entry.duration : undefined,
      plainLyrics: typeof entry.plainLyrics === 'string' ? entry.plainLyrics : undefined,
      syncedLyrics: typeof entry.syncedLyrics === 'string' ? entry.syncedLyrics : undefined,
    }))
    .filter((result) => result.trackName !== '')
}
