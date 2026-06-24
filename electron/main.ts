import { app, BrowserWindow, ipcMain, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'
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
    const child = spawn(python, args, { cwd: app.getAppPath() })
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
          error: stderrTail.trim() || `Alignment process exited with code ${code}.`,
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
