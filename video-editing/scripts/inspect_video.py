#!/usr/bin/env python3
"""
Inspect a video file: resolution, fps, duration, codecs, audio presence.

CLI:
    python3 inspect_video.py path/to/clip.mp4 [--json out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import audio_stream, ensure_parent, ffprobe_json, video_stream  # noqa: E402


def inspect(path: Path) -> dict:
    probe = ffprobe_json(path)
    v = video_stream(probe)
    a = audio_stream(probe)

    num, den = (v.get("r_frame_rate", "0/1").split("/") + ["1"])[:2]
    fps = round(float(num) / float(den), 3) if float(den) else 0.0

    summary = {
        "file": str(path),
        "duration_sec": round(float(probe["format"]["duration"]), 3),
        "width": int(v["width"]),
        "height": int(v["height"]),
        "aspect_ratio": round(int(v["width"]) / int(v["height"]), 4),
        "fps": fps,
        "video_codec": v.get("codec_name"),
        "pix_fmt": v.get("pix_fmt"),
        "has_audio": a is not None,
        "audio_codec": a.get("codec_name") if a else None,
        "audio_channels": a.get("channels") if a else None,
        "size_bytes": int(probe["format"].get("size", 0)),
    }
    return summary


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--json", type=Path, help="Write full summary JSON to this path")
    args = ap.parse_args()

    summary = inspect(args.input)
    print(json.dumps(summary, indent=2))

    if args.json:
        ensure_parent(args.json)
        args.json.write_text(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
