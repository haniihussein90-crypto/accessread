#!/usr/bin/env python3
"""
Burn in one or more text overlays (titles, on-screen callouts, CTA lines)
from a JSON spec. Every overlay is clamped inside the configured safe
margin so nothing collides with platform UI (comment stack, caption tray).

Spec format (JSON, a list of overlay objects):
[
  {
    "text": "ZAVIQU",
    "start": 0.0,
    "end": 2.0,
    "position": "top",            // top | center | bottom | custom
    "x": null, "y": null,          // fractions 0-1 of frame, only for "custom"
    "size": 64,                    // px, scaled relative to a 1920-tall frame
    "color": "gold",                // gold | white | #RRGGBB
    "box": true                     // semi-opaque background box behind text
  }
]

CLI:
    python3 add_text_overlay.py working/assembled_916.mp4 --spec briefs/text_spec.json \
        --out working/with_text.mp4
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    BRAND_GOLD, BRAND_WHITE, H264_EXPORT_ARGS, SAFE_MARGIN_FRACTION,
    check_tools, ensure_parent, ffprobe_json, hex_to_ffmpeg_color, run, video_stream,
)

COLOR_ALIASES = {"gold": BRAND_GOLD, "white": BRAND_WHITE}


def _escape_text(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "’")  # avoid breaking the quoted drawtext arg
    )


def _resolve_color(color: str) -> str:
    color = COLOR_ALIASES.get(color, color)
    if color.startswith("#"):
        return hex_to_ffmpeg_color(color)
    return color


def _build_drawtext(overlay: dict, width: int, height: int) -> str:
    margin_x = int(width * SAFE_MARGIN_FRACTION)
    margin_y = int(height * SAFE_MARGIN_FRACTION)

    size = overlay.get("size", 64)
    # Scale font size relative to actual frame height (spec is authored
    # against a 1920px-tall reference frame).
    size = int(size * height / 1920)
    color = _resolve_color(overlay.get("color", "white"))
    position = overlay.get("position", "bottom")

    if position == "top":
        x_expr, y_expr = "(w-text_w)/2", str(margin_y)
    elif position == "center":
        x_expr, y_expr = "(w-text_w)/2", "(h-text_h)/2"
    elif position == "bottom":
        x_expr, y_expr = "(w-text_w)/2", f"h-text_h-{margin_y}"
    elif position == "custom":
        fx, fy = overlay.get("x", 0.5), overlay.get("y", 0.5)
        x_expr, y_expr = f"{fx}*w-text_w/2", f"{fy}*h-text_h/2"
        # still clamp into the safe zone
        x_expr = f"max({margin_x}\\,min(w-text_w-{margin_x}\\,{x_expr}))"
        y_expr = f"max({margin_y}\\,min(h-text_h-{margin_y}\\,{y_expr}))"
    else:
        raise ValueError(f"Unknown position '{position}'")

    parts = [
        f"text='{_escape_text(overlay['text'])}'",
        f"fontsize={size}",
        f"fontcolor={color}",
        f"x={x_expr}",
        f"y={y_expr}",
    ]
    if overlay.get("box", True):
        parts += ["box=1", "boxcolor=black@0.45", "boxborderw=14"]

    start, end = overlay["start"], overlay["end"]
    parts.append(f"enable='between(t\\,{start}\\,{end})'")
    return "drawtext=" + ":".join(parts)


def add_overlays(src: Path, spec: list[dict], out: Path) -> Path:
    check_tools()
    ensure_parent(out)
    probe = ffprobe_json(src)
    v = video_stream(probe)
    width, height = int(v["width"]), int(v["height"])

    filters = [_build_drawtext(o, width, height) for o in spec]
    vf = ",".join(filters)

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
    ap.add_argument("--spec", type=Path, required=True, help="JSON file, see module docstring")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    spec = json.loads(args.spec.read_text())
    if not spec:
        raise SystemExit("Empty text spec — nothing to overlay")

    out = add_overlays(args.input, spec, args.out)
    print(f"Text overlay video written: {out}")


if __name__ == "__main__":
    main()
