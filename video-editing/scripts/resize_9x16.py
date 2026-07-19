#!/usr/bin/env python3
"""
Convert a video to 9:16 (1080x1920) for Instagram Reels / Stories / TikTok.
Thin wrapper around resize_video.py with aspect fixed to 9:16.

CLI:
    python3 resize_9x16.py working/assembled.mp4 --out working/assembled_916.mp4 [--mode crop]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from resize_video import resize  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--mode", default="blur_pad", choices=["crop", "blur_pad"])
    args = ap.parse_args()

    out = resize(args.input, args.out, "9:16", args.mode)
    print(f"9:16 video written: {out}")


if __name__ == "__main__":
    main()
