#!/usr/bin/env python3
"""
Convert a video to 4:5 (1080x1350) for Instagram/Facebook feed posts.
Thin wrapper around resize_video.py with aspect fixed to 4:5.

CLI:
    python3 resize_4x5.py working/assembled.mp4 --out working/assembled_45.mp4 [--mode crop]
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

    out = resize(args.input, args.out, "4:5", args.mode)
    print(f"4:5 video written: {out}")


if __name__ == "__main__":
    main()
