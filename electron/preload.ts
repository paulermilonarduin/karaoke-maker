import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

type AlignRequest = {
  audioBytes: ArrayBuffer
  audioFileName: string
  words: string[]
  language?: string
  device?: string
  useDemucs?: boolean
}

type AlignResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

type DesktopApi = {
  isDesktop: boolean
  platform: string
  alignKaraoke?: (request: AlignRequest) => Promise<AlignResponse>
  onAlignProgress?: (callback: (line: string) => void) => () => void
}

const api: DesktopApi = {
  isDesktop: true,
  platform: process.platform,
}

// The alignment feature (Python + WhisperX + Demucs) stays locked unless the
// app is launched with KARAOKE_ALIGN=1 (see `npm run electron:dev:align`), so a
// dev who has not installed the optional toolchain is never bothered by it.
if (process.env.KARAOKE_ALIGN === '1') {
  api.alignKaraoke = (request: AlignRequest): Promise<AlignResponse> =>
    ipcRenderer.invoke('align:run', request)

  api.onAlignProgress = (callback: (line: string) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, line: string) => callback(line)

    ipcRenderer.on('align:progress', listener)

    return () => ipcRenderer.removeListener('align:progress', listener)
  }
}

contextBridge.exposeInMainWorld('karaokeMaker', api)
