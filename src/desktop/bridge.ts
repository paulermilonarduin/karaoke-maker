import type { AlignedWord, AlignmentResult } from '../domain/lyrics'

export type AlignmentRequest = {
  audioBytes: ArrayBuffer
  audioFileName: string
  words: string[]
  language?: string
  device?: string
  useDemucs?: boolean
}

type AlignmentResponse = { ok: true; result: unknown } | { ok: false; error: string }

type DesktopBridge = {
  isDesktop: boolean
  platform: string
  // Present only when the app is launched with the alignment feature unlocked.
  alignKaraoke?: (request: AlignmentRequest) => Promise<AlignmentResponse>
  onAlignProgress?: (callback: (line: string) => void) => () => void
}

declare global {
  interface Window {
    karaokeMaker?: DesktopBridge
  }
}

/**
 * Forced alignment runs Python (WhisperX + Demucs), which only the Electron
 * shell can reach. In the browser the bridge is absent and the feature is
 * hidden. A future HTTP API could provide the same surface.
 */
export function isAlignmentAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.karaokeMaker?.alignKaraoke === 'function'
}

export function onAlignmentProgress(callback: (line: string) => void): () => void {
  return window.karaokeMaker?.onAlignProgress?.(callback) ?? (() => {})
}

function parseAlignmentResult(value: unknown): AlignmentResult {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Empty alignment result.')
  }

  const candidate = value as { durationMs?: unknown; words?: unknown }

  if (typeof candidate.durationMs !== 'number' || !Array.isArray(candidate.words)) {
    throw new Error('Malformed alignment result.')
  }

  const words: AlignedWord[] = candidate.words.map((entry, index) => {
    const word = entry as Partial<AlignedWord>

    return {
      index: typeof word.index === 'number' ? word.index : index,
      startMs: typeof word.startMs === 'number' ? word.startMs : null,
      endMs: typeof word.endMs === 'number' ? word.endMs : null,
      score: typeof word.score === 'number' ? word.score : null,
    }
  })

  return { durationMs: candidate.durationMs, words }
}

export async function requestAlignment(request: AlignmentRequest): Promise<AlignmentResult> {
  const bridge = window.karaokeMaker

  if (!bridge?.alignKaraoke) {
    throw new Error('Alignment is only available in the desktop app.')
  }

  const response = await bridge.alignKaraoke(request)

  if (!response.ok) {
    throw new Error(response.error)
  }

  return parseAlignmentResult(response.result)
}
