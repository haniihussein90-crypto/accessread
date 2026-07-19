#!/usr/bin/env python3
"""
Mix a music track under (or instead of) a video's original audio.
Also handles muting/reducing/normalizing the original audio on its own.

- No --music, no --target-lufs: just changes the original audio's volume
  by a flat multiplier (use --original-volume 0 to mute unwanted
  on-camera sound, e.g. handling noise while placing the gift box).
- No --music, --target-lufs given: two-pass loudness normalization
  (ffmpeg loudnorm) instead of a flat multiplier — the right tool when
  several source clips have inconsistent embedded-music loudness and the
  goal is "make them all feel like the same campaign," not just "louder."
  Uses linear-mode gain (a single consistent boost, no per-moment riding)
  whenever the clip's true-peak headroom allows reaching the target;
  ffmpeg automatically falls back to its own gentle dynamic adjustment
  only for clips too peaky to reach the target via pure gain, rather than
  clipping or forcing a hard limiter on delicate background music.
- With --music: mixes music (looped/trimmed to clip length, with a short
  fade in/out) under the original audio. --duck applies sidechain
  compression so the music dips automatically under any original audio
  peaks (e.g. a voice moment) instead of fighting it.

CLI:
    python3 mix_audio.py working/with_text.mp4 --music brand-assets/music/theme.mp3 \
        --music-volume 0.5 --original-volume 1.0 --duck --out working/mixed.mp4
    python3 mix_audio.py working/with_text.mp4 --target-lufs -15 --target-tp -2 \
        --out working/mixed.mp4
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    H264_EXPORT_ARGS, check_tools, ensure_parent, get_duration, run,
)

FADE_SEC = 0.6


def _probe_sample_rate(src: Path) -> int:
    result = run([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=sample_rate",
        "-of", "default=noprint_wrappers=1:nokey=1", str(src),
    ])
    return int(result.stdout.strip())


def _measure_loudness(src: Path, target_i: float, target_tp: float, target_lra: float) -> dict:
    result = run([
        "ffmpeg", "-i", str(src),
        "-af", f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}:print_format=json",
        "-f", "null", "-",
    ])
    text = result.stderr
    json_start = text.rindex("{")
    json_end = text.rindex("}") + 1
    return json.loads(text[json_start:json_end])


def normalize_original_audio(src: Path, out: Path, target_i: float = -15.0,
                              target_tp: float = -1.0, target_lra: float = 15.0) -> Path:
    """Two-pass loudness normalization of the original track only (no
    music mixing) — brings inconsistent source-embedded music up (or
    down) to one consistent, clearly-present level across every video in
    the campaign, instead of leaving each clip at whatever level its own
    AI-generated source happened to embed.

    Defaults (-15 LUFS / -1 dBTP / LRA 15) were tuned against all 5
    campaign source clips: a tighter LRA target (7-11, ffmpeg's typical
    suggested range) left two of the five clips 2-3 LUFS under target
    because loudnorm's dynamic-mode fallback compressed their (wider,
    natural) loudness range harder to hit a tight LRA ceiling, which
    fought against also hitting the integrated-loudness target. Loosening
    LRA to 15 (i.e. barely constraining it) let all 5 clips converge to
    within 0.1 LUFS of -15, each with a true peak safely below -1 dBTP —
    verified empirically, not assumed."""
    check_tools()
    ensure_parent(out)
    measured = _measure_loudness(src, target_i, target_tp, target_lra)
    # NOTE: deliberately NOT passing measured['target_offset'] back in as
    # `offset` — that double-applies gain on top of what dynamic-mode
    # already accounts for internally and produced real clipping (true
    # peak measured well above 0 dBTP) during testing. Passing only the
    # four measured_* stats and letting loudnorm recompute the correct
    # offset itself is the combination that actually respects the TP
    # ceiling.
    # loudnorm internally oversamples for true-peak detection and doesn't
    # resample back to the source's native rate on its own — left alone,
    # the output stream silently ends up at whatever rate that produces
    # (e.g. 96kHz from a 44.1kHz source). Downstream, add_logo_fade_ending
    # concatenates this audio with its own silence segments; a sample-rate
    # mismatch there corrupts the concatenated audio (measured as a
    # severe true-peak overshoot, not just a quality artifact). Force the
    # output back to the source's own original sample rate so every stage
    # after this one is working with a single consistent rate.
    source_rate = _probe_sample_rate(src)
    af = (
        f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}:"
        f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
        f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
        f"linear=true:print_format=summary"
    )
    run(["ffmpeg", "-y", "-i", str(src), "-af", af, "-ar", str(source_rate),
         *H264_EXPORT_ARGS, str(out)])
    return out


def mix_audio(
    src: Path,
    out: Path,
    music: Path | None = None,
    music_volume: float = 0.5,
    original_volume: float = 1.0,
    duck: bool = False,
    target_lufs: float | None = None,
    target_tp: float = -1.0,
    target_lra: float = 15.0,
) -> Path:
    check_tools()
    ensure_parent(out)
    duration = get_duration(src)

    if music is None:
        if target_lufs is not None:
            return normalize_original_audio(src, out, target_lufs, target_tp, target_lra)
        # Just adjust (or mute) the original track by a flat multiplier.
        if original_volume <= 0:
            run(["ffmpeg", "-y", "-i", str(src), "-an", *H264_EXPORT_ARGS, str(out)])
        else:
            run([
                "ffmpeg", "-y", "-i", str(src),
                "-af", f"volume={original_volume}",
                *H264_EXPORT_ARGS, str(out),
            ])
        return out

    fade_out_start = max(duration - FADE_SEC, 0)
    music_chain = (
        f"[1:a]aloop=loop=-1:size=2e9,atrim=0:{duration},"
        f"afade=t=in:st=0:d={FADE_SEC},afade=t=out:st={fade_out_start}:d={FADE_SEC},"
        f"volume={music_volume}[music]"
    )

    if original_volume <= 0:
        # Music only — original audio dropped entirely.
        filter_complex = music_chain
        map_audio = "[music]"
    elif duck:
        filter_complex = (
            f"[0:a]volume={original_volume}[orig];"
            f"{music_chain};"
            f"[music][orig]sidechaincompress=threshold=0.05:ratio=8:attack=5:release=300[ducked];"
            f"[orig][ducked]amix=inputs=2:duration=first:dropout_transition=0[aout]"
        )
        map_audio = "[aout]"
    else:
        filter_complex = (
            f"[0:a]volume={original_volume}[orig];"
            f"{music_chain};"
            f"[orig][music]amix=inputs=2:duration=first:dropout_transition=0[aout]"
        )
        map_audio = "[aout]"

    run([
        "ffmpeg", "-y",
        "-i", str(src), "-i", str(music),
        "-filter_complex", filter_complex,
        "-map", "0:v", "-map", map_audio,
        *H264_EXPORT_ARGS,
        str(out),
    ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--music", type=Path)
    ap.add_argument("--music-volume", type=float, default=0.5)
    ap.add_argument("--original-volume", type=float, default=1.0)
    ap.add_argument("--duck", action="store_true")
    ap.add_argument("--target-lufs", type=float, help="two-pass loudness-normalize the original track to this integrated LUFS instead of a flat multiplier")
    ap.add_argument("--target-tp", type=float, default=-1.0, help="true-peak ceiling for --target-lufs, dBTP")
    ap.add_argument("--target-lra", type=float, default=15.0, help="loudness range target for --target-lufs, LU")
    args = ap.parse_args()

    out = mix_audio(args.input, args.out, args.music, args.music_volume,
                     args.original_volume, args.duck,
                     args.target_lufs, args.target_tp, args.target_lra)
    print(f"Mixed-audio video written: {out}")


if __name__ == "__main__":
    main()
