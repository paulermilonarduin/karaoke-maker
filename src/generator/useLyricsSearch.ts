import { ref, type Ref } from 'vue'
import { parsePlainLyrics, type KaraokeProject } from '../domain/lyrics'
import {
  resultPlainLyrics,
  searchLyrics,
  type LyricsSearchResult,
} from '../lyrics/lrclib'

type LyricsSearchTranslationKey =
  | 'generator.lyricsSearchEmpty'
  | 'generator.lyricsSearchError'
  | 'generator.lyricsSearchNoText'

type LyricsSearchTranslate = (
  key: LyricsSearchTranslationKey,
  params?: Record<string, string | number>,
) => string

type UseLyricsSearchOptions = {
  project: Ref<KaraokeProject>
  selectedLineId: Ref<string | undefined>
  selectedSegmentId: Ref<string | undefined>
  syncError: Ref<string | undefined>
  clearUndoStack: () => void
  initializeTimelineIfPossible: (force?: boolean) => void
  onProjectInput: () => void
  t: LyricsSearchTranslate
}

export function useLyricsSearch({
  project,
  selectedLineId,
  selectedSegmentId,
  syncError,
  clearUndoStack,
  initializeTimelineIfPossible,
  onProjectInput,
  t,
}: UseLyricsSearchOptions) {
  const lyricsQuery = ref('')
  const lyricsResults = ref<LyricsSearchResult[]>([])
  const lyricsSearchState = ref<'idle' | 'loading' | 'error'>('idle')
  const lyricsSearchError = ref('')

  function formatSeconds(seconds?: number): string {
    if (!seconds) {
      return ''
    }

    const total = Math.round(seconds)

    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  }

  async function searchOnlineLyrics() {
    const query = lyricsQuery.value.trim()

    if (!query || lyricsSearchState.value === 'loading') {
      return
    }

    lyricsSearchState.value = 'loading'
    lyricsSearchError.value = ''
    lyricsResults.value = []

    try {
      lyricsResults.value = await searchLyrics(query)
      lyricsSearchState.value = 'idle'

      if (lyricsResults.value.length === 0) {
        lyricsSearchError.value = t('generator.lyricsSearchEmpty')
      }
    } catch (error) {
      lyricsSearchState.value = 'error'
      lyricsSearchError.value = t('generator.lyricsSearchError', {
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  function loadSearchedLyrics(event: Event) {
    const id = Number((event.target as HTMLSelectElement).value)
    const result = lyricsResults.value.find((item) => item.id === id)

    if (!result) {
      return
    }

    const plain = resultPlainLyrics(result)

    if (!plain.trim()) {
      lyricsSearchError.value = t('generator.lyricsSearchNoText')
      return
    }

    project.value.lyricsFileName = `${result.artistName} — ${result.trackName}`
    project.value.draftLines = parsePlainLyrics(plain)

    if (!project.value.title) {
      project.value.title = result.trackName
    }

    if (!project.value.artist) {
      project.value.artist = result.artistName
    }

    selectedLineId.value = project.value.draftLines[0]?.id
    selectedSegmentId.value = project.value.draftLines[0]?.segments[0]?.id
    clearUndoStack()
    initializeTimelineIfPossible(true)
    syncError.value = undefined
    lyricsSearchError.value = ''
    onProjectInput()
  }

  return {
    lyricsQuery,
    lyricsResults,
    lyricsSearchState,
    lyricsSearchError,
    formatSeconds,
    searchOnlineLyrics,
    loadSearchedLyrics,
  }
}
