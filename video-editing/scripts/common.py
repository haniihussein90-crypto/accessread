"""
Shared utilities for the Zaviqu video-editing pipeline.
Every script in this folder imports from here instead of re-implementing
ffmpeg/ffprobe plumbing, so behavior (encoding settings, brand constants,
safe margins) stays consistent across the whole pipeline.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPTS_DIR = Path(__file__).resolve().parent
ROOT = SCRIPTS_DIR.parent  # video-editing/
SOURCE_DIR = ROOT / "source"
BRIEFS_DIR = ROOT / "briefs"
WORKING_DIR = ROOT / "working"
PREVIEWS_DIR = ROOT / "previews"
FINAL_DIR = ROOT / "final"
FINAL_NO_TEXT_DIR = FINAL_DIR / "no-text"
FINAL_IG_FB_DIR = FINAL_DIR / "instagram-facebook"
FINAL_TIKTOK_DIR = FINAL_DIR / "tiktok"
BRAND_ASSETS_DIR = ROOT / "brand-assets"
REPORTS_DIR = ROOT / "reports"

# ---------------------------------------------------------------------------
# Brand constants (rules #1 in the agent brief)
# ---------------------------------------------------------------------------
# Placeholder warm-gold hex. Swap for the exact Pantone/hex from the official
# Zaviqu brand guide the moment the creative director supplies one — nothing
# else in the pipeline needs to change, every script reads it from here.
BRAND_GOLD = "#D4AF37"
BRAND_WHITE = "#FFFFFF"
BRAND_NAME = "ZAVIQU"

# Fraction of frame width/height kept clear of text on every edge, so
# captions/CTAs never collide with platform UI (like/comment stack, captions
# tray) on Instagram, Facebook, or TikTok mobile players.
SAFE_MARGIN_FRACTION = 0.10

# Target export frame sizes (even dimensions required by libx264 yuv420p).
ASPECT_SIZES = {
    "9:16": (1080, 1920),
    "4:5": (1080, 1350),
    "1:1": (1080, 1080),
}

# Encoding profile used for every final export (rule: H.264/AAC + faststart).
H264_EXPORT_ARGS = [
    "-c:v", "libx264",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-preset", "medium",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
]


class PipelineError(RuntimeError):
    """Raised when an editing step fails; carries the failing command."""


def run(cmd: list[str], quiet: bool = True) -> subprocess.CompletedProcess:
    """Run a subprocess command (ffmpeg/ffprobe), raising with full output on failure."""
    cmd = [str(c) for c in cmd]
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise PipelineError(
            f"Command failed ({result.returncode}): {' '.join(cmd)}\n"
            f"--- stderr ---\n{result.stderr[-4000:]}"
        )
    if not quiet:
        print(" ".join(cmd), file=sys.stderr)
    return result


def check_tools() -> None:
    """Fail fast with a clear message if ffmpeg/ffprobe aren't on PATH."""
    missing = [t for t in ("ffmpeg", "ffprobe") if shutil.which(t) is None]
    if missing:
        raise PipelineError(
            f"Missing required tool(s): {', '.join(missing)}. "
            f"Run video-editing/scripts/setup_env.sh first."
        )


def ffprobe_json(path: Path) -> dict:
    check_tools()
    result = run([
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        str(path),
    ])
    return json.loads(result.stdout)


def video_stream(probe: dict) -> dict:
    for s in probe.get("streams", []):
        if s.get("codec_type") == "video":
            return s
    raise PipelineError("No video stream found")


def audio_stream(probe: dict) -> dict | None:
    for s in probe.get("streams", []):
        if s.get("codec_type") == "audio":
            return s
    return None


def get_duration(path: Path) -> float:
    probe = ffprobe_json(path)
    return float(probe["format"]["duration"])


def parse_timecode(tc) -> float:
    """Accept 'HH:MM:SS.ms', 'MM:SS.ms', or a bare number of seconds."""
    if isinstance(tc, (int, float)):
        return float(tc)
    tc = str(tc).strip()
    parts = tc.split(":")
    parts = [float(p) for p in parts]
    while len(parts) < 3:
        parts.insert(0, 0.0)
    h, m, s = parts
    return h * 3600 + m * 60 + s


def hex_to_ffmpeg_color(hex_color: str) -> str:
    """'#D4AF37' -> '0xD4AF37' as ffmpeg drawtext expects."""
    return "0x" + hex_color.lstrip("#")


def ensure_parent(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def safe_margin_px(width: int, height: int) -> tuple[int, int]:
    """(margin_x, margin_y) in pixels for the configured safe-margin fraction."""
    return (int(width * SAFE_MARGIN_FRACTION), int(height * SAFE_MARGIN_FRACTION))
