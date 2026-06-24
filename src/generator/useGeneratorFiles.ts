import type { ComputedRef, Ref } from 'vue'
import {
  createKaraokeFile,
  isInterludeLine,
  parseKaraokeFile,
  parsePlainLyrics,
  serializeKaraokeFile,
  type KaraokeProject,
  type LyricLine,
} from '../domain/lyrics'

type GeneratorFileTranslationKey = 'generator.error.importJson' | 'generator.error.export'

type GeneratorFileTranslate = (key: GeneratorFileTranslationKey) => string

type UseGeneratorFilesOptions = {
  project: Ref<KaraokeProject>
  audioUrl: Ref<string | undefined>
  currentTimeMs: Ref<number>
  audioDurationMs: Ref<number | undefined>
  selectedLineId: Ref<string | undefined>
  selectedSegmentId: Ref<string | undefined>
  syncError: Ref<string | undefined>
  syncedLines: ComputedRef<LyricLine[]>
  clearUndoStack: () => void
  initializeTimelineIfPossible: (force?: boolean) => void
  t: GeneratorFileTranslate
}

export function useGeneratorFiles({
  project,
  audioUrl,
  currentTimeMs,
  audioDurationMs,
  selectedLineId,
  selectedSegmentId,
  syncError,
  syncedLines,
  clearUndoStack,
  initializeTimelineIfPossible,
  t,
}: UseGeneratorFilesOptions) {
  function revokeAudioUrl() {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = undefined
    }
  }

  function loadKaraokeContent(content: string, fileName?: string) {
    const karaokeFile = parseKaraokeFile(content)

    project.value = {
      title: karaokeFile.song.title,
      artist: karaokeFile.song.artist,
      audioFileName: karaokeFile.audio.fileName,
      karaokeFileName: fileName,
      syncOffsetMs: karaokeFile.sync?.offsetMs ?? 0,
      draftLines: karaokeFile.lines.map((line) => ({
        id: line.id,
        kind: line.kind,
        text: line.text,
        startMs: line.startMs,
        endMs: line.endMs,
        segments: isInterludeLine(line)
          ? []
          : (line.segments ?? []).map((segment) => ({ ...segment })),
      })),
    }
    audioDurationMs.value = karaokeFile.song.durationMs
    selectedLineId.value = project.value.draftLines[0]?.id
    selectedSegmentId.value = project.value.draftLines[0]?.segments[0]?.id
    clearUndoStack()
    syncError.value = undefined
  }

  function onAudioFile(file: File) {
    revokeAudioUrl()
    audioUrl.value = URL.createObjectURL(file)
    currentTimeMs.value = 0
    audioDurationMs.value = undefined
    syncError.value = undefined
    clearUndoStack()
    project.value.audioFileName = file.name

    if (!project.value.title) {
      project.value.title = file.name.replace(/\.[^.]+$/, '')
    }
  }

  async function onLyricsFile(file: File) {
    const content = await file.text()

    project.value.lyricsFileName = file.name
    project.value.draftLines = parsePlainLyrics(content)
    selectedLineId.value = project.value.draftLines[0]?.id
    selectedSegmentId.value = project.value.draftLines[0]?.segments[0]?.id
    clearUndoStack()
    initializeTimelineIfPossible(true)
    syncError.value = undefined
  }

  async function onKaraokeFile(file: File) {
    try {
      loadKaraokeContent(await file.text(), file.name)
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : t('generator.error.importJson')
    }
  }

  function onDurationChange(durationMs: number) {
    if (audioDurationMs.value !== undefined && project.value.draftLines.length > 0) {
      initializeTimelineIfPossible()
      return
    }

    audioDurationMs.value = durationMs
    initializeTimelineIfPossible()
  }

  function downloadKaraokeFile() {
    if (audioDurationMs.value === undefined) {
      return
    }

    try {
      const karaokeFile = createKaraokeFile(
        project.value,
        syncedLines.value,
        audioDurationMs.value,
      )
      const content = serializeKaraokeFile(karaokeFile)
      const fileName = `${project.value.title || 'karaoke'}.karaoke.json`
      const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
      syncError.value = undefined
    } catch (error) {
      syncError.value = error instanceof Error ? error.message : t('generator.error.export')
    }
  }

  return {
    revokeAudioUrl,
    loadKaraokeContent,
    onAudioFile,
    onLyricsFile,
    onKaraokeFile,
    onDurationChange,
    downloadKaraokeFile,
  }
}
