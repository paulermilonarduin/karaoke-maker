import { app, BrowserWindow, ipcMain, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const devServerUrl = process.env.VITE_DEV_SERVER_URL

type AlignRequest = {
  audioBytes: ArrayBuffer
  audioFileName: string
  words: string[]
  language?: string
  device?: string
  useDemucs?: boolean
}

type AlignResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: string }

function extractJson(stdout: string): unknown | undefined {
  const trimmed = stdout.trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    // Fall back to the last line that looks like a JSON object, in case a
    // dependency printed a stray line to stdout before the result.
    const lines = trimmed.split(/\r?\n/).reverse()

    for (const line of lines) {
      const candidate = line.trim()

      if (candidate.startsWith('{') && candidate.endsWith('}')) {
        try {
          return JSON.parse(candidate)
        } catch {
          // keep scanning
        }
      }
    }

    return undefined
  }
}

function extractAlignmentError(stderr: string, code: number | null): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const errorLine = [...lines].reverse().find((line) => line.startsWith('ERROR:'))

  if (errorLine) {
    return errorLine.replace(/^ERROR:\s*/, '')
  }

  return stderr.trim() || `Alignment process exited with code ${code}.`
}

function resolvePythonPath(): string {
  if (process.env.KARAOKE_PYTHON) {
    return process.env.KARAOKE_PYTHON
  }

  const venvPython =
    process.platform === 'win32'
      ? join('tools', 'align', '.venv', 'Scripts', 'python.exe')
      : join('tools', 'align', '.venv', 'bin', 'python')

  return join(app.getAppPath(), venvPython)
}

async function runAlignment(
  event: IpcMainInvokeEvent,
  request: AlignRequest,
): Promise<AlignResponse> {
  const python = resolvePythonPath()
  const script = join(app.getAppPath(), 'tools', 'align', 'align_karaoke.py')

  if (!process.env.KARAOKE_PYTHON && !existsSync(python)) {
    return {
      ok: false,
      error: 'The alignment toolchain is not installed. Run `npm run align:setup` first.',
    }
  }

  const workDir = await mkdtemp(join(tmpdir(), 'karaoke-align-'))
  const extension = extname(request.audioFileName) || '.mp3'
  const audioPath = join(workDir, `input${extension}`)

  await writeFile(audioPath, Buffer.from(request.audioBytes))

  const args = [
    script,
    '--audio',
    audioPath,
    '--language',
    request.language ?? 'fr',
    '--device',
    request.device ?? 'cpu',
  ]

  if (request.useDemucs === false) {
    args.push('--no-demucs')
  }

  return new Promise<AlignResponse>((resolve) => {
    const child = spawn(python, args, {
      cwd: app.getAppPath(),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    })
    let stdout = ''
    let stderrTail = ''

    child.on('error', (error) => {
      void rm(workDir, { recursive: true, force: true })
      resolve({
        ok: false,
        error: `Unable to launch the alignment process (${python}): ${error.message}`,
      })
    })

    child.stdout.setEncoding('utf-8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })

    child.stderr.setEncoding('utf-8')
    child.stderr.on('data', (chunk: string) => {
      stderrTail = `${stderrTail}${chunk}`.slice(-2000)

      for (const line of chunk.split(/\r?\n/)) {
        const trimmed = line.trim()

        if (trimmed) {
          event.sender.send('align:progress', trimmed)
        }
      }
    })

    child.on('close', (code) => {
      void rm(workDir, { recursive: true, force: true })

      if (code !== 0) {
        resolve({
          ok: false,
          error: extractAlignmentError(stderrTail, code),
        })
        return
      }

      const parsed = extractJson(stdout)

      if (parsed === undefined) {
        resolve({ ok: false, error: 'The alignment process returned invalid JSON.' })
      } else {
        resolve({ ok: true, result: parsed })
      }
    })

    child.stdin.write(JSON.stringify(request.words))
    child.stdin.end()
  })
}

function registerAlignmentHandler() {
  ipcMain.handle('align:run', (event, request: AlignRequest) => runAlignment(event, request))
}

// Disk-backed catalog: lives in the repo sources so exported karaokés land next
// to their audio and show up in the Catalog without editing code. Works in dev;
// a packaged build would need a writable user folder instead.
type CatalogEntry = { id: string; title: string; karaokeContent: string; audioFileName: string }

type CatalogSaveRequest = {
  id: string
  karaokeJson: string
  audioBytes: ArrayBuffer
  audioFileName: string
}

function catalogDir(): string {
  return join(app.getAppPath(), 'src', 'assets', 'catalog')
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'karaoke'
}

async function listCatalog(): Promise<CatalogEntry[]> {
  const dir = catalogDir()

  if (!existsSync(dir)) {
    return []
  }

  const entries: CatalogEntry[] = []
  const folders = await readdir(dir, { withFileTypes: true })

  for (const folder of folders) {
    if (!folder.isDirectory()) {
      continue
    }

    const folderPath = join(dir, folder.name)
    const files = await readdir(folderPath)
    const karaokeFile = files.find((file) => file.endsWith('.karaoke.json'))

    if (!karaokeFile) {
      continue
    }

    let title = folder.name
    let audioFileName = ''
    let karaokeContent: string

    try {
      karaokeContent = await readFile(join(folderPath, karaokeFile), 'utf-8')
      const parsed = JSON.parse(karaokeContent) as {
        song?: { title?: unknown }
        audio?: { fileName?: unknown }
      }

      if (typeof parsed.song?.title === 'string') {
        title = parsed.song.title
      }

      if (typeof parsed.audio?.fileName === 'string') {
        audioFileName = parsed.audio.fileName
      }
    } catch {
      continue
    }

    if (!audioFileName || !existsSync(join(folderPath, audioFileName))) {
      const audio = files.find((file) => /\.(mp3|wav|m4a|ogg|flac)$/i.test(file))

      if (!audio) {
        continue
      }

      audioFileName = audio
    }

    entries.push({ id: folder.name, title, karaokeContent, audioFileName })
  }

  entries.sort((a, b) => a.title.localeCompare(b.title))

  return entries
}

async function readCatalogAudio(id: string, fileName: string): Promise<ArrayBuffer | null> {
  // basename() guards against path traversal in the IPC arguments.
  const filePath = join(catalogDir(), basename(id), basename(fileName))

  if (!existsSync(filePath)) {
    return null
  }

  const buffer = await readFile(filePath)

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

async function saveToCatalog(
  request: CatalogSaveRequest,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const id = slugify(request.id)
    const folder = join(catalogDir(), id)
    const audioName = basename(request.audioFileName) || 'audio.mp3'
    const base = audioName.replace(/\.[^.]+$/, '') || 'karaoke'

    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, audioName), Buffer.from(request.audioBytes))
    await writeFile(join(folder, `${base}.karaoke.json`), request.karaokeJson)

    return { ok: true, id }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

function registerCatalogHandlers() {
  ipcMain.handle('catalog:list', () => listCatalog())
  ipcMain.handle('catalog:readAudio', (_event, id: string, fileName: string) =>
    readCatalogAudio(id, fileName),
  )
  ipcMain.handle('catalog:save', (_event, request: CatalogSaveRequest) => saveToCatalog(request))
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Karaoke Maker',
    backgroundColor: '#f4f2ec',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(currentDirectory, 'preload.js'),
      sandbox: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
    return
  }

  void mainWindow.loadFile(join(currentDirectory, '../dist/index.html'))
}

app.whenReady().then(() => {
  registerAlignmentHandler()
  registerCatalogHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
