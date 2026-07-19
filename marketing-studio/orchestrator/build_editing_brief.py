#!/usr/bin/env python3
"""
Bridge script: turns a locked creative_brief.json + asset_instructions.json
into a brief in the EXISTING Video Editing Agent's format (the same shape
as video-editing/briefs/EXAMPLE_brief.yaml) — WITHOUT modifying anything
under video-editing/. The Video Editing Agent's brief schema assumes one
continuous source_file trimmed into named scenes by timestamp; AI-generated
shots come out as separate clip files instead, so this script bridges the
gap in one of two ways:

1. BEFORE real assets exist (this studio's current state): produces the
   brief with a clearly-marked placeholder source_file and timestamp_cuts
   computed from each shot's *planned* duration, as if the shots will be
   concatenated in shot_list order into one raw take. This is enough to
   validate the handoff shape and run the Video Editing Agent's own
   quality_check.py logic against a schema, but it is NOT runnable against
   real footage yet.

2. AFTER real per-shot clips are generated and placed in video-editing/source/:
   call prepare_source_from_shots() with the actual generated files: it
   ffprobes their real durations, concatenates them in shot_list order into
   one raw take via ffmpeg (a one-off local operation, not a change to the
   Video Editing Agent itself), writes that into video-editing/source/, and
   returns the *real* timestamp_cuts to use instead of the planned ones.

CLI (placeholder / pre-media mode):
    python3 build_editing_brief.py --campaign anniversary_necklace_reveal \
        --out campaigns/anniversary_necklace_reveal/04_editing_brief.yaml
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    VIDEO_EDITING_DIR, artifact_path, load_brand_memory, load_json,
    load_platform_config,
)

ASPECTS_BY_PLATFORM = {
    "instagram_facebook": ["9:16", "4:5"],
    "tiktok": ["9:16"],
}


def _cumulative_cuts(shot_list: list[dict]) -> list[dict]:
    cuts = []
    t = 0.0
    for shot in shot_list:
        start, end = t, t + shot["duration_seconds"]
        cuts.append({"id": shot["shot_id"], "start": round(start, 2), "end": round(end, 2)})
        t = end
    return cuts


def build_editing_brief(campaign_id: str, source_file: str | None = None,
                         real_cuts: list[dict] | None = None) -> dict:
    creative_brief = load_json(artifact_path(campaign_id, "creative_brief"))
    strategy = load_json(artifact_path(campaign_id, "strategy"))
    brand_memory = load_brand_memory()

    shot_list = creative_brief["shot_list"]
    scene_order = [s["shot_id"] for s in shot_list]
    cuts = real_cuts or _cumulative_cuts(shot_list)
    total_duration = cuts[-1]["end"] if cuts else 0.0

    export_versions = []
    for platform in strategy["target_platforms"]:
        for aspect in ASPECTS_BY_PLATFORM.get(platform, []):
            export_versions.append({
                "platform": platform,
                "aspect": aspect,
                "resize_mode": "blur_pad",
                "with_text": True,
                "no_text_copy": True,
            })

    brief = {
        "name": campaign_id,
        "source_file": source_file or f"PENDING_AI_GENERATION__{campaign_id}_raw.mp4",
        "platform": strategy["target_platforms"][0],
        "final_duration": {"min": round(total_duration * 0.9, 1), "max": round(total_duration * 1.1, 1)},
        "hook": strategy["hook"],
        "cover_frame": round(total_duration * 0.2, 1),
        "timestamp_cuts": cuts,
        "scene_order": scene_order,
        "transitions": [{"type": "cut"} for _ in range(max(len(scene_order) - 1, 0))],
        "motion": [],
        "on_screen_text": creative_brief.get("text_overlays", []),
        "captions": creative_brief.get("captions", []),
        "music_direction": {"track": None, "volume": 0.45, "original_volume": 0.9, "duck": True},
        "cta": {"text": strategy["cta"], "duration": 1.8, "color": brand_memory["colors"]["gold"]},
        "export_versions": export_versions,
    }
    return brief


def prepare_source_from_shots(campaign_id: str, shot_files: dict[str, Path]) -> tuple[Path, list[dict]]:
    """Concatenate real per-shot clips (shot_id -> file path, already
    generated and reviewed) into one raw take in video-editing/source/,
    in creative-brief shot_list order, and return (source_path, real_cuts)
    ready to pass into build_editing_brief(). Requires ffprobe/ffmpeg —
    reuses the same tools the Video Editing Agent depends on, but does not
    import or modify any of its scripts.
    """
    import subprocess

    creative_brief = load_json(artifact_path(campaign_id, "creative_brief"))
    ordered_ids = [s["shot_id"] for s in creative_brief["shot_list"]]
    ordered_files = [shot_files[sid] for sid in ordered_ids]

    out_path = VIDEO_EDITING_DIR / "source" / f"{campaign_id}_raw.mp4"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    durations = []
    for f in ordered_files:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
            capture_output=True, text=True, check=True,
        )
        durations.append(float(probe.stdout.strip()))

    inputs = []
    filter_parts = []
    for i, f in enumerate(ordered_files):
        inputs += ["-i", str(f)]
        filter_parts.append(f"[{i}:v:0][{i}:a:0]")
    filter_complex = "".join(filter_parts) + f"concat=n={len(ordered_files)}:v=1:a=1[v][a]"

    subprocess.run(
        ["ffmpeg", "-y", *inputs, "-filter_complex", filter_complex,
         "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out_path)],
        check=True,
    )

    cuts, t = [], 0.0
    for sid, dur in zip(ordered_ids, durations):
        cuts.append({"id": sid, "start": round(t, 2), "end": round(t + dur, 2)})
        t += dur

    return out_path, cuts


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--campaign", required=True)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    brief = build_editing_brief(args.campaign)
    text = yaml.safe_dump(brief, sort_keys=False, allow_unicode=True)
    print(text)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text)


if __name__ == "__main__":
    main()
