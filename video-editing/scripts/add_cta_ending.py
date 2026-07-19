#!/usr/bin/env python3
"""
Append a CTA card to the end of an edit: freezes the final frame for
--duration seconds and fades in the CTA text over it (e.g. "Create yours
at ZAVIQU", "Shop now") in brand gold. Crossfades from the main video into
the frozen card so the ending never cuts off abruptly.

CLI:
    python3 add_cta_ending.py working/mixed.mp4 --text "Create yours at ZAVIQU" \
        --duration 2.0 --out working/final_with_cta.mp4
"""
from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    BRAND_GOLD, H264_EXPORT_ARGS, check_tools, ensure_parent, ffprobe_json,
    get_duration, hex_to_ffmpeg_color, run, video_stream,
)

CROSSFADE_SEC = 0.5


def add_cta_ending(src: Path, out: Path, text: str, duration: float = 2.0,
                    color: str = BRAND_GOLD, fontsize: int | None = None) -> Path:
    check_tools()
    ensure_parent(out)
    probe = ffprobe_json(src)
    v = video_stream(probe)
    width, height = int(v["width"]), int(v["height"])
    num, den = (v.get("r_frame_rate", "30/1").split("/") + ["1"])[:2]
    fps = float(num) / float(den) if float(den) else 30.0
    src_duration = get_duration(src)
    color = hex_to_ffmpeg_color(color) if color.startswith("#") else color
    fontsize = fontsize or int(height * 0.045)

    escaped = text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’")

    with tempfile.TemporaryDirectory() as tmp:
        last_frame = Path(tmp) / "last_frame.png"
        run([
            "ffmpeg", "-y", "-sseof", "-0.1", "-i", str(src),
            "-vframes", "1", str(last_frame),
        ])

        cta_card = Path(tmp) / "cta_card.mp4"
        run([
            "ffmpeg", "-y", "-loop", "1", "-i", str(last_frame),
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t", str(duration),
            "-vf",
            f"drawtext=text='{escaped}':fontsize={fontsize}:fontcolor={color}:"
            f"x=(w-text_w)/2:y=(h-text_h)/2:"
            f"alpha='if(lt(t\\,0.4)\\,t/0.4\\,1)'",
            "-r", str(fps),
            *H264_EXPORT_ARGS,
            str(cta_card),
        ])

        offset = max(src_duration - CROSSFADE_SEC, 0)
        filter_complex = (
            f"[0:v][1:v]xfade=transition=fade:duration={CROSSFADE_SEC}:offset={offset}[v];"
            f"[0:a][1:a]acrossfade=d={CROSSFADE_SEC}[a]"
        )
        run([
            "ffmpeg", "-y",
            "-i", str(src), "-i", str(cta_card),
            "-filter_complex", filter_complex,
            "-map", "[v]", "-map", "[a]",
            *H264_EXPORT_ARGS,
            str(out),
        ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--text", required=True)
    ap.add_argument("--duration", type=float, default=2.0)
    ap.add_argument("--color", default=BRAND_GOLD)
    ap.add_argument("--fontsize", type=int)
    args = ap.parse_args()

    out = add_cta_ending(args.input, args.out, args.text, args.duration, args.color, args.fontsize)
    print(f"Video with CTA ending written: {out}")


if __name__ == "__main__":
    main()
