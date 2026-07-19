#!/usr/bin/env python3
"""
Add a slow, subtle zoom to a clip (the "gentle motion" the Zaviqu brand
style calls for on product/gift shots — never a fast or jarring zoom).

--direction in   1.0x -> --zoom-end over the clip (default, e.g. slow push
                 in on the necklace/message card).
--direction out  --zoom-end -> 1.0x (starts close, eases back).
                 Implemented by zooming in then reversing the video track
                 only; the original audio track is kept forward/untouched.

CLI:
    python3 add_motion.py working/scene_a.mp4 --out working/scene_a_motion.mp4 \
        --direction in --zoom-end 1.08
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    H264_EXPORT_ARGS, check_tools, ensure_parent, ffprobe_json, run, video_stream,
)


def add_slow_zoom(src: Path, out: Path, zoom_end: float = 1.08, direction: str = "in") -> Path:
    check_tools()
    ensure_parent(out)
    if not (1.0 < zoom_end <= 2.0):
        raise ValueError("zoom-end must be between 1.0 (exclusive) and 2.0")
    if direction not in ("in", "out"):
        raise ValueError("direction must be 'in' or 'out'")

    probe = ffprobe_json(src)
    v = video_stream(probe)
    width, height = int(v["width"]), int(v["height"])
    num, den = (v.get("r_frame_rate", "30/1").split("/") + ["1"])[:2]
    fps = float(num) / float(den) if float(den) else 30.0
    duration = float(probe["format"]["duration"])
    total_frames = max(int(round(duration * fps)), 2)

    zoom_step = (zoom_end - 1.0) / total_frames
    zoompan = (
        f"scale={width * 2}:{height * 2},"
        f"zoompan=z='min(zoom+{zoom_step:.8f}\\,{zoom_end})':"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"d=1:s={width}x{height}:fps={fps}"
    )

    if direction == "in":
        run(["ffmpeg", "-y", "-i", str(src), "-vf", zoompan, *H264_EXPORT_ARGS, str(out)])
    else:
        # Zoom in on video only, reverse that video track, remux with the
        # original (forward) audio so speech/music isn't played backwards.
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            zoomed = Path(tmp) / "zoomed.mp4"
            run(["ffmpeg", "-y", "-i", str(src), "-vf", zoompan, "-an", *H264_EXPORT_ARGS, str(zoomed)])
            run([
                "ffmpeg", "-y",
                "-i", str(zoomed), "-i", str(src),
                "-vf", "reverse",
                "-map", "0:v", "-map", "1:a?",
                *H264_EXPORT_ARGS,
                str(out),
            ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--direction", default="in", choices=["in", "out"])
    ap.add_argument("--zoom-end", type=float, default=1.08)
    args = ap.parse_args()

    out = add_slow_zoom(args.input, args.out, args.zoom_end, args.direction)
    print(f"Motion video written: {out}")


if __name__ == "__main__":
    main()
