import { computed, ref, type Ref } from 'vue'
import type { DraftLyricLine, KaraokeProject } from '../domain/lyrics'

export type TimelineSnapshot = {
  draftLines: DraftLyricLine[]
  manualInterludeCount: number
  selectedLineId?: string
  selectedSegmentId?: string
  syncOffsetMs?: number
}

type UseTimelineUndoOptions = {
  project: Ref<KaraokeProject>
  manualInterludeCount: Ref<number>
  selectedLineId: Ref<string | undefined>
  selectedSegmentId: Ref<string | undefined>
  syncError: Ref<string | undefined>
  maxStackSize?: number
}

const defaultMaxStackSize = 50

export function cloneDraftLines(lines: DraftLyricLine[]): DraftLyricLine[] {
  return lines.map((line) => ({
    ...line,
    segments: line.segments.map((segment) => ({ ...segment })),
  }))
}

export function useTimelineUndo({
  project,
  manualInterludeCount,
  selectedLineId,
  selectedSegmentId,
  syncError,
  maxStackSize = defaultMaxStackSize,
}: UseTimelineUndoOptions) {
  const undoStack = ref<TimelineSnapshot[]>([])
  const redoStack = ref<TimelineSnapshot[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function createTimelineSnapshot(): TimelineSnapshot {
    return {
      draftLines: cloneDraftLines(project.value.draftLines),
      manualInterludeCount: manualInterludeCount.value,
      selectedLineId: selectedLineId.value,
      selectedSegmentId: selectedSegmentId.value,
      syncOffsetMs: project.value.syncOffsetMs,
    }
  }

  function restoreTimelineSnapshot(snapshot: TimelineSnapshot) {
    project.value.draftLines = cloneDraftLines(snapshot.draftLines)
    manualInterludeCount.value = snapshot.manualInterludeCount
    selectedLineId.value = snapshot.selectedLineId
    selectedSegmentId.value = snapshot.selectedSegmentId
    project.value.syncOffsetMs = snapshot.syncOffsetMs
    syncError.value = undefined
  }

  function pushUndoSnapshot() {
    undoStack.value = [
      ...undoStack.value.slice(-(maxStackSize - 1)),
      createTimelineSnapshot(),
    ]
    redoStack.value = []
  }

  function clearUndoStack() {
    undoStack.value = []
    redoStack.value = []
  }

  function undoLastChange() {
    const snapshot = undoStack.value.at(-1)

    if (!snapshot) {
      return
    }

    undoStack.value = undoStack.value.slice(0, -1)
    redoStack.value = [
      ...redoStack.value.slice(-(maxStackSize - 1)),
      createTimelineSnapshot(),
    ]
    restoreTimelineSnapshot(snapshot)
  }

  function redoLastChange() {
    const snapshot = redoStack.value.at(-1)

    if (!snapshot) {
      return
    }

    redoStack.value = redoStack.value.slice(0, -1)
    undoStack.value = [
      ...undoStack.value.slice(-(maxStackSize - 1)),
      createTimelineSnapshot(),
    ]
    restoreTimelineSnapshot(snapshot)
  }

  return {
    canUndo,
    canRedo,
    pushUndoSnapshot,
    clearUndoStack,
    undoLastChange,
    redoLastChange,
  }
}
