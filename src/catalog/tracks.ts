import minecraftAudioUrl from '../assets/catalog/minecraft/Minecraft.mp3'
import minecraftKaraoke from '../assets/catalog/minecraft/Minecraft.karaoke.json?raw'

export type CatalogTrack = {
  id: string
  title: string
  audioUrl: string
  karaokeContent: string
}

export const catalogTracks: CatalogTrack[] = [
  {
    id: 'minecraft',
    title: 'Minecraft',
    audioUrl: minecraftAudioUrl,
    karaokeContent: minecraftKaraoke,
  },
]
