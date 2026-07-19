#!/usr/bin/env python3
"""
Deterministic half of the AI Video Creator's job: given a creative brief's
shot_list and the currently active tool in config/tools.yaml, assemble
each shot into a production-ready prompt using that tool's adapter.

This is the ONLY place tool-specific prompt shaping lives. Swapping tools
means adding one adapter function to ADAPTERS below and flipping
active_video_tool in config/tools.yaml — nothing in the SKILL.md
instructions or schemas changes. See
.claude/skills/zaviqu-ai-video-creator/SKILL.md.

CLI:
    python3 build_asset_instructions.py --campaign anniversary_necklace_reveal \
        --out campaigns/anniversary_necklace_reveal/03_asset_instructions.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import artifact_path, load_avatar, load_brand_memory, load_json, load_tool_config  # noqa: E402

DEFAULT_ASPECT = "9:16"  # primary format; video-editing/resize_video.py handles other aspects downstream


def _brand_style_phrase(brand_memory: dict) -> str:
    tone = ", ".join(brand_memory["tone"])
    return f"{tone}; warm gold accents on any logo/brand moment; never cheap or flashy"


def _negative_prompt(brand_memory: dict) -> str:
    return "; ".join(brand_memory["avoid"])


def _motion_strength_for(camera_movement: str) -> float:
    text = (camera_movement or "").lower()
    if "zoom" in text or "slow" in text or "gentle" in text or "subtle" in text:
        return 0.2
    if "static" in text or "still" in text or "" == text:
        return 0.0
    return 0.35


def build_higgsfield_v1(shot: dict, brand_memory: dict, avatar: dict | None) -> dict:
    prompt_parts = [
        shot["description"],
        f"Setting: {shot.get('setting', 'n/a')}",
        f"Lighting: {shot.get('lighting', 'n/a')}",
        f"Camera: {shot.get('camera_movement', 'static, no motion')}",
        f"Product placement: {shot.get('product_placement', 'n/a')}",
    ]
    if shot.get("wardrobe"):
        prompt_parts.append(f"Wardrobe: {shot['wardrobe']}")
    if avatar:
        prompt_parts.append(f"Subject: {avatar['appearance']} ({avatar['age_range']})")
    prompt_parts.append(f"Style: {_brand_style_phrase(brand_memory)}")
    prompt = ". ".join(prompt_parts) + "."

    reference_image_refs = list(shot.get("reference_image_refs", []))
    if avatar:
        reference_image_refs += avatar.get("approved_references", [])

    return {
        "shot_id": shot["shot_id"],
        "prompt": prompt,
        "negative_prompt": _negative_prompt(brand_memory),
        "aspect_ratio": shot.get("aspect_ratio", DEFAULT_ASPECT),
        "duration_seconds": shot["duration_seconds"],
        "avatar_ref_id": avatar["avatar_id"] if avatar else None,
        "reference_image_refs": reference_image_refs,
        "tool_params": {
            "style_preset": "cinematic-warm-premium",
            "motion_strength": _motion_strength_for(shot.get("camera_movement", "")),
        },
        "output_filename": f"{shot['shot_id']}.mp4",
    }


def build_generic_v1(shot: dict, brand_memory: dict, avatar: dict | None) -> dict:
    """Minimal, tool-agnostic fallback adapter — use as a starting point
    when wiring up a brand-new tool that doesn't need Higgsfield-specific
    styling conventions yet."""
    return {
        "shot_id": shot["shot_id"],
        "prompt": shot["description"],
        "negative_prompt": _negative_prompt(brand_memory),
        "aspect_ratio": shot.get("aspect_ratio", DEFAULT_ASPECT),
        "duration_seconds": shot["duration_seconds"],
        "avatar_ref_id": avatar["avatar_id"] if avatar else None,
        "reference_image_refs": list(shot.get("reference_image_refs", [])),
        "tool_params": {},
        "output_filename": f"{shot['shot_id']}.mp4",
    }


ADAPTERS = {
    "higgsfield_v1": build_higgsfield_v1,
    "generic_v1": build_generic_v1,
}


def build_asset_instructions(campaign_id: str) -> dict:
    brief_path = artifact_path(campaign_id, "creative_brief")
    creative_brief = load_json(brief_path)
    brand_memory = load_brand_memory()
    tool_config = load_tool_config()

    active_tool = tool_config["active_video_tool"]
    prompt_format = tool_config["tools"][active_tool]["prompt_format"]
    if prompt_format not in ADAPTERS:
        raise ValueError(
            f"No adapter registered for prompt_format '{prompt_format}' "
            f"(active_video_tool='{active_tool}'). Add one to ADAPTERS before generating."
        )
    adapter = ADAPTERS[prompt_format]

    campaign_avatar_id = creative_brief.get("avatar_id")
    avatar_by_id: dict[str, dict] = {}
    if campaign_avatar_id:
        avatar_by_id[campaign_avatar_id] = load_avatar(campaign_avatar_id)

    def _avatar_for_shot(shot: dict) -> dict | None:
        # Only inject avatar identity into shots actually cast with that
        # avatar (casting == avatar_id) — "none"/"hands only"/other values
        # must not pick up the campaign's avatar by default.
        casting = shot.get("casting")
        return avatar_by_id.get(casting)

    shots = [adapter(shot, brand_memory, _avatar_for_shot(shot)) for shot in creative_brief["shot_list"]]

    return {
        "campaign_id": campaign_id,
        "derived_from_creative_brief": creative_brief["campaign_id"],
        "tool": active_tool,
        "prompt_format": prompt_format,
        "shots": shots,
        "workflow_steps": [
            f"Generate each shot with {tool_config['tools'][active_tool]['display_name']} using the prompt/params below",
            "Review each generated clip against its shot_id in the creative brief",
            "Upscale if source resolution is below 1080p on the short edge",
            "Reframe/crop to 9:16 at generation time if the tool supports it; otherwise leave to the Video Editing Agent's resize_video.py",
            "Drop accepted clips into video-editing/source/ using output_naming_convention",
        ],
        "output_naming_convention": f"{campaign_id}__<shot_id>.mp4",
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--campaign", required=True)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    result = build_asset_instructions(args.campaign)
    print(json.dumps(result, indent=2))

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
