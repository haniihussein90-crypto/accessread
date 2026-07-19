#!/usr/bin/env python3
"""
Mix a music track under (or instead of) a video's original audio.
Also handles muting/reducing unwanted original audio on its own.

- No --music: just changes the original audio's volume (use
  --original-volume 0 to mute unwanted on-camera sound, e.g. handling
  noise while placing the gift box).
- With --music: mixes music (looped/trimmed to clip length, with a short
  fade in/out) under the original audio. --duck applies sidechain
  compression so the music dips automatically under any original audio
  peaks (e.g. a voice moment) instead of fighting it.

CLI:
    python3 mix_audio.py working/with_text.mp4 --music brand-assets/music/theme.mp3 \
        --music-volume 0.5 --original-volume 1.0 --duck --out working/mixed.mp4
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    H264_EXPORT_ARGS, check_tools, ensure_parent, get_duration, run,
)

FADE_SEC = 0.6


def mix_audio(
    src: Path,
    out: Path,
    music: Path | None = None,
    music_volume: float = 0.5,
    original_volume: float = 1.0,
    duck: bool = False,
) -> Path:
    check_tools()
    ensure_parent(out)
    duration = get_duration(src)

    if music is None:
        # Just adjust (or mute) the original track.
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
    args = ap.parse_args()

    out = mix_audio(args.input, args.out, args.music, args.music_volume,
                     args.original_volume, args.duck)
    print(f"Mixed-audio video written: {out}")


if __name__ == "__main__":
    main()
