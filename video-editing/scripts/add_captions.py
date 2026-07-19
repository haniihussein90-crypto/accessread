#!/usr/bin/env python3
"""
Burn in supplied captions (e.g. TikTok-style story text) from a simple
JSON list of timed lines. This is a captions-flavored preset over the same
drawtext engine as add_text_overlay.py — white text, bottom-safe position,
readable box — rather than a general-purpose overlay.

Caption spec format (JSON, a list):
[
  {"text": "She almost missed it.", "start": 0.0, "end": 2.2},
  {"text": "Then she opened the box.", "start": 2.2, "end": 4.5}
]

CLI:
    python3 add_captions.py working/assembled_916.mp4 --captions briefs/captions.json \
        --out working/with_captions.mp4
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from add_text_overlay import add_overlays  # noqa: E402


def build_spec(captions: list[dict]) -> list[dict]:
    return [
        {
            "text": c["text"],
            "start": c["start"],
            "end": c["end"],
            "position": c.get("position", "bottom"),
            "size": c.get("size", 52),
            "color": c.get("color", "white"),
            "box": True,
        }
        for c in captions
    ]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--captions", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    captions = json.loads(args.captions.read_text())
    if not captions:
        raise SystemExit("Empty captions file — nothing to burn in")

    spec = build_spec(captions)
    out = add_overlays(args.input, spec, args.out)
    print(f"Captioned video written: {out}")


if __name__ == "__main__":
    main()
