// Opt-in installer for the optional forced-alignment toolchain.
// Creates a Python virtualenv in tools/align/.venv and installs the heavy
// dependencies (WhisperX, Demucs, torch). Nothing here runs during a normal
// npm install; run it explicitly with npm run align:setup.

import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const isWindows = process.platform === 'win32'
const venvDir = join(here, '.venv')
const venvPython = isWindows
  ? join(venvDir, 'Scripts', 'python.exe')
  : join(venvDir, 'bin', 'python')
const minimumPythonMinor = 10
const maximumPythonMinor = 13
const supportedPythonLabel = `Python 3.${minimumPythonMinor} to 3.${maximumPythonMinor}`

function runQuiet(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function pythonInfo(command, args = []) {
  const result = runQuiet(command, [
    ...args,
    '-c',
    'import json, sys; print(json.dumps({"major": sys.version_info.major, "minor": sys.version_info.minor, "micro": sys.version_info.micro, "executable": sys.executable}))',
  ])

  if (result.status !== 0 || result.error) {
    return undefined
  }

  try {
    return JSON.parse(result.stdout.trim())
  } catch {
    return undefined
  }
}

function isSupportedPython(info) {
  return (
    info?.major === 3 &&
    info.minor >= minimumPythonMinor &&
    info.minor <= maximumPythonMinor
  )
}

function formatPythonInfo(info) {
  if (!info) {
    return 'unknown Python'
  }

  return `Python ${info.major}.${info.minor}.${info.micro} (${info.executable})`
}

function candidateLabel(candidate) {
  return [candidate.command, ...candidate.args].join(' ')
}

function explicitPythonCandidate() {
  const explicit = process.env.KARAOKE_PYTHON || process.env.PYTHON

  return explicit ? { command: explicit, args: [], explicit: true } : undefined
}

function pythonCandidates() {
  const explicit = explicitPythonCandidate()

  if (explicit) {
    return [explicit]
  }

  if (isWindows) {
    return [
      { command: 'py', args: ['-3.13'] },
      { command: 'py', args: ['-3.12'] },
      { command: 'py', args: ['-3.11'] },
      { command: 'py', args: ['-3.10'] },
      { command: 'python', args: [] },
    ]
  }

  return [
    { command: 'python3.13', args: [] },
    { command: 'python3.12', args: [] },
    { command: 'python3.11', args: [] },
    { command: 'python3.10', args: [] },
    { command: 'python3', args: [] },
    { command: 'python', args: [] },
  ]
}

function failUnsupportedPython(found = []) {
  console.error(`\nThe alignment toolchain requires ${supportedPythonLabel}.`)
  console.error('WhisperX and the pinned torch stack do not currently support Python 3.14.')

  if (found.length > 0) {
    console.error('\nDetected interpreters:')

    for (const { candidate, info } of found) {
      console.error(`- ${candidateLabel(candidate)} -> ${formatPythonInfo(info)}`)
    }
  }

  console.error('\nInstall a supported Python, then rerun npm run align:setup.')

  if (isWindows) {
    console.error('Suggested Windows command: winget install Python.Python.3.13')
  } else {
    console.error('Suggested macOS command: brew install python@3.13')
  }

  console.error('\nYou can also point to a custom interpreter with KARAOKE_PYTHON or PYTHON.')
  process.exit(1)
}

function resolveBasePython() {
  const found = []

  for (const candidate of pythonCandidates()) {
    const info = pythonInfo(candidate.command, candidate.args)

    if (!info) {
      continue
    }

    found.push({ candidate, info })

    if (isSupportedPython(info)) {
      return candidate
    }

    if (candidate.explicit) {
      failUnsupportedPython(found)
    }
  }

  failUnsupportedPython(found)
}

function run(command, args) {
  console.log(`> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.error) {
    console.error(`\nFailed to start "${command}": ${result.error.message}`)
    process.exit(1)
  }

  if (result.status !== 0) {
    console.error(`\nCommand failed (exit ${result.status}): ${command} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

function createVenv(candidate) {
  console.log('Creating virtualenv in tools/align/.venv...')
  run(candidate.command, [...candidate.args, '-m', 'venv', venvDir])
}

function recreateVenv(candidate) {
  rmSync(venvDir, { recursive: true, force: true })
  createVenv(candidate)
}

const venvInfo = existsSync(venvPython) ? pythonInfo(venvPython) : undefined

if (venvInfo && !isSupportedPython(venvInfo)) {
  console.warn(`Existing alignment virtualenv uses ${formatPythonInfo(venvInfo)}.`)
  console.warn(`Recreating it with ${supportedPythonLabel}.`)
  recreateVenv(resolveBasePython())
} else if (!existsSync(venvPython)) {
  if (existsSync(venvDir)) {
    console.warn('Existing alignment virtualenv is incomplete. Recreating it.')
  }

  recreateVenv(resolveBasePython())
}

run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
run(venvPython, ['-m', 'pip', 'install', '-r', join(here, 'requirements.txt')])

console.log('\nAlignment toolchain ready.')
console.log('  Launch the app with the feature unlocked: npm run electron:dev:align')
console.log('  ffmpeg must be on your PATH.')
