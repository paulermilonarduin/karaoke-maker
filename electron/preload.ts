import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('karaokeMaker', {
  isDesktop: true,
  platform: process.platform,
})
