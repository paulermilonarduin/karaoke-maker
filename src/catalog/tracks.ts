import shortMinecraftAudioUrl from '../assets/catalog/minecraft/Short_Minecraft.mp3'
import shortMinecraftKaraoke from '../assets/catalog/minecraft/Short_Minecraft.karaoke.json?raw'
import demo01Karaoke from '../assets/catalog/placeholders/Demo_01.karaoke.json?raw'
import demo02Karaoke from '../assets/catalog/placeholders/Demo_02.karaoke.json?raw'
import demo03Karaoke from '../assets/catalog/placeholders/Demo_03.karaoke.json?raw'
import demo04Karaoke from '../assets/catalog/placeholders/Demo_04.karaoke.json?raw'
import demo05Karaoke from '../assets/catalog/placeholders/Demo_05.karaoke.json?raw'
import demo06Karaoke from '../assets/catalog/placeholders/Demo_06.karaoke.json?raw'
import demo07Karaoke from '../assets/catalog/placeholders/Demo_07.karaoke.json?raw'
import demo08Karaoke from '../assets/catalog/placeholders/Demo_08.karaoke.json?raw'
import demo09Karaoke from '../assets/catalog/placeholders/Demo_09.karaoke.json?raw'
import demo10Karaoke from '../assets/catalog/placeholders/Demo_10.karaoke.json?raw'
import demo11Karaoke from '../assets/catalog/placeholders/Demo_11.karaoke.json?raw'

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
  {
    id: 'demo-01',
    title: 'Démo 01',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo01Karaoke,
  },
  {
    id: 'demo-02',
    title: 'Démo 02',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo02Karaoke,
  },
  {
    id: 'demo-03',
    title: 'Démo 03',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo03Karaoke,
  },
  {
    id: 'demo-04',
    title: 'Démo 04',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo04Karaoke,
  },
  {
    id: 'demo-05',
    title: 'Démo 05',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo05Karaoke,
  },
  {
    id: 'demo-06',
    title: 'Démo 06',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo06Karaoke,
  },
  {
    id: 'demo-07',
    title: 'Démo 07',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo07Karaoke,
  },
  {
    id: 'demo-08',
    title: 'Démo 08',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo08Karaoke,
  },
  {
    id: 'demo-09',
    title: 'Démo 09',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo09Karaoke,
  },
  {
    id: 'demo-10',
    title: 'Démo 10',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo10Karaoke,
  },
  {
    id: 'demo-11',
    title: 'Démo 11',
    audioUrl: shortMinecraftAudioUrl,
    karaokeContent: demo11Karaoke,
  },
]
