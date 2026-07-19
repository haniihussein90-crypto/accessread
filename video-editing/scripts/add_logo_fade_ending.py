#!/usr/bin/env python3
"""
Premium "logo reveal over the final shot" ending — NOT a separate end
card. Keeps the video's actual last frame (e.g. the couple hugging),
freezes it, and fades the brand lockup in over it while it holds, then
fades the picture to black under the still-visible gold text, holds on
black, then fades everything out together. No cut away, no motion on the
logo — only opacity fades.

Sequence (all durations configurable):
  1. Real footage plays through to its natural last frame.
  2. That frame freezes. The lockup (+ brand promise + website) fades in
     over `fade_in` seconds.
  3. Hold the fully-visible composition (frozen footage + full-opacity
     text) for `hold_visible` seconds.
  4. The FOOTAGE fades to black over `fade_to_black` seconds — the text
     layer's opacity is untouched, so it stays fully readable throughout.
  5. Once black, hold `black_hold` seconds with text still visible.
  6. Fade the (now all-gold-text-on-black) frame out over `final_fade_out`
     seconds, ending on solid black.

The lockup image (icon + ZAVIQU + divider/heart + "Made with love...")
should be a pre-extracted, transparent-background PNG matching the
brand's actual reference art — see brand-assets/logo/PROVENANCE.md for
how brand-assets/logo/zaviqu-lockup-reference.png was produced. This
script adds two more lines below it (brand promise + website) rendered
to match, rather than baking them into the reference crop.

CLI:
    python3 add_logo_fade_ending.py working/mixed_916.mp4 --out working/final_916.mp4 \
        --lockup brand-assets/logo/zaviqu-lockup-reference.png \
        --brand-promise "The Gift That Says What Words Can't." \
        --website "zaviqu.com"
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
from concat_clips import concat as plain_concat  # noqa: E402

SERIF_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
]

AUDIO_TAIL_FADE_SEC = 0.8  # fade the real clip's own audio out before the freeze, so silence isn't a hard cut


def _find_font(size: int) -> ImageFont.FreeTypeFont:
    for path in SERIF_FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def _draw_tracked_text(draw: ImageDraw.ImageDraw, center_x: int, y: int, text: str,
                        font: ImageFont.FreeTypeFont, fill: tuple, tracking_px: int) -> None:
    """Draw text horizontally centered with extra letter-spacing (PIL has
    no native tracking support), for the "generous spacing" the brief asks for."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total_w = sum(widths) + tracking_px * (len(text) - 1)
    x = center_x - total_w / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking_px


def build_text_group(frame_width: int, frame_height: int, lockup_path: Path,
                      brand_promise: str, website: str, gold_color: str) -> Image.Image:
    gold_rgb = _hex_to_rgb(gold_color)
    lockup = Image.open(lockup_path).convert("RGBA")

    lockup_w = int(frame_width * 0.66)
    lockup_h = int(lockup_w * lockup.height / lockup.width)
    lockup = lockup.resize((lockup_w, lockup_h), Image.LANCZOS)

    # "Made with love. Made to last." is already baked into the lockup
    # crop; the two NEW lines below it are smaller, per the brief:
    # brand promise smaller than the lockup's own tagline, website smallest.
    promise_size = int(lockup_w * 0.052)
    website_size = int(lockup_w * 0.036)
    promise_font = _find_font(promise_size)
    website_font = _find_font(website_size)

    gap_after_lockup = int(frame_height * 0.045)
    gap_before_website = int(frame_height * 0.05)
    promise_h = int(promise_size * 1.4)
    website_h = int(website_size * 1.4)

    canvas = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
    group_h = lockup_h + gap_after_lockup + promise_h + gap_before_website + website_h
    top = (frame_height - group_h) // 2

    canvas.paste(lockup, ((frame_width - lockup_w) // 2, top), lockup)

    draw = ImageDraw.Draw(canvas)
    cx = frame_width // 2
    _draw_tracked_text(draw, cx, top + lockup_h + gap_after_lockup, brand_promise,
                        promise_font, gold_rgb, tracking_px=max(1, promise_size // 18))
    _draw_tracked_text(draw, cx, top + lockup_h + gap_after_lockup + promise_h + gap_before_website,
                        website, website_font, gold_rgb, tracking_px=max(2, website_size // 6))

    return canvas


def add_logo_fade_ending(
    src: Path,
    out: Path,
    lockup: Path,
    brand_promise: str,
    website: str,
    fade_in: float = 1.0,
    hold_visible: float = 2.0,
    fade_to_black: float = 1.2,
    black_hold: float = 1.0,
    final_fade_out: float = 0.8,
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

    total_hold = fade_in + hold_visible + fade_to_black + black_hold + final_fade_out
    black_starts_at = fade_in + hold_visible

    with tempfile.TemporaryDirectory() as tmp:
        # 1. Smoothly fade the real clip's own audio to silence before the freeze —
        # avoids a hard audio cut at the moment it stops being live footage.
        faded_src = Path(tmp) / "faded_src.mp4"
        fade_start = max(src_duration - AUDIO_TAIL_FADE_SEC, 0)
        run([
            "ffmpeg", "-y", "-i", str(src),
            "-af", f"afade=t=out:st={fade_start}:d={AUDIO_TAIL_FADE_SEC}",
            "-c:v", "copy", "-c:a", "aac",
            str(faded_src),
        ])

        # 2. Freeze the last frame as the background for the whole ending sequence.
        last_frame = Path(tmp) / "last_frame.png"
        run(["ffmpeg", "-y", "-sseof", "-0.1", "-i", str(src), "-vframes", "1", str(last_frame)])

        # 3. Build the transparent text-group (lockup + brand promise + website).
        text_group_png = Path(tmp) / "text_group.png"
        build_text_group(width, height, lockup, brand_promise, website, gold_color).save(text_group_png)

        # 4. Background: frozen frame, held for total_hold, fading to black partway through.
        bg_clip = Path(tmp) / "bg_clip.mp4"
        run([
            "ffmpeg", "-y", "-loop", "1", "-i", str(last_frame),
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t", str(total_hold),
            "-vf", f"fade=t=out:st={black_starts_at}:d={fade_to_black}:color=black",
            "-r", str(fps),
            *H264_EXPORT_ARGS,
            str(bg_clip),
        ])

        # 5. Overlay: text group, alpha-faded in then out, held fully opaque between.
        overlay_clip = Path(tmp) / "overlay_clip.mov"
        fade_out_start = total_hold - final_fade_out
        run([
            "ffmpeg", "-y", "-loop", "1", "-i", str(text_group_png),
            "-t", str(total_hold),
            "-vf", (
                f"fade=t=in:st=0:d={fade_in}:alpha=1,"
                f"fade=t=out:st={fade_out_start}:d={final_fade_out}:alpha=1"
            ),
            "-r", str(fps),
            "-c:v", "qtrle",
            str(overlay_clip),
        ])

        # 6. Composite overlay onto background.
        ending_clip = Path(tmp) / "ending_clip.mp4"
        run([
            "ffmpeg", "-y", "-i", str(bg_clip), "-i", str(overlay_clip),
            "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto[v]",
            "-map", "[v]", "-map", "0:a",
            *H264_EXPORT_ARGS,
            str(ending_clip),
        ])

        # 7. Concat — seamless, since the ending clip's first frame IS the
        # source's last frame, just frozen; no crossfade needed.
        plain_concat([faded_src, ending_clip], out, width=width, height=height, fps=int(round(fps)))

    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--lockup", type=Path, required=True)
    ap.add_argument("--brand-promise", required=True)
    ap.add_argument("--website", required=True)
    ap.add_argument("--fade-in", type=float, default=1.0)
    ap.add_argument("--hold-visible", type=float, default=2.0)
    ap.add_argument("--fade-to-black", type=float, default=1.2)
    ap.add_argument("--black-hold", type=float, default=1.0)
    ap.add_argument("--final-fade-out", type=float, default=0.8)
    ap.add_argument("--gold-color", default=BRAND_GOLD)
    args = ap.parse_args()

    out = add_logo_fade_ending(
        args.input, args.out, args.lockup, args.brand_promise, args.website,
        args.fade_in, args.hold_visible, args.fade_to_black, args.black_hold,
        args.final_fade_out, args.gold_color,
    )
    print(f"Video with logo-fade ending written: {out}")


if __name__ == "__main__":
    main()
