#!/usr/bin/env python3
"""
Studio-level, pre-production QC — checks a campaign's written artifacts
(strategy, creative brief, asset instructions, marketing copy, editing
brief) against marketing-studio/brand/brand_memory.yaml's permanent
rules. This is distinct from video-editing/scripts/quality_check.py,
which checks a *rendered video file* after export — both gates run, ask
different questions, and neither replaces the other (see
.claude/skills/zaviqu-quality-control/SKILL.md).

Only automates what can honestly be automated from text; everything else
is explicitly listed in manual_review_required rather than rubber-stamped.

CLI:
    python3 qc_checks.py --campaign anniversary_necklace_reveal
    python3 qc_checks.py --campaign anniversary_necklace_reveal --report campaigns/anniversary_necklace_reveal/06_qc_report.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    artifact_path, load_avatar, load_brand_memory,
    load_json, load_platform_config, load_yaml,
)

MIN_READABLE_FONT_FRACTION = 0.035  # same floor video-editing/scripts/quality_check.py uses
REFERENCE_FRAME_HEIGHT = 1920


def _misspelling_pattern(brand_name: str) -> re.Pattern:
    return re.compile(r"\bzav[iy1l]?qu\w*\b", re.IGNORECASE)


def _walk_strings(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from _walk_strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _walk_strings(v)


def check_brand_spelling(brand_memory: dict, artifacts: dict) -> dict:
    brand_name = brand_memory["brand_name"]
    pattern = _misspelling_pattern(brand_name)
    issues = []
    for artifact_name, data in artifacts.items():
        if data is None:
            continue
        for s in _walk_strings(data):
            for match in pattern.finditer(s):
                if match.group(0) != brand_name:
                    issues.append({"artifact": artifact_name, "found": match.group(0), "in_text": s})
    return {"check": "brand_name_spelling", "pass": len(issues) == 0, "details": issues}


def check_banned_terms(brand_memory: dict, artifacts: dict) -> dict:
    banned = [t.lower() for t in brand_memory["product_terminology"]["banned_terms"]]
    issues = []
    for artifact_name, data in artifacts.items():
        if data is None:
            continue
        for s in _walk_strings(data):
            low = s.lower()
            for term in banned:
                if term in low:
                    issues.append({"artifact": artifact_name, "banned_term": term, "in_text": s})
    return {"check": "banned_terminology", "pass": len(issues) == 0, "details": issues}


def check_invented_features(intake: dict, creative_brief: dict | None, marketing_copy: dict | None) -> dict:
    """Heuristic: flag capitalized noun phrases / feature-sounding claims in
    creative brief + copy that share no keyword overlap with product_facts.
    This is intentionally conservative (keyword overlap, not full NLP) —
    false negatives are expected; it's a safety net, not a guarantee."""
    facts_text = " ".join(intake.get("product_facts", [])).lower()
    fact_words = set(re.findall(r"[a-z]{4,}", facts_text))
    suspects = []
    for artifact_name, data in [("creative_brief", creative_brief), ("marketing_copy", marketing_copy)]:
        if not data:
            continue
        for s in _walk_strings(data):
            for phrase in re.findall(r"\b(engrav\w+|waterproof|24k|solid gold|gemstone|diamond|warranty)\b", s, re.IGNORECASE):
                if phrase.lower() not in fact_words and phrase.lower() not in facts_text:
                    suspects.append({"artifact": artifact_name, "phrase": phrase, "in_text": s})
    return {
        "check": "invented_features_heuristic",
        "pass": len(suspects) == 0,
        "details": suspects,
        "note": "Keyword heuristic only — always cross-check product claims against product_facts by hand too.",
    }


def check_single_buyer_problem(strategy: dict | None) -> dict:
    if not strategy:
        return {"check": "single_buyer_problem", "pass": False, "details": "no strategy artifact found"}
    problem = strategy.get("buyer_problem", "")
    # Heuristic: multiple problems often get stitched with " and " / ";" / multiple sentences.
    splitters = len(re.findall(r"\band\b|;", problem, re.IGNORECASE))
    sentence_count = len([s for s in re.split(r"[.!?]", problem) if s.strip()])
    flagged = splitters > 1 or sentence_count > 1
    return {
        "check": "single_buyer_problem",
        "pass": not flagged,
        "details": {"buyer_problem": problem, "and_or_semicolon_count": splitters, "sentence_count": sentence_count},
        "note": "HEURISTIC — flags likely multi-problem phrasing; a human call either way.",
    }


def check_voiceover_rule(strategy: dict | None, creative_brief: dict | None, asset_instructions: dict | None) -> dict:
    requested = bool(strategy and strategy.get("voiceover_requested"))
    issues = []
    if not requested:
        for artifact_name, data in [("creative_brief", creative_brief), ("asset_instructions", asset_instructions)]:
            if not data:
                continue
            for s in _walk_strings(data):
                if re.search(r"\bvoice[- ]?over\b|\bnarrat\w*\b|\bdialogue\b", s, re.IGNORECASE):
                    issues.append({"artifact": artifact_name, "in_text": s})
    return {"check": "voiceover_rule", "pass": len(issues) == 0, "details": issues}


def check_avatar_consistency(creative_brief: dict | None, asset_instructions: dict | None) -> dict:
    avatar_id = (creative_brief or {}).get("avatar_id")
    if not avatar_id:
        return {"check": "avatar_consistency", "pass": True, "details": "no avatar used"}
    try:
        profile = load_avatar(avatar_id)
    except FileNotFoundError as e:
        return {"check": "avatar_consistency", "pass": False, "details": str(e)}

    issues = []
    if profile.get("status") != "active":
        issues.append(f"avatar '{avatar_id}' status is '{profile.get('status')}', not 'active'")

    approved_wardrobe = set(profile.get("wardrobe", []))
    for shot in (creative_brief or {}).get("shot_list", []):
        if shot.get("casting") == avatar_id and shot.get("wardrobe"):
            if approved_wardrobe and shot["wardrobe"] not in approved_wardrobe:
                issues.append(
                    f"shot '{shot.get('shot_id')}' wardrobe '{shot['wardrobe']}' not in "
                    f"avatar '{avatar_id}' approved wardrobe {sorted(approved_wardrobe)}"
                )
    return {"check": "avatar_consistency", "pass": len(issues) == 0, "details": issues}


def check_platform_coverage(platform_config: dict, intake: dict, editing_brief: dict | None) -> dict:
    required = platform_config["required_coverage"]
    target_platforms = intake.get("target_platforms", [])
    if not editing_brief:
        return {"check": "platform_format_coverage", "pass": False, "details": "no editing brief found yet"}

    produced_aspects = {}
    for v in editing_brief.get("export_versions", []):
        produced_aspects.setdefault(v["platform"], set()).add(v["aspect"])

    issues = []
    for platform in target_platforms:
        needed = set(required.get(platform, []))
        have = produced_aspects.get(platform, set())
        missing = needed - have
        if missing:
            issues.append(f"{platform}: missing aspect(s) {sorted(missing)}")
    return {"check": "platform_format_coverage", "pass": len(issues) == 0, "details": issues}


def check_copy_char_limits(platform_config: dict, marketing_copy: dict | None) -> dict:
    if not marketing_copy:
        return {"check": "copy_char_limits", "pass": True, "details": "no marketing copy found"}
    platforms = platform_config["platforms"]
    issues = []
    for pname, pdata in marketing_copy.get("platforms", {}).items():
        limits = platforms.get(pname, {})
        for field, limit_key in [("headline_variants", "headline_max_chars"),
                                  ("primary_text_variants", "primary_text_max_chars")]:
            limit = limits.get(limit_key)
            if not limit:
                continue
            for text in pdata.get(field, []):
                if len(text) > limit:
                    issues.append(f"{pname}.{field}: {len(text)} chars > {limit} limit — \"{text}\"")
    return {"check": "copy_char_limits", "pass": len(issues) == 0, "details": issues}


def check_text_readability(creative_brief: dict | None) -> dict:
    if not creative_brief:
        return {"check": "text_readability_and_margins", "pass": True, "details": "no creative brief found"}
    issues = []
    min_size = MIN_READABLE_FONT_FRACTION * REFERENCE_FRAME_HEIGHT
    for overlay in creative_brief.get("text_overlays", []):
        size = overlay.get("size", 64)
        if size < min_size:
            issues.append(f"'{overlay.get('text')}' font size {size}px below mobile-readable floor {min_size:.0f}px")
    return {"check": "text_readability_and_margins", "pass": len(issues) == 0, "details": issues}


def run_qc(campaign_id: str) -> dict:
    brand_memory = load_brand_memory()
    platform_config = load_platform_config()

    def _maybe_load(name, loader):
        path = artifact_path(campaign_id, name)
        return loader(path) if path.exists() else None

    intake = _maybe_load("campaign_intake", load_yaml) or {}
    strategy = _maybe_load("strategy", load_json)
    creative_brief = _maybe_load("creative_brief", load_json)
    asset_instructions = _maybe_load("asset_instructions", load_json)
    editing_brief = _maybe_load("editing_brief", load_yaml)
    marketing_copy = _maybe_load("marketing_copy", load_json)

    artifacts_for_text_scan = {
        "strategy": strategy,
        "creative_brief": creative_brief,
        "marketing_copy": marketing_copy,
        "editing_brief": editing_brief,
    }

    checks = [
        check_brand_spelling(brand_memory, artifacts_for_text_scan),
        check_banned_terms(brand_memory, artifacts_for_text_scan),
        check_invented_features(intake, creative_brief, marketing_copy),
        check_single_buyer_problem(strategy),
        check_voiceover_rule(strategy, creative_brief, asset_instructions),
        check_avatar_consistency(creative_brief, asset_instructions),
        check_platform_coverage(platform_config, intake, editing_brief),
        check_text_readability(creative_brief),
        check_copy_char_limits(platform_config, marketing_copy),
    ]

    overall_pass = all(c["pass"] for c in checks)

    manual_review_required = [
        "Product and message-card accuracy in the actual rendered frame (once real assets exist)",
        "Whether the emotional angle genuinely lands, not just whether it's stated",
        "Whether the concept feels premium/warm/intimate rather than merely claiming to",
        "Avatar likeness consistency in generated footage (this only checks brief/prompt references)",
        "Overall marketing strength / competitive differentiation",
    ]

    approval_status = "approved" if overall_pass else "blocked_automated_failure"
    if overall_pass and manual_review_required:
        approval_status = "pending_manual_review"

    return {
        "campaign_id": campaign_id,
        "automated_checks": checks,
        "overall_automated_pass": overall_pass,
        "manual_review_required": manual_review_required,
        "approval_status": approval_status,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--campaign", required=True)
    ap.add_argument("--report", type=Path)
    args = ap.parse_args()

    result = run_qc(args.campaign)
    print(json.dumps(result, indent=2))

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
