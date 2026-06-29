import type { KaraokeProject } from '../domain/lyrics'
import {
  listSavedProjects as listDesktopProjects,
  loadSavedProject as loadDesktopProject,
  saveCurrentProject as saveDesktopProject,
  type SavedProjectSummary,
} from '../desktop/bridge'

export type ProjectDocument = {
  version: 1
  id: string
  createdAt: string
  updatedAt: string
  project: KaraokeProject
  audioDurationMs?: number
  audioFileName: string
  audioMimeType: string
  manualInterludeCount: number
}

export type LoadedProject = {
  document: ProjectDocument
  audioFile: File
}

type BrowserProjectRecord = {
  document: ProjectDocument
  audioBytes: ArrayBuffer
}

const databaseName = 'karaoke-maker'
const databaseVersion = 1
const projectStoreName = 'projects'

function openProjectDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(projectStoreName)) {
        database.createObjectStore(projectStoreName, { keyPath: 'document.id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runBrowserRequest<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openProjectDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(projectStoreName, mode)
        const request = action(transaction.objectStore(projectStoreName))

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => database.close()
        transaction.onerror = () => reject(transaction.error)
      }),
  )
}

function createProjectId(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'project'}-${crypto.randomUUID().slice(0, 8)}`
}

function toSummary(document: ProjectDocument): SavedProjectSummary {
  return {
    id: document.id,
    title: document.project.title,
    artist: document.project.artist,
    audioFileName: document.audioFileName,
    updatedAt: document.updatedAt,
  }
}

function cloneProject(project: KaraokeProject): KaraokeProject {
  return {
    ...project,
    draftLines: project.draftLines.map((line) => ({
      ...line,
      segments: line.segments.map((segment) => ({ ...segment })),
    })),
  }
}

export async function listProjects(): Promise<SavedProjectSummary[]> {
  if (window.karaokeMaker?.listProjects) {
    return listDesktopProjects()
  }

  const records = await runBrowserRequest<BrowserProjectRecord[]>('readonly', (store) =>
    store.getAll(),
  )

  return records
    .map(({ document }) => toSummary(document))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function saveProject(
  currentId: string | undefined,
  project: KaraokeProject,
  audioFile: File,
  audioDurationMs: number | undefined,
  manualInterludeCount: number,
): Promise<ProjectDocument> {
  const now = new Date().toISOString()
  const id = currentId ?? createProjectId(project.title)
  const existing = currentId ? await loadProject(currentId).catch(() => undefined) : undefined
  const document: ProjectDocument = {
    version: 1,
    id,
    createdAt: existing?.document.createdAt ?? now,
    updatedAt: now,
    project: cloneProject(project),
    audioDurationMs,
    audioFileName: audioFile.name,
    audioMimeType: audioFile.type || 'audio/mpeg',
    manualInterludeCount,
  }
  const audioBytes = await audioFile.arrayBuffer()

  if (window.karaokeMaker?.saveProject) {
    const savedDocument = await saveDesktopProject({ document, audioBytes })

    return savedDocument as ProjectDocument
  }

  await runBrowserRequest('readwrite', (store) =>
    store.put({ document, audioBytes } satisfies BrowserProjectRecord),
  )

  return document
}

export async function loadProject(id: string): Promise<LoadedProject> {
  if (window.karaokeMaker?.loadProject) {
    const saved = await loadDesktopProject(id)
    const document = saved.document as ProjectDocument

    return {
      document,
      audioFile: new File([saved.audioBytes], document.audioFileName, {
        type: document.audioMimeType,
      }),
    }
  }

  const record = await runBrowserRequest<BrowserProjectRecord | undefined>('readonly', (store) =>
    store.get(id),
  )

  if (!record) {
    throw new Error('Project not found.')
  }

  return {
    document: record.document,
    audioFile: new File([record.audioBytes], record.document.audioFileName, {
      type: record.document.audioMimeType,
    }),
  }
}
