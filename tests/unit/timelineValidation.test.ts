import { describe, expect, it } from 'vitest'
import type { DraftLyricLine } from '../../src/domain/lyrics'
import { validateDraftTimeline } from '../../src/generator/timelineValidation'

function createLines(): DraftLyricLine[] {
  return [
    {
      id: 'line:0',
      kind: 'lyrics',
      text: 'Bonjour',
      startMs: 0,
      endMs: 2000,
      segments: [
        { id: 'line:0:segment:0', text: 'Bon', startMs: 0, endMs: 800 },
        { id: 'line:0:segment:1', text: 'jour', startMs: 1200, endMs: 2000 },
      ],
    },
    {
      id: 'interlude:0',
      kind: 'interlude',
      text: '',
      startMs: 2000,
      endMs: 4000,
      segments: [],
    },
  ]
}

describe('validateDraftTimeline', () => {
  it('accepts continuous lines and gaps between segments', () => {
    expect(validateDraftTimeline(createLines(), 4000)).toEqual([])
  })

  it('detects gaps between lines', () => {
    const lines = createLines()
    lines[1].startMs = 2200

    expect(validateDraftTimeline(lines, 4000)).toContainEqual({
      issue: 'line-gap',
      lineId: 'interlude:0',
    })
  })

  it('detects overlapping segments', () => {
    const lines = createLines()
    lines[0].segments[1].startMs = 700

    expect(validateDraftTimeline(lines, 4000)).toContainEqual({
      issue: 'segment-overlap',
      lineId: 'line:0',
      segmentId: 'line:0:segment:1',
    })
  })

  it('detects last line ending before the track duration', () => {
    const lines = createLines()
    lines[1].endMs = 3900

    expect(validateDraftTimeline(lines, 4000)).toContainEqual({
      issue: 'last-line-end',
      lineId: 'interlude:0',
    })
  })
})

