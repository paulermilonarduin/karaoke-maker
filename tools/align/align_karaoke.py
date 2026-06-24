#!/usr/bin/env python3
"""Forced alignment for Karaoke Maker.

Given an audio file and the *known* lyrics (no timestamps), this script:

1. optionally isolates the vocals with Demucs (better alignment on sung music);
2. runs WhisperX forced alignment of the known words against the audio;
3. prints a minimal word-timing JSON to stdout.

The output is intentionally *minimal* and stays format-agnostic: it only carries
per-word timings indexed against the input word list. Assembling the canonical
``*.karaoke.json`` (lines, segments, bridges, validation) is the responsibility
of the TypeScript side, which owns the format. This keeps a single source of
truth for the karaoke schema and avoids duplicating that logic in Python.

Input
-----
The ordered list of words to align is read either from:
  * stdin, as a JSON array of strings (this is what the Electron app sends), or
  * ``--lyrics-file`` (raw ``.txt``), tokenized here (standalone/debug usage).

Output (stdout, JSON)
---------------------
    {
      "durationMs": 96012,
      "words": [
        { "index": 0, "startMs": 20081, "endMs": 20282, "score": 0.91 },
        { "index": 1, "startMs": null,  "endMs": null,  "score": null }
      ]
    }

``startMs`` / ``endMs`` may be ``null`` when a word could not be aligned; the
TypeScript side interpolates those. Progress and diagnostics are written to
stderr so stdout stays a clean JSON document.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

SAMPLE_RATE = 16000

# Lightweight default alignment models: torchaudio base bundles (~360 MB each),
# instead of the large XLSR HuggingFace models WhisperX picks by default (the
# French one is ~1.2 GB). Forced alignment of *known* lyrics does not need a
# top-tier ASR model, so the base bundles are a good size/quality trade-off.
LIGHT_ALIGN_MODELS = {
    "fr": "VOXPOPULI_ASR_BASE_10K_FR",
    "en": "WAV2VEC2_ASR_BASE_960H",
    "de": "VOXPOPULI_ASR_BASE_10K_DE",
    "es": "VOXPOPULI_ASR_BASE_10K_ES",
    "it": "VOXPOPULI_ASR_BASE_10K_IT",
}

BRIDGE_MARKER = re.compile(r"^\[(bridge|instrumental|break|pause)\]$", re.IGNORECASE)
WORD_PATTERN = re.compile(r"\S+")
NORMALIZE_PATTERN = re.compile(r"[^0-9a-zàâäçéèêëîïôöùûüÿœæ]+", re.IGNORECASE)


def log(message: str) -> None:
    """Write a progress line to stderr (stdout is reserved for the JSON result)."""
    print(message, file=sys.stderr, flush=True)


@dataclass
class WordTiming:
    index: int
    start_ms: int | None
    end_ms: int | None
    score: float | None


def tokenize_lyrics(text: str) -> list[str]:
    """Split raw lyrics into ordered words, mirroring the TypeScript tokenizer.

    Lines that are bridge markers (``[bridge]``, ``[instrumental]``, ``[break]``,
    ``[pause]``) carry no words and are skipped, exactly like ``parsePlainLyrics``.
    """
    words: list[str] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()

        if not line or BRIDGE_MARKER.match(line):
            continue

        words.extend(WORD_PATTERN.findall(line))

    return words


def read_input_words(args: argparse.Namespace) -> list[str]:
    if args.lyrics_file:
        text = Path(args.lyrics_file).read_text(encoding="utf-8")
        return tokenize_lyrics(text)

    raw = sys.stdin.read()

    if not raw.strip():
        raise ValueError("No words provided on stdin and no --lyrics-file given.")

    words = json.loads(raw)

    if not isinstance(words, list) or not all(isinstance(word, str) for word in words):
        raise ValueError("stdin must contain a JSON array of strings.")

    return words


def separate_vocals(audio_path: Path, model: str, device: str, work_dir: Path) -> Path:
    """Run Demucs to isolate the vocal stem and return the path to ``vocals.wav``."""
    log(f"PROGRESS: separating vocals with Demucs ({model})…")

    command = [
        sys.executable,
        "-m",
        "demucs",
        "--two-stems=vocals",
        "-n",
        model,
        "-d",
        device,
        "-o",
        str(work_dir),
        str(audio_path),
    ]

    # Capture *all* of Demucs' output (it writes its banner to stdout): our own
    # stdout must stay a clean JSON document for the caller to parse.
    completed = subprocess.run(
        command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    if completed.returncode != 0:
        tail = " | ".join((completed.stdout or "").strip().splitlines()[-5:])
        raise RuntimeError(f"Demucs failed (exit {completed.returncode}): {tail}")

    candidates = sorted(work_dir.glob("**/vocals.wav"))

    if not candidates:
        raise RuntimeError("Demucs did not produce a vocals stem.")

    log("PROGRESS: vocals isolated.")

    return candidates[0]


def normalize_token(word: str) -> str:
    return NORMALIZE_PATTERN.sub("", word).lower()


def to_ms(value: object) -> int | None:
    if value is None:
        return None

    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None

    if number != number:  # NaN guard
        return None

    return max(0, round(number * 1000))


def map_aligned_words(
    expected: list[str],
    aligned: list[dict],
) -> list[WordTiming]:
    """Map WhisperX word segments back onto the expected word list, in order.

    The fast path is a 1:1 index mapping (WhisperX usually returns exactly the
    words we fed it). When counts diverge — a word dropped or split — we fall
    back to a sequence alignment on normalized tokens and copy timings across
    matching runs, leaving the rest ``None`` for the caller to interpolate.
    """
    if len(aligned) == len(expected):
        return [
            WordTiming(
                index=index,
                start_ms=to_ms(item.get("start")),
                end_ms=to_ms(item.get("end")),
                score=_score(item.get("score")),
            )
            for index, item in enumerate(aligned)
        ]

    log(
        "PROGRESS: word count mismatch "
        f"(expected {len(expected)}, aligned {len(aligned)}); "
        "falling back to sequence matching."
    )

    timings = [WordTiming(index=i, start_ms=None, end_ms=None, score=None) for i in range(len(expected))]
    expected_norm = [normalize_token(word) for word in expected]
    aligned_norm = [normalize_token(str(item.get("word", ""))) for item in aligned]
    matcher = SequenceMatcher(a=expected_norm, b=aligned_norm, autojunk=False)

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag != "equal":
            continue

        for offset in range(i2 - i1):
            item = aligned[j1 + offset]
            timings[i1 + offset] = WordTiming(
                index=i1 + offset,
                start_ms=to_ms(item.get("start")),
                end_ms=to_ms(item.get("end")),
                score=_score(item.get("score")),
            )

    return timings


def _score(value: object) -> float | None:
    if value is None:
        return None

    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None

    return None if number != number else round(number, 4)


def transcribe_segments(audio, language: str, device: str, asr_model: str) -> list[dict]:
    """Run Whisper ASR to obtain short, locally time-bounded segments.

    These segments are a *time scaffold*: forced alignment of a whole long track
    in one pass drifts (errors accumulate), whereas aligning the short segments
    Whisper carves out cannot drift across the song. Whisper is also multilingual,
    so it anchors code-switched lines (e.g. an English hook) that a single-language
    align model would miss. The recognized text itself is imperfect and is only
    used to anchor the known lyrics in time, never as the final words.
    """
    import whisperx

    # ctranslate2 (faster-whisper) runs on CPU or CUDA, not MPS.
    asr_device = device if device == "cuda" else "cpu"
    compute_type = "float16" if asr_device == "cuda" else "int8"

    log(f"PROGRESS: transcribing for time anchors ('{asr_model}', {asr_device})…")
    # silero VAD avoids the gated pyannote model (no Hugging Face token needed).
    model = whisperx.load_model(
        asr_model,
        asr_device,
        compute_type=compute_type,
        language=language,
        vad_method="silero",
    )
    result = model.transcribe(audio, language=language, batch_size=16)
    segments = result.get("segments", [])
    log(f"PROGRESS: ASR produced {len(segments)} segments.")

    return segments


def align(
    audio_path: Path,
    words: list[str],
    language: str,
    device: str,
    model_name: str | None,
    use_asr: bool,
    asr_model: str,
) -> tuple[int, list[WordTiming]]:
    import whisperx  # imported lazily so --help works without the heavy deps

    log("PROGRESS: loading audio…")
    audio = whisperx.load_audio(str(audio_path))
    duration_ms = round(len(audio) / SAMPLE_RATE * 1000)

    resolved_model = model_name or LIGHT_ALIGN_MODELS.get(language)

    if resolved_model:
        log(f"PROGRESS: loading alignment model '{resolved_model}'…")
        align_model, metadata = whisperx.load_align_model(
            language_code=language, device=device, model_name=resolved_model
        )
    else:
        log(f"PROGRESS: loading default alignment model for '{language}'…")
        align_model, metadata = whisperx.load_align_model(language_code=language, device=device)

    if use_asr:
        # Align the short ASR segments (drift-free), then map the known lyrics
        # onto the resulting word timestamps below.
        segments = transcribe_segments(audio, language, device, asr_model)

        if not segments:
            raise RuntimeError("ASR produced no segments; the vocals may be empty.")
    else:
        # Legacy mode: align the whole known text as one segment. Fine for short,
        # clearly-sung tracks; drifts on long or dense ones.
        segments = [{"start": 0.0, "end": duration_ms / 1000, "text": " ".join(words)}]

    log("PROGRESS: aligning words…")
    result = whisperx.align(
        segments,
        align_model,
        metadata,
        audio,
        device,
        return_char_alignments=False,
    )

    # In ASR mode the aligned words are the *recognized* ones; map_aligned_words
    # transfers their timings onto our known words by sequence matching, leaving
    # gaps as None for the TypeScript merge to interpolate locally.
    aligned_words = result.get("word_segments", [])
    timings = map_aligned_words(words, aligned_words)

    return duration_ms, timings


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Forced alignment for Karaoke Maker.")
    parser.add_argument("--audio", required=True, help="Path to the audio file (mp3/wav).")
    parser.add_argument("--language", default="fr", help="Lyrics language code (default: fr).")
    parser.add_argument(
        "--device",
        default="cpu",
        help="Torch device for WhisperX and Demucs (cpu, mps, cuda). Default: cpu.",
    )
    parser.add_argument(
        "--lyrics-file",
        help="Raw lyrics .txt; tokenized here. If omitted, words are read from stdin as a JSON array.",
    )
    parser.add_argument(
        "--align-model",
        default=None,
        help=(
            "Override the alignment model (torchaudio bundle name or HF model id). "
            "Defaults to a light base model per language (see LIGHT_ALIGN_MODELS); "
            "pass e.g. jonatasgrosman/wav2vec2-large-xlsr-53-french for max precision."
        ),
    )
    parser.add_argument(
        "--no-demucs",
        action="store_true",
        help="Skip vocal separation and align on the raw mix.",
    )
    parser.add_argument(
        "--asr",
        action="store_true",
        help=(
            "Experimental: anchor on Whisper ASR segments instead of aligning the "
            "whole text as one segment. May help on long non-repetitive tracks, but "
            "misfires on songs with repeated choruses (sequence matching confuses "
            "the repeats). Off by default."
        ),
    )
    parser.add_argument(
        "--asr-model",
        default="small",
        help="Whisper model for ASR anchoring (tiny, base, small, medium…). Default: small.",
    )
    parser.add_argument(
        "--demucs-model",
        default="htdemucs",
        help="Demucs model name (default: htdemucs).",
    )
    parser.add_argument(
        "--lead-ms",
        type=int,
        default=0,
        help=(
            "Shift every word timing earlier by this many ms (highlight lead / "
            "wav2vec2 onset-lag compensation). The Electron app applies its own "
            "lead at merge time and leaves this at 0."
        ),
    )
    parser.add_argument("--out", help="Write the JSON result to this file instead of stdout.")
    return parser


def main() -> int:
    args = build_parser().parse_args()

    # Keep the real stdout pristine for the JSON result: anything printed during
    # processing (by us or by a dependency) is diverted to stderr.
    real_stdout = sys.stdout
    sys.stdout = sys.stderr

    try:
        words = read_input_words(args)

        if not words:
            raise ValueError("The lyrics contain no words to align.")

        audio_path = Path(args.audio).expanduser().resolve()

        if not audio_path.is_file():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        with tempfile.TemporaryDirectory(prefix="karaoke-align-") as work_dir:
            alignment_audio = audio_path

            if not args.no_demucs:
                alignment_audio = separate_vocals(
                    audio_path, args.demucs_model, args.device, Path(work_dir)
                )

            duration_ms, timings = align(
                alignment_audio,
                words,
                args.language,
                args.device,
                args.align_model,
                args.asr,
                args.asr_model,
            )

        if args.lead_ms:
            lead = max(0, args.lead_ms)
            for timing in timings:
                if timing.start_ms is not None:
                    timing.start_ms = max(0, timing.start_ms - lead)
                if timing.end_ms is not None:
                    timing.end_ms = max(0, timing.end_ms - lead)

        payload = {
            "durationMs": duration_ms,
            "words": [
                {
                    "index": timing.index,
                    "startMs": timing.start_ms,
                    "endMs": timing.end_ms,
                    "score": timing.score,
                }
                for timing in timings
            ],
        }
    except Exception as error:  # noqa: BLE001 — surface any failure as a clean message
        log(f"ERROR: {error}")
        return 1
    finally:
        sys.stdout = real_stdout

    output = json.dumps(payload, ensure_ascii=False)

    if args.out:
        Path(args.out).write_text(output + "\n", encoding="utf-8")
        log(f"PROGRESS: wrote {args.out}")
    else:
        print(output)

    log("PROGRESS: done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
