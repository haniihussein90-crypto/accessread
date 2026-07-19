#!/usr/bin/env python3
"""
Concatenate an ordered list of clips into one video (this is how scene
reordering happens: pass the clips in the sequence you want, regardless of
their original order or filenames).

Normalizes every input to the same resolution/fps first, so mismatched
source clips (e.g. one from a phone at 30fps, one at 60fps) still concat
cleanly instead of ffmpeg erroring or producing a broken stream.

CLI:
    python3 concat_clips.py working/scene_a.mp4 working/scene_c.mp4 working/scene_b.mp4 \
        --out working/assembled.mp4 --width 1080 --height 1920 --fps 30
"""
from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import H264_EXPORT_ARGS, check_tools, ensure_parent, run  # noqa: E402


def concat(clips: list[Path], out: Path, width: int | None = None,
           height: int | None = None, fps: int | None = None) -> Path:
    check_tools()
    ensure_parent(out)
    if len(clips) < 2:
        raise ValueError("concat needs at least 2 clips")

    with tempfile.TemporaryDirectory() as tmp:
        normalized = []
        for i, clip in enumerate(clips):
            if width and height:
                dst = Path(tmp) / f"norm_{i}.mp4"
                vf = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2"
                cmd = ["ffmpeg", "-y", "-i", str(clip), "-vf", vf]
                if fps:
                    cmd += ["-r", str(fps)]
                cmd += [*H264_EXPORT_ARGS, str(dst)]
                run(cmd)
                normalized.append(dst)
            else:
                normalized.append(clip)

        inputs = []
        filter_parts = []
        for i, clip in enumerate(normalized):
            inputs += ["-i", str(clip)]
            filter_parts.append(f"[{i}:v:0][{i}:a:0]")
        filter_complex = "".join(filter_parts) + f"concat=n={len(normalized)}:v=1:a=1[v][a]"

        run([
            "ffmpeg", "-y", *inputs,
            "-filter_complex", filter_complex,
            "-map", "[v]", "-map", "[a]",
            *H264_EXPORT_ARGS,
            str(out),
        ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("clips", type=Path, nargs="+", help="Clips in final playback order")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    ap.add_argument("--fps", type=int)
    args = ap.parse_args()

    out = concat(args.clips, args.out, args.width, args.height, args.fps)
    print(f"Concatenated video written: {out}")


if __name__ == "__main__":
    main()
