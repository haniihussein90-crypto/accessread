#!/usr/bin/env python3
"""
Premium "logo reveal over the final shot" ending — NOT a separate end
card, and NOT a freeze frame. The real footage keeps playing (and its
real audio keeps playing) while the brand lockup fades in over it, then
the moving footage and its audio fade to black/silence TOGETHER. Only
once there's no more real footage left does a plain black card (still no
freeze — there's simply nothing to show) hold the gold text briefly
before everything fades out.

Sequence (all durations configurable):
  1. Real footage plays through normally.
  2. Over the LAST `fade_in + hold_visible + fade_to_black` seconds of
     that real footage (still playing, never paused), the lockup
     (+ brand promise + website) fades in over `fade_in` seconds.
  3. Hold full-opacity text over the still-playing footage for
     `hold_visible` seconds.
  4. Over the final `fade_to_black` seconds of the real footage, the
     PICTURE fades to black and the ORIGINAL AUDIO fades to silence at
     the same time — text opacity is untouched, so it stays fully
     readable throughout. This is where the real footage runs out.
  5. Hold `black_hold` seconds on solid black with the text still visible
     (there's no frame to freeze here — the picture is already black).
  6. Fade the gold text out over `final_fade_out` seconds, ending on
     solid black.

If the source clip is shorter than fade_in + hold_visible + fade_to_black,
all three are scaled down proportionally so the sequence still fits
entirely within real, still-playing footage rather than inventing extra
time some other way.

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

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    BRAND_GOLD, H264_EXPORT_ARGS, audio_stream, check_tools, ensure_parent,
    ffprobe_json, get_duration, run, video_stream,
)
from concat_clips import concat as plain_concat  # noqa: E402

SERIF_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
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


def _solid_text_clip(text_group_png: Path, width: int, height: int, fps: float,
                      duration: float, alpha_fade: str | None, tmp: Path, name: str,
                      sample_rate: int = 44100) -> Path:
    """A clip of solid black with the (optionally alpha-fading) text group
    on top — used for the tail once real footage has run out. Not a
    freeze frame: there is no footage here at all, just the brand mark."""
    overlay = tmp / f"{name}_overlay.mov"
    vf = alpha_fade if alpha_fade else "null"
    run([
        "ffmpeg", "-y", "-loop", "1", "-i", str(text_group_png),
        "-t", str(duration), "-vf", vf, "-r", str(fps), "-c:v", "qtrle", str(overlay),
    ])
    out = tmp / f"{name}_solid_text_clip.mp4"
    run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=black:s={width}x{height}:r={fps}",
        "-i", str(overlay),
        # Must match the real footage segments' sample rate exactly — the
        # final concat requires identical audio formats across segments,
        # and a mismatch here (rather than erroring) silently corrupts the
        # concatenated audio instead, measured as a severe true-peak
        # overshoot rather than an obvious failure.
        "-f", "lavfi", "-i", f"anullsrc=channel_layout=stereo:sample_rate={sample_rate}",
        "-t", str(duration),
        "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto[v]",
        "-map", "[v]", "-map", "2:a",
        *H264_EXPORT_ARGS,
        str(out),
    ])
    return out


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
    a = audio_stream(probe)
    sample_rate = int(a["sample_rate"]) if a else 44100
    src_duration = get_duration(src)

    requested_moving = fade_in + hold_visible + fade_to_black
    if requested_moving > src_duration:
        # Not enough real footage for the numbers as given — scale all
        # three down proportionally rather than inventing extra time
        # (freezing, padding) that isn't real, still-playing footage.
        scale = src_duration / requested_moving
        fade_in, hold_visible, fade_to_black = fade_in * scale, hold_visible * scale, fade_to_black * scale
    moving_span = fade_in + hold_visible + fade_to_black
    overlay_start = max(src_duration - moving_span, 0)

    with tempfile.TemporaryDirectory() as tmp:
        text_group_png = Path(tmp) / "text_group.png"
        build_text_group(width, height, lockup, brand_promise, website, gold_color).save(text_group_png)

        segments = []

        # 1. Untouched real footage before the logo starts fading in.
        if overlay_start > 0.01:
            seg_before = Path(tmp) / "seg_before.mp4"
            run(["ffmpeg", "-y", "-to", str(overlay_start), "-i", str(src), *H264_EXPORT_ARGS, str(seg_before)])
            segments.append(seg_before)

        # 2. The moving tail: real footage keeps playing while the logo
        # fades in, holds, then the picture+audio fade to black together.
        seg_tail_raw = Path(tmp) / "seg_tail_raw.mp4"
        run(["ffmpeg", "-y", "-ss", str(overlay_start), "-i", str(src), *H264_EXPORT_ARGS, str(seg_tail_raw)])
        tail_dur = get_duration(seg_tail_raw)

        overlay_clip = Path(tmp) / "overlay_clip.mov"
        run([
            "ffmpeg", "-y", "-loop", "1", "-i", str(text_group_png),
            "-t", str(tail_dur),
            "-vf", f"fade=t=in:st=0:d={fade_in}:alpha=1",
            "-r", str(fps), "-c:v", "qtrle",
            str(overlay_clip),
        ])

        fade_to_black_start = max(tail_dur - fade_to_black, 0)
        seg_tail_final = Path(tmp) / "seg_tail_final.mp4"
        run([
            "ffmpeg", "-y", "-i", str(seg_tail_raw), "-i", str(overlay_clip),
            "-filter_complex",
            f"[0:v]fade=t=out:st={fade_to_black_start}:d={fade_to_black}:color=black[bgv];"
            f"[bgv][1:v]overlay=0:0:format=auto[v]",
            "-map", "[v]", "-map", "0:a",
            "-af", f"afade=t=out:st={fade_to_black_start}:d={fade_to_black}",
            *H264_EXPORT_ARGS,
            str(seg_tail_final),
        ])
        segments.append(seg_tail_final)

        # 3. Real footage has now run out and the picture is already black.
        # Hold the text on plain black (no frame here to freeze), then
        # fade the text out over solid black.
        if black_hold > 0:
            segments.append(_solid_text_clip(text_group_png, width, height, fps, black_hold,
                                              alpha_fade=None, tmp=Path(tmp), name="black_hold",
                                              sample_rate=sample_rate))
        if final_fade_out > 0:
            fade_out_vf = f"fade=t=out:st=0:d={final_fade_out}:alpha=1"
            segments.append(_solid_text_clip(text_group_png, width, height, fps, final_fade_out,
                                              alpha_fade=fade_out_vf, tmp=Path(tmp), name="final_fadeout",
                                              sample_rate=sample_rate))

        plain_concat(segments, out, width=width, height=height, fps=int(round(fps)))

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
