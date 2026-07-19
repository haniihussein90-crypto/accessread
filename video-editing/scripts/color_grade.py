#!/usr/bin/env python3
"""
Apply a restrained color grade: warmth, contrast, and optional sharpen —
the "luxury cinematic look" adjustments (never over-saturation, never
heavy effects). Each knob is a fractional adjustment, not an absolute
value, so a brief can say "increase warmth by 5%" and mean exactly that.

- warmth: blends toward a warm color temperature. 0.05 = a 5% blend
  toward 3000K (subtle); 0 = no change. Uses ffmpeg's colortemperature
  filter with `mix` as the blend strength, so it never fully overrides
  the original lighting — just nudges it warmer.
- contrast: multiplies contrast by (1 + value). 0.03 = 3% more contrast.
- sharpen: unsharp luma strength, 0 = untouched. Use sparingly (e.g. 0.3-0.6)
  for a "sparkle/clarity" boost on a specific close-up — high values look
  fake fast.
- vignette: subtle corner darkening to draw the eye toward the frame
  center ("draw attention to the gift"). Uses ffmpeg's own default
  vignette angle (PI/5) — restrained by design, not a heavy toy-camera
  effect; this pipeline doesn't expose a stronger setting on purpose.

CLI:
    python3 color_grade.py working/assembled.mp4 --out working/graded.mp4 \
        --warmth 0.05 --contrast 0.03
    python3 color_grade.py working/scene_necklace.mp4 --out working/scene_necklace_sharp.mp4 \
        --sharpen 0.4
    python3 color_grade.py working/scene_box.mp4 --out working/scene_box_graded.mp4 \
        --warmth 0.05 --vignette
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import H264_EXPORT_ARGS, check_tools, ensure_parent, run  # noqa: E402

WARM_TARGET_KELVIN = 3000  # warmer than the ~6500K neutral default


def grade(src: Path, out: Path, warmth: float = 0.0, contrast: float = 0.0,
          sharpen: float = 0.0, vignette: bool = False) -> Path:
    check_tools()
    ensure_parent(out)
    if not (0.0 <= warmth <= 1.0):
        raise ValueError("warmth must be between 0 and 1 (fraction)")
    if sharpen < -2.0 or sharpen > 5.0:
        raise ValueError("sharpen must be between -2 and 5 (unsharp luma_amount range)")

    filters = []
    if contrast:
        filters.append(f"eq=contrast={1.0 + contrast:.4f}")
    if warmth:
        filters.append(f"colortemperature=temperature={WARM_TARGET_KELVIN}:mix={warmth:.4f}:pl=0.5")
    if sharpen:
        filters.append(f"unsharp=luma_amount={sharpen:.4f}")
    if vignette:
        filters.append("vignette=PI/5")

    if not filters:
        # Nothing requested — just guarantee clean output, same as export_final.
        run(["ffmpeg", "-y", "-i", str(src), *H264_EXPORT_ARGS, str(out)])
        return out

    run([
        "ffmpeg", "-y", "-i", str(src),
        "-vf", ",".join(filters),
        *H264_EXPORT_ARGS,
        str(out),
    ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--warmth", type=float, default=0.0, help="0-1 fraction, e.g. 0.05 for +5%%")
    ap.add_argument("--contrast", type=float, default=0.0, help="fraction, e.g. 0.03 for +3%%")
    ap.add_argument("--sharpen", type=float, default=0.0, help="unsharp luma_amount, e.g. 0.4")
    ap.add_argument("--vignette", action="store_true", help="subtle corner darkening")
    args = ap.parse_args()

    out = grade(args.input, args.out, args.warmth, args.contrast, args.sharpen, args.vignette)
    print(f"Graded video written: {out}")


if __name__ == "__main__":
    main()
