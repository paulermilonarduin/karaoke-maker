import shortMinecraftAudioUrl from '../assets/catalog/minecraft/Short_Minecraft.mp3'
import shortMinecraftKaraoke from '../assets/catalog/minecraft/Short_Minecraft.karaoke.json?raw'

export type CatalogTrack = {
  id: string
  title: string
  audioUrl: string
  karaokeContent: string
}

const createEmptyKaraokeContent = (title: string) =>
  JSON.stringify(
    {
      schemaVersion: 1,
      title,
      audio: {
        fileName: 'Short_Minecraft.mp3',
        durationMs: 96012,
      },
      lines: [],
    },
    null,
    2,
  )

const demoTracks: CatalogTrack[] = Array.from({ length: 11 }, (_, index) => {
  const displayIndex = String(index + 1).padStart(2, '0')
  const title = `Démo ${displayIndex}`

  return {
    id: `demo-${displayIndex}`,
    title,
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: createEmptyKaraokeContent(title),
  }
})

export const catalogTracks: CatalogTrack[] = [
  {
    id: 'minecraft',
    title: 'Short Minecraft',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: shortMinecraftKaraoke,
  },
  ...demoTracks,
]
