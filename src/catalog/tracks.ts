import minecraftAudioUrl from '../assets/catalog/minecraft/Minecraft.mp3'
import minecraftLyrics from '../assets/catalog/minecraft/Minecraft.lrc?raw'

export type CatalogTrack = {
  id: string
  title: string
  audioUrl: string
  lyricsContent: string
}

export const catalogTracks: CatalogTrack[] = [
  {
    id: 'minecraft',
    title: 'Minecraft',
    audioUrl: minecraftAudioUrl,
    lyricsContent: minecraftLyrics,
  },
]
