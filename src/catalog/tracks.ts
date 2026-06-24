import shortMinecraftAudioUrl from '../assets/catalog/minecraft/Short_Minecraft.mp3'
import shortMinecraftKaraoke from '../assets/catalog/minecraft/Short_Minecraft.karaoke.json?raw'
import { parseKaraokeFile } from '../domain/lyrics'

export type CatalogTrack = {
  id: string
  title: string
  artist: string
  durationMs: number
  audioUrl: string
  karaokeContent: string
}

const createEmptyKaraokeContent = (title: string, artist: string) =>
  JSON.stringify(
    {
      schemaVersion: 2,
      song: {
        title,
        artist,
        durationMs: 96012,
      },
      audio: {
        fileName: 'Short_Minecraft.mp3',
      },
      assets: {
        cover: null,
        background: null,
      },
      display: {
        accentColor: null,
        backgroundColor: null,
      },
      lines: [],
    },
    null,
    2,
  )

const demoTracks: CatalogTrack[] = Array.from({ length: 11 }, (_, index) => {
  const displayIndex = String(index + 1).padStart(2, '0')
  const title = `Démo ${displayIndex}`
  const artist = 'Karaoke Maker'

  return createCatalogTrack({
    id: `demo-${displayIndex}`,
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: createEmptyKaraokeContent(title, artist),
  })
})

function createCatalogTrack(track: Pick<CatalogTrack, 'id' | 'audioUrl' | 'karaokeContent'>) {
  const karaokeFile = parseKaraokeFile(track.karaokeContent)

  return {
    ...track,
    title: karaokeFile.song.title,
    artist: karaokeFile.song.artist,
    durationMs: karaokeFile.song.durationMs,
  }
}

export const catalogTracks: CatalogTrack[] = [
  createCatalogTrack({
    id: 'minecraft',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: shortMinecraftKaraoke,
  }),
  ...demoTracks,
]
