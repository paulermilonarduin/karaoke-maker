# Auto-alignment (forced alignment)

This folder holds the offline Python step that turns an audio file plus its
*known* lyrics (no timestamps) into per-word timings. The desktop app (Electron)
shells into it when you choose "guess the timing automatically"; you can also run
it standalone for debugging.

It does **not** produce the final `*.karaoke.json`. It returns a minimal,
format-agnostic word-timing JSON; the TypeScript side assembles the canonical
karaoke file (lines, segments, interludes, validation). That keeps a single source
of truth for the karaoke format.

## Pipeline

1. **Demucs** isolates the vocal stem (on by default — better on sung music).
2. **WhisperX** force-aligns the known words against the (vocal) audio.
3. Word timings are printed as JSON.

## Requirements

- Python 3.10+
- `ffmpeg` on your `PATH` (`brew install ffmpeg` on macOS)
- A virtualenv with the packages in `requirements.txt`

## Setup (optional, opt-in)

This toolchain is **not** installed by `npm install`. Install it only if you
need automatic alignment, from the project root:

```bash
npm run align:setup
```

That creates `tools/align/.venv` and installs the dependencies (WhisperX,
Demucs, torch). Then launch the app with the feature unlocked:

```bash
npm run electron:dev:align        # dev
npm run electron:preview:align    # packaged preview
```

A normal `npm run electron:dev` keeps the feature hidden, so day-to-day work is
unaffected and the ~GB of dependencies stay out of the way until you ask for them.

The first alignment run downloads the alignment model and the Demucs model.

<details>
<summary>Manual venv setup</summary>

```bash
cd tools/align
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```
</details>

> The Electron app looks for the interpreter at `tools/align/.venv/bin/python`
> by default. Override it with the `KARAOKE_PYTHON` environment variable if your
> venv lives elsewhere.

## Standalone usage

```bash
# Tokenize the lyrics here and print word timings:
python align_karaoke.py --audio song.mp3 --lyrics-file lyrics.txt

# Faster first pass without vocal separation:
python align_karaoke.py --audio song.mp3 --lyrics-file lyrics.txt --no-demucs

# Apple Silicon GPU (if available):
python align_karaoke.py --audio song.mp3 --lyrics-file lyrics.txt --device mps
```

When called by the app, the ordered word list is sent on **stdin** as a JSON
array of strings instead of `--lyrics-file`, so the tokenization stays
authoritative on the TypeScript side:

```bash
echo '["Le","serveur","Minecraft"]' | python align_karaoke.py --audio song.mp3
```

## Output

```json
{
  "durationMs": 96012,
  "words": [
    { "index": 0, "startMs": 20081, "endMs": 20282, "score": 0.91 },
    { "index": 1, "startMs": null, "endMs": null, "score": null }
  ]
}
```

`startMs`/`endMs` are `null` for words WhisperX could not place; the app
interpolates those. Progress lines are written to **stderr**.

## Options

| Flag | Default | Description |
| --- | --- | --- |
| `--audio PATH` | — | Audio file (required). |
| `--language CODE` | `fr` | Lyrics language for the alignment model. |
| `--align-model NAME` | light base model | Override the alignment model (torchaudio bundle or HF id). |
| `--device cpu\|mps\|cuda` | `cpu` | Torch device. |
| `--lyrics-file PATH` | — | Raw `.txt`; tokenized here. Otherwise words come from stdin. |
| `--no-demucs` | off | Align on the raw mix (skip vocal separation). |
| `--demucs-model NAME` | `htdemucs` | Demucs model. |
| `--out PATH` | stdout | Write the JSON result to a file. |

## Alignment models & sizes

Forced alignment of *known* lyrics does not need a top-tier ASR model, so the
script defaults to lightweight torchaudio **base** bundles (~360 MB each, cached
after the first run) rather than the large XLSR models WhisperX picks by default:

| Language | Default model | Size |
| --- | --- | --- |
| `fr` | `VOXPOPULI_ASR_BASE_10K_FR` | ~360 MB |
| `en` | `WAV2VEC2_ASR_BASE_960H` | ~360 MB |

For maximum precision, override with the large model:

```bash
python align_karaoke.py --audio song.mp3 --lyrics-file lyrics.txt \
  --align-model jonatasgrosman/wav2vec2-large-xlsr-53-french   # ~1.2 GB
```

The heavy Whisper *transcription* model is never downloaded — only the
alignment model is used.

## Notes / limitations

- Packaging a Python runtime into the Windows installer is out of scope for now;
  this step targets local desktop usage with a venv.
- Demucs on CPU is the slowest part (tens of seconds to a couple of minutes per
  track). Use `--device mps` on Apple Silicon to speed it up.
