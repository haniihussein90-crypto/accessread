#!/usr/bin/env python3
"""
Final export pass: guarantees the output is a clean H.264 (yuv420p) / AAC
MP4 with +faststart, regardless of what codec/container the intermediate
working file happened to be in. Every other pipeline script already
encodes with these settings, so this is usually a fast remux — but running
it as the last, explicit step keeps the guarantee independent of whatever
changes upstream.

CLI:
    python3 export_final.py working/final_with_cta.mp4 --out final/instagram-facebook/gift_reveal_9x16.mp4
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import H264_EXPORT_ARGS, check_tools, ensure_parent, run  # noqa: E402


def export_final(src: Path, out: Path) -> Path:
    check_tools()
    ensure_parent(out)
    run(["ffmpeg", "-y", "-i", str(src), *H264_EXPORT_ARGS, str(out)])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    out = export_final(args.input, args.out)
    print(f"Final MP4 exported: {out}")


if __name__ == "__main__":
    main()
