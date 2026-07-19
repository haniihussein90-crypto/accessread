#!/usr/bin/env python3
"""
Add slow, subtle camera motion to a clip (the "gentle motion" the Zaviqu
brand style calls for on product/gift shots — never a fast or jarring
move). Two flavors, both built on the same zoompan machinery:

- add_slow_zoom: a centered push-in/pull-out (unchanged behavior/API —
  existing briefs keep working exactly as before).
- add_camera_motion: zoom PLUS a slow linear drift of the crop center,
  for "subtle floating movement," "let the chain gently drift," "slow
  slide movement" — briefs that want more than a dead-centered zoom.
  Drift is expressed as a fraction of frame width/height so it composes
  naturally with any zoom level: drift_x=0.02 means the crop center
  drifts 2% of the frame width over the clip, drift_y likewise
  vertically. Small values (0.01-0.03) read as "floating"; larger
  horizontal-only values read as a deliberate slow slide/pan.

--direction in   starts at 1.0x / drift start, eases to zoom_end / drift end.
--direction out  the reverse — implemented by building the "in" version
                 then reversing the video track only; original audio
                 stays forward.

CLI:
    python3 add_motion.py working/scene_a.mp4 --out working/scene_a_motion.mp4 \
        --direction in --zoom-end 1.08
    python3 add_motion.py working/scene_a.mp4 --out working/scene_a_drift.mp4 \
        --direction in --zoom-end 1.03 --drift-x 0.015 --drift-y 0.01
"""
from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    H264_EXPORT_ARGS, check_tools, ensure_parent, ffprobe_json, run, video_stream,
)


def _build_zoompan(width: int, height: int, fps: float, total_frames: int,
                    zoom_end: float, drift_x: float, drift_y: float) -> str:
    zoom_step = (zoom_end - 1.0) / total_frames
    drift_x_px = drift_x * width
    drift_y_px = drift_y * height
    # 'on' = output frame number, available inside zoompan expressions.
    x_expr = f"iw/2-(iw/zoom/2)+{drift_x_px:.4f}*(on/{total_frames})"
    y_expr = f"ih/2-(ih/zoom/2)+{drift_y_px:.4f}*(on/{total_frames})"
    return (
        f"scale={width * 2}:{height * 2},"
        f"zoompan=z='min(zoom+{zoom_step:.8f}\\,{zoom_end})':"
        f"x='{x_expr}':y='{y_expr}':"
        f"d=1:s={width}x{height}:fps={fps}"
    )


def _probe_motion_params(src: Path) -> tuple[int, int, float, int]:
    probe = ffprobe_json(src)
    v = video_stream(probe)
    width, height = int(v["width"]), int(v["height"])
    num, den = (v.get("r_frame_rate", "30/1").split("/") + ["1"])[:2]
    fps = float(num) / float(den) if float(den) else 30.0
    duration = float(probe["format"]["duration"])
    total_frames = max(int(round(duration * fps)), 2)
    return width, height, fps, total_frames


def add_camera_motion(src: Path, out: Path, zoom_end: float = 1.08, direction: str = "in",
                       drift_x: float = 0.0, drift_y: float = 0.0) -> Path:
    check_tools()
    ensure_parent(out)
    if not (1.0 < zoom_end <= 2.0):
        raise ValueError("zoom-end must be between 1.0 (exclusive) and 2.0")
    if direction not in ("in", "out"):
        raise ValueError("direction must be 'in' or 'out'")
    if not (-0.15 <= drift_x <= 0.15) or not (-0.15 <= drift_y <= 0.15):
        raise ValueError("drift_x/drift_y must be within -0.15..0.15 (fractions of frame size) — anything larger stops reading as subtle")

    width, height, fps, total_frames = _probe_motion_params(src)
    zoompan = _build_zoompan(width, height, fps, total_frames, zoom_end, drift_x, drift_y)

    if direction == "in":
        run(["ffmpeg", "-y", "-i", str(src), "-vf", zoompan, *H264_EXPORT_ARGS, str(out)])
    else:
        # Zoom/drift in on video only, reverse that video track, remux with
        # the original (forward) audio so speech/music isn't played backwards.
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


def add_slow_zoom(src: Path, out: Path, zoom_end: float = 1.08, direction: str = "in") -> Path:
    """Centered push-in/pull-out only — unchanged behavior for existing briefs."""
    return add_camera_motion(src, out, zoom_end, direction, drift_x=0.0, drift_y=0.0)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--direction", default="in", choices=["in", "out"])
    ap.add_argument("--zoom-end", type=float, default=1.08)
    ap.add_argument("--drift-x", type=float, default=0.0, help="fraction of frame width, e.g. 0.02")
    ap.add_argument("--drift-y", type=float, default=0.0, help="fraction of frame height, e.g. 0.015")
    args = ap.parse_args()

    out = add_camera_motion(args.input, args.out, args.zoom_end, args.direction, args.drift_x, args.drift_y)
    print(f"Motion video written: {out}")


if __name__ == "__main__":
    main()
