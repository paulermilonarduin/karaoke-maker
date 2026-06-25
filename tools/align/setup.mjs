// Opt-in installer for the optional forced-alignment toolchain.
// Creates a Python virtualenv in tools/align/.venv and installs the heavy
// dependencies (WhisperX, Demucs, torch). Nothing here runs during a normal
// `npm install` — run it explicitly with `npm run align:setup`.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const isWindows = process.platform === 'win32'
const venvDir = join(here, '.venv')
const basePython = process.env.PYTHON || (isWindows ? 'python' : 'python3')
const venvPython = isWindows
  ? join(venvDir, 'Scripts', 'python.exe')
  : join(venvDir, 'bin', 'python')

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

if (!existsSync(venvPython)) {
  console.log('Creating virtualenv in tools/align/.venv …')
  run(basePython, ['-m', 'venv', venvDir])
}

run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
run(venvPython, ['-m', 'pip', 'install', '-r', join(here, 'requirements.txt')])

console.log('\n✓ Alignment toolchain ready.')
console.log('  Launch the app with the feature unlocked:  npm run electron:dev:align')
console.log('  (ffmpeg must be on your PATH — e.g. `brew install ffmpeg`)')
