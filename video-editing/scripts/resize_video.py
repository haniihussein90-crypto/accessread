#!/usr/bin/env python3
"""
Core resize/reframe engine — converts any source aspect ratio (landscape,
square, whatever) into a target vertical/social aspect ratio "safely":
never distorts (stretches) the image, and never leaves plain black bars
unless you explicitly ask for them.

Two modes:
  --mode crop      Scale to fill the target frame and center-crop the
                    overflow. Best when the product/subject is centered and
                    you can afford to lose the edges. Zero padding.
  --mode blur_pad   (default) Scale the full source to fit inside the frame
                    untouched, then fill the empty top/bottom or side
                    margins with a blurred, zoomed copy of the same frame
                    instead of solid black. Nothing is cropped out.

resize_9x16.py and resize_4x5.py are thin wrappers around this with the
target aspect pre-set — use those in the pipeline; use this one directly
for one-off/custom aspect ratios.

CLI:
    python3 resize_video.py working/assembled.mp4 --aspect 9:16 --mode blur_pad \
        --out working/assembled_916.mp4
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ASPECT_SIZES, H264_EXPORT_ARGS, check_tools, ensure_parent, run  # noqa: E402


def resize(src: Path, out: Path, aspect: str, mode: str = "blur_pad") -> Path:
    check_tools()
    ensure_parent(out)
    if aspect not in ASPECT_SIZES:
        raise ValueError(f"Unknown aspect '{aspect}'. Known: {list(ASPECT_SIZES)}")
    w, h = ASPECT_SIZES[aspect]

    if mode == "crop":
        vf = (
            f"scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h}"
        )
    elif mode == "blur_pad":
        # Background branch: fill-scale + heavy blur + darken slightly so
        # burned-in text still reads on top of it. Foreground: fit-scale,
        # centered, untouched aspect. Overlay foreground on background.
        vf = (
            f"split=2[bg][fg];"
            f"[bg]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},gblur=sigma=30,eq=brightness=-0.05[bg];"
            f"[fg]scale={w}:{h}:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
    else:
        raise ValueError("mode must be 'crop' or 'blur_pad'")

    run([
        "ffmpeg", "-y", "-i", str(src),
        "-vf", vf,
        *H264_EXPORT_ARGS,
        str(out),
    ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--aspect", required=True, choices=list(ASPECT_SIZES))
    ap.add_argument("--mode", default="blur_pad", choices=["crop", "blur_pad"])
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    out = resize(args.input, args.out, args.aspect, args.mode)
    print(f"Resized video written: {out}")


if __name__ == "__main__":
    main()
