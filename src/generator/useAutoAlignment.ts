import { computed, ref, watch, type Ref } from 'vue'
import {
  applyWordAlignment,
  collectLyricWords,
  type AlignmentResult,
  type KaraokeProject,
} from '../domain/lyrics'
import {
  isAlignmentAvailable,
  onAlignmentProgress,
  requestAlignment,
} from '../desktop/bridge'
import type { Locale } from '../i18n'

type AutoAlignmentTranslationKey =
  | 'generator.autoFailed'
  | 'generator.autoNoWords'
  | 'generator.autoStarting'

type AutoAlignmentTranslate = (key: AutoAlignmentTranslationKey) => string

type UseAutoAlignmentOptions = {
  project: Ref<KaraokeProject>
  audioFile: Ref<File | undefined>
  audioDurationMs: Ref<number | undefined>
  selectedLineId: Ref<string | undefined>
  selectedSegmentId: Ref<string | undefined>
  syncError: Ref<string | undefined>
  defaultLanguage: Locale
  pushUndoSnapshot: () => void
  t: AutoAlignmentTranslate
}

export function useAutoAlignment({
  project,
  audioFile,
  audioDurationMs,
  selectedLineId,
  selectedSegmentId,
  syncError,
  defaultLanguage,
  pushUndoSnapshot,
  t,
}: UseAutoAlignmentOptions) {
  const autoAlignAvailable = isAlignmentAvailable()
  const autoAlignState = ref<'idle' | 'running' | 'error' | 'done'>('idle')
  const autoAlignProgress = ref('')
  const autoAlignError = ref('')
  const autoAlignDismissed = ref(false)
  const autoAlignResult = ref<AlignmentResult | null>(null)
  const leadMs = ref(180)
  const songLanguage = ref<Locale>(defaultLanguage)

  const showAutoAlign = computed(
    () =>
      autoAlignAvailable &&
      !!audioFile.value &&
      project.value.draftLines.length > 0 &&
      !autoAlignDismissed.value,
  )

  function resetAutoAlign() {
    autoAlignState.value = 'idle'
    autoAlignProgress.value = ''
    autoAlignError.value = ''
    autoAlignDismissed.value = false
    autoAlignResult.value = null
  }

  function applyAlignmentResult(recordUndo = false) {
    const result = autoAlignResult.value

    if (!result) {
      return
    }

    if (recordUndo) {
      pushUndoSnapshot()
    }

    const durationMs = audioDurationMs.value ?? result.durationMs

    project.value.draftLines = applyWordAlignment(
      project.value.draftLines,
      result.words,
      durationMs,
      leadMs.value,
    )
    audioDurationMs.value = durationMs
    selectedLineId.value = project.value.draftLines[0]?.id
    selectedSegmentId.value = project.value.draftLines[0]?.segments[0]?.id
    syncError.value = undefined
  }

  async function runAutoAlignment() {
    if (!audioFile.value || autoAlignState.value === 'running') {
      return
    }

    const words = collectLyricWords(project.value.draftLines)

    if (words.length === 0) {
      autoAlignState.value = 'error'
      autoAlignError.value = t('generator.autoNoWords')
      return
    }

    autoAlignState.value = 'running'
    autoAlignProgress.value = t('generator.autoStarting')
    autoAlignError.value = ''

    const unsubscribe = onAlignmentProgress((line) => {
      autoAlignProgress.value = line.replace(/^(PROGRESS|ERROR):\s*/, '')
    })

    try {
      const result = await requestAlignment({
        audioBytes: await audioFile.value.arrayBuffer(),
        audioFileName: audioFile.value.name,
        words,
        language: songLanguage.value,
        device: 'cpu',
        useDemucs: true,
      })

      autoAlignResult.value = result
      applyAlignmentResult(true)
      autoAlignState.value = 'done'
    } catch (error) {
      autoAlignState.value = 'error'
      autoAlignError.value = error instanceof Error ? error.message : t('generator.autoFailed')
    } finally {
      unsubscribe()
      autoAlignProgress.value = ''
    }
  }

  function dismissAutoAlign() {
    autoAlignDismissed.value = true
    autoAlignState.value = 'idle'
    autoAlignError.value = ''
  }

  watch(leadMs, () => {
    if (autoAlignResult.value) {
      applyAlignmentResult()
    }
  })

  return {
    autoAlignAvailable,
    autoAlignState,
    autoAlignProgress,
    autoAlignError,
    leadMs,
    songLanguage,
    showAutoAlign,
    resetAutoAlign,
    runAutoAlignment,
    dismissAutoAlign,
  }
}
