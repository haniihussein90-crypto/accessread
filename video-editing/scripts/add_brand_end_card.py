#!/usr/bin/env python3
"""
Build and attach a fully custom branded end card — a real logo IMAGE
(not drawtext) plus a two-line tagline, on its own premium background —
crossfaded onto the end of an edited video. This is for briefs that want
the actual logo artwork used (see brand-assets/logo/PROVENANCE.md), not
the plain drawtext CTA card add_cta_ending.py produces.

Renders the still card with Pillow (real serif font, precise logo
placement) and turns it into a short clip with a fade-in, then crossfades
it onto the main video's tail exactly like add_cta_ending.py does for its
text-only card.

CLI:
    python3 add_brand_end_card.py working/mixed.mp4 --out working/final_with_card.mp4 \
        --logo brand-assets/logo/zaviqu-logo-gold-extracted.png \
        --tagline-line1 "The Gift That Says" --tagline-line2 "What Words Can't." \
        --duration 1.6 --bg-color "#D8C9A8"
"""
from __future__ import annotations

import argparse
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    BRAND_GOLD, H264_EXPORT_ARGS, check_tools, ensure_parent, ffprobe_json,
    get_duration, run, video_stream,
)

CROSSFADE_SEC = 0.5
FADE_IN_SEC = 0.4
SERIF_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
]


def _find_font(size: int) -> ImageFont.FreeTypeFont:
    for path in SERIF_FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def _vignette_background(width: int, height: int, base_rgb: tuple[int, int, int]) -> Image.Image:
    """Same-family background as the base color, subtly darkened toward the
    edges so it reads as a designed card, not a flat color fill."""
    yy, xx = np.mgrid[0:height, 0:width]
    cx, cy = width / 2, height / 2
    dist = np.sqrt(((xx - cx) / (width / 2)) ** 2 + ((yy - cy) / (height / 2)) ** 2)
    dist = np.clip(dist, 0, 1)
    darken = 1.0 - 0.18 * (dist ** 2)  # up to 18% darker at the far corners

    arr = np.zeros((height, width, 3), dtype=np.float32)
    for c in range(3):
        arr[:, :, c] = base_rgb[c] * darken
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="RGB")


def render_card(width: int, height: int, logo_path: Path, tagline_line1: str,
                 tagline_line2: str, bg_color: str, gold_color: str) -> Image.Image:
    base_rgb = _hex_to_rgb(bg_color)
    canvas = _vignette_background(width, height, base_rgb)

    logo = Image.open(logo_path).convert("RGBA")
    logo_target_w = int(width * 0.58)
    logo_target_h = int(logo_target_w * logo.height / logo.width)
    logo = logo.resize((logo_target_w, logo_target_h), Image.LANCZOS)

    gold_rgb = _hex_to_rgb(gold_color)
    font_size = int(width * 0.052)
    font = _find_font(font_size)
    line_gap = int(font_size * 0.35)
    logo_to_text_gap = int(height * 0.065)
    text_block_h = 2 * font_size + line_gap

    # Center the WHOLE lockup (logo + gap + two-line tagline) as one group,
    # rather than anchoring the logo alone and letting the tagline fall
    # wherever — otherwise the block reads top-heavy with dead space below.
    block_h = logo_target_h + logo_to_text_gap + text_block_h
    block_top = (height - block_h) // 2

    logo_x = (width - logo_target_w) // 2
    logo_y = block_top
    canvas.paste(logo, (logo_x, logo_y), logo)

    draw = ImageDraw.Draw(canvas)
    text_top = logo_y + logo_target_h + logo_to_text_gap
    for i, line in enumerate((tagline_line1, tagline_line2)):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        x = (width - line_w) // 2
        y = text_top + i * (font_size + line_gap)
        draw.text((x, y), line, font=font, fill=gold_rgb)

    return canvas


def add_brand_end_card(
    src: Path,
    out: Path,
    logo: Path,
    tagline_line1: str,
    tagline_line2: str,
    duration: float = 1.6,
    bg_color: str = "#D8C9A8",
    gold_color: str = BRAND_GOLD,
) -> Path:
    check_tools()
    ensure_parent(out)
    probe = ffprobe_json(src)
    v = video_stream(probe)
    width, height = int(v["width"]), int(v["height"])
    num, den = (v.get("r_frame_rate", "30/1").split("/") + ["1"])[:2]
    fps = float(num) / float(den) if float(den) else 30.0
    src_duration = get_duration(src)

    with tempfile.TemporaryDirectory() as tmp:
        card_png = Path(tmp) / "card.png"
        card_image = render_card(width, height, logo, tagline_line1, tagline_line2, bg_color, gold_color)
        card_image.save(card_png)

        card_clip = Path(tmp) / "card_clip.mp4"
        run([
            "ffmpeg", "-y", "-loop", "1", "-i", str(card_png),
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t", str(duration),
            "-vf", f"fade=t=in:st=0:d={FADE_IN_SEC}",
            "-r", str(fps),
            *H264_EXPORT_ARGS,
            str(card_clip),
        ])

        offset = max(src_duration - CROSSFADE_SEC, 0)
        filter_complex = (
            f"[0:v][1:v]xfade=transition=fade:duration={CROSSFADE_SEC}:offset={offset}[v];"
            f"[0:a][1:a]acrossfade=d={CROSSFADE_SEC}[a]"
        )
        run([
            "ffmpeg", "-y",
            "-i", str(src), "-i", str(card_clip),
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
    ap.add_argument("--logo", type=Path, required=True)
    ap.add_argument("--tagline-line1", required=True)
    ap.add_argument("--tagline-line2", required=True)
    ap.add_argument("--duration", type=float, default=1.6)
    ap.add_argument("--bg-color", default="#D8C9A8")
    ap.add_argument("--gold-color", default=BRAND_GOLD)
    args = ap.parse_args()

    out = add_brand_end_card(
        args.input, args.out, args.logo, args.tagline_line1, args.tagline_line2,
        args.duration, args.bg_color, args.gold_color,
    )
    print(f"Video with branded end card written: {out}")


if __name__ == "__main__":
    main()
