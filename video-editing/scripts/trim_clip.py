#!/usr/bin/env python3
"""
Trim a clip to [start, end).

CLI:
    python3 trim_clip.py source/raw.mp4 --start 00:00:01.5 --end 00:00:04.2 \
        --out working/scene_a.mp4
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import H264_EXPORT_ARGS, check_tools, ensure_parent, parse_timecode, run  # noqa: E402


def trim(src: Path, start, end, out: Path) -> Path:
    check_tools()
    ensure_parent(out)
    start_s = parse_timecode(start)
    end_s = parse_timecode(end)
    if end_s <= start_s:
        raise ValueError(f"end ({end_s}) must be after start ({start_s})")

    # Re-encode (rather than -c copy) so cut points land on exact frames —
    # critical for scene reordering/concat downstream to stay frame-accurate.
    run([
        "ffmpeg", "-y",
        "-ss", str(start_s), "-to", str(end_s),
        "-i", str(src),
        *H264_EXPORT_ARGS,
        str(out),
    ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--start", required=True)
    ap.add_argument("--end", required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    out = trim(args.input, args.start, args.end, args.out)
    print(f"Trimmed clip written: {out}")


if __name__ == "__main__":
    main()
