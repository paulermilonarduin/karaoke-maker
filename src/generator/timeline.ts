export type WaveformRegionKind = 'line' | 'segment'

export type WaveformRegionModel = {
  id: string
  kind: WaveformRegionKind
  label: string
  startMs: number
  endMs?: number
  editable: boolean
}

export type WaveformRegionChange = {
  id: string
  kind: WaveformRegionKind
  startMs: number
  endMs: number
}
