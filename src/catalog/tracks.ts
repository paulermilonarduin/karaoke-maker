import shortMinecraftAudioUrl from '../assets/catalog/minecraft/Short_Minecraft.mp3'
import shortMinecraftKaraoke from '../assets/catalog/minecraft/Short_Minecraft.karaoke.json?raw'

export type CatalogTrack = {
  id: string
  title: string
  audioUrl: string
  karaokeContent: string
}

export const catalogTracks: CatalogTrack[] = [
  {
    id: 'minecraft',
    title: 'Short Minecraft',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: shortMinecraftKaraoke,
  },
]
