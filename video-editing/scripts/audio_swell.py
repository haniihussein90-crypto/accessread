#!/usr/bin/env python3
"""
Boost the EXISTING audio track's volume during specific time windows in
the final edited timeline — for "keep the current music/audio, just lift
it a little during these emotional beats" briefs. Not a music-mixing
tool (see mix_audio.py for adding a separate track); this only reshapes
the volume envelope of the audio that's already there, with a smooth
linear ramp in and out so boosts never sound like a hard jump.

Swell spec (JSON, a list):
[
  {"start": 2.6, "end": 5.3, "boost": 0.35, "ramp": 0.4},
  {"start": 6.2, "end": 7.6, "boost": 0.30, "ramp": 0.3}
]
`boost` is a fraction added on top of baseline (0.35 = 35% louder at the
peak of that window). `ramp` is the fade-in/out duration in seconds
approaching/leaving full boost.

CLI:
    python3 audio_swell.py working/mixed.mp4 --swells briefs/swells.json --out working/swelled.mp4
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import H264_EXPORT_ARGS, check_tools, ensure_parent, run  # noqa: E402


def _window_expr(start: float, end: float, ramp: float) -> str:
    ramp = max(ramp, 0.01)
    rise = f"(t-{start})/{ramp}"
    fall = f"({end}-t)/{ramp}"
    return f"clip(min(min({rise}\\,{fall})\\,1)\\,0\\,1)"


def build_volume_expr(swells: list[dict]) -> str:
    terms = ["1"]
    for s in swells:
        w = _window_expr(s["start"], s["end"], s.get("ramp", 0.3))
        terms.append(f"{s['boost']}*{w}")
    return "+".join(terms)


def apply_swells(src: Path, swells: list[dict], out: Path) -> Path:
    check_tools()
    ensure_parent(out)
    if not swells:
        run(["ffmpeg", "-y", "-i", str(src), *H264_EXPORT_ARGS, str(out)])
        return out

    expr = build_volume_expr(swells)
    # A swell peak stacks its boost on top of whatever level the track is
    # already mixed at (e.g. loudness-normalized background music) — cap
    # true peak so a swell can never clip, without audibly compressing
    # the rest of the track (alimiter only engages within ~0.1s of a peak
    # actually approaching the ceiling).
    af = f"volume=volume='{expr}':eval=frame,alimiter=limit=0.97:attack=5:release=50"

    run([
        "ffmpeg", "-y", "-i", str(src),
        "-af", af,
        *H264_EXPORT_ARGS,
        str(out),
    ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--swells", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    swells = json.loads(args.swells.read_text())
    out = apply_swells(args.input, swells, args.out)
    print(f"Audio-swelled video written: {out}")


if __name__ == "__main__":
    main()
