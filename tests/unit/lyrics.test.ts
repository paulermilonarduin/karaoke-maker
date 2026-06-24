import { describe, expect, it } from 'vitest'
import { findActiveLine, parseKaraokeFile } from '../../src/domain/lyrics'

function createFile(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    song: {
      title: 'Test song',
      artist: 'Test artist',
      durationMs: 4000,
    },
    audio: {
      fileName: 'test.mp3',
    },
    sync: {
      offsetMs: 250,
    },
    lines: [
      {
        id: 'line:0',
        kind: 'lyrics',
        text: 'Bonjour',
        startMs: 0,
        endMs: 2000,
        segments: [
          {
            id: 'line:0:segment:0',
            text: 'Bon',
            startMs: 0,
            endMs: 800,
          },
          {
            id: 'line:0:segment:1',
            text: 'jour',
            startMs: 1200,
            endMs: 2000,
          },
        ],
      },
      {
        id: 'interlude:0',
        kind: 'interlude',
        text: '',
        startMs: 2000,
        endMs: 4000,
      },
    ],
    ...overrides,
  }
}

describe('parseKaraokeFile', () => {
  it('parses a continuous v2 file with segment gaps and sync offset', () => {
    const file = parseKaraokeFile(JSON.stringify(createFile()))

    expect(file.song.title).toBe('Test song')
    expect(file.sync?.offsetMs).toBe(250)
    expect(file.lines).toHaveLength(2)
    expect(file.lines[0].segments?.map((segment) => segment.text).join('')).toBe('Bonjour')
  })

  it('rejects gaps between lines', () => {
    const file = createFile({
      lines: [
        {
          id: 'line:0',
          kind: 'lyrics',
          text: 'A',
          startMs: 0,
          endMs: 1000,
          segments: [{ id: 'line:0:segment:0', text: 'A', startMs: 0, endMs: 1000 }],
        },
        {
          id: 'line:1',
          kind: 'lyrics',
          text: 'B',
          startMs: 1200,
          endMs: 4000,
          segments: [{ id: 'line:1:segment:0', text: 'B', startMs: 1200, endMs: 4000 }],
        },
      ],
    })

    expect(() => parseKaraokeFile(JSON.stringify(file))).toThrow(/continues/)
  })

  it('rejects segment text mismatches', () => {
    const file = createFile({
      lines: [
        {
          id: 'line:0',
          kind: 'lyrics',
          text: 'Bonjour',
          startMs: 0,
          endMs: 4000,
          segments: [{ id: 'line:0:segment:0', text: 'Bonsoir', startMs: 0, endMs: 4000 }],
        },
      ],
    })

    expect(() => parseKaraokeFile(JSON.stringify(file))).toThrow(/reconstituent/)
  })
})

describe('findActiveLine', () => {
  it('applies a global sync offset', () => {
    const file = parseKaraokeFile(JSON.stringify(createFile()))

    expect(findActiveLine(file.lines, 1800)?.id).toBe('line:0')
    expect(findActiveLine(file.lines, 1800, 250)?.id).toBe('interlude:0')
  })
})
