#!/usr/bin/env python3
"""
Master orchestrator for the Zaviqu Marketing Studio. Walks a campaign
through the fixed sequence:

    Strategy -> Creative brief -> Asset creation instructions ->
    Editing -> Marketing copy -> Quality control

Three of those stages (Strategy, Creative brief, Marketing copy) are
inherently creative writing — this script does not author them. Run the
matching skill (zaviqu-marketing-strategist, zaviqu-creative-director,
zaviqu-content-ads) to produce each artifact, then re-run this script to
validate and continue. Two stages (Asset creation instructions, Editing)
are mechanical translations of already-written artifacts and this script
CAN auto-generate them (via build_asset_instructions.py /
build_editing_brief.py) when missing. Quality control always runs last
via qc_checks.py.

This script never touches video-editing/ except to read
config for aspect ratios that must match what the Video Editing Agent
supports — it does not invoke run_edit.py itself. Actually rendering a
campaign is a separate, later, explicit action once real assets exist.

CLI:
    python3 run_campaign.py --campaign anniversary_necklace_reveal
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ARTIFACT_FILENAMES, ORCH_DIR, artifact_path, campaign_dir  # noqa: E402

STAGE_ORDER = [
    "campaign_intake",
    "strategy",
    "creative_brief",
    "asset_instructions",
    "editing_brief",
    "marketing_copy",
    "qc_report",
]

AUTO_BUILDABLE = {"asset_instructions", "editing_brief"}
RESPONSIBLE_SKILL = {
    "campaign_intake": "(provided by the human / creative director, not an agent)",
    "strategy": "zaviqu-marketing-strategist",
    "creative_brief": "zaviqu-creative-director",
    "asset_instructions": "zaviqu-ai-video-creator (auto-buildable once creative_brief exists)",
    "editing_brief": "zaviqu-video-editor handoff, built from creative_brief + strategy (auto-buildable)",
    "marketing_copy": "zaviqu-content-ads",
    "qc_report": "zaviqu-quality-control (auto-run by this script)",
}

SCHEMA_NAME = {
    "campaign_intake": "campaign_intake",
    "strategy": "strategy",
    "creative_brief": "creative_brief",
    "asset_instructions": "asset_instructions",
    "marketing_copy": "marketing_copy",
    "qc_report": "qc_report",
    # editing_brief intentionally has no schema here — it must conform to
    # the EXISTING Video Editing Agent's brief format instead (see
    # video-editing/README.md), which this studio does not redefine.
}


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def run_campaign(campaign_id: str) -> int:
    cdir = campaign_dir(campaign_id)
    if not cdir.exists():
        print(f"No campaign folder at {cdir}")
        return 1

    print(f"== Zaviqu Marketing Studio — campaign '{campaign_id}' ==\n")

    for stage in STAGE_ORDER:
        path = artifact_path(campaign_id, stage)
        exists = path.exists()

        if not exists and stage in AUTO_BUILDABLE:
            print(f"[{stage}] missing — auto-generating...")
            builder = {
                "asset_instructions": "build_asset_instructions.py",
                "editing_brief": "build_editing_brief.py",
            }[stage]
            result = _run([sys.executable, str(ORCH_DIR / builder), "--campaign", campaign_id, "--out", str(path)])
            if result.returncode != 0:
                print(f"[{stage}] FAILED to auto-generate:\n{result.stderr}")
                return 1
            exists = path.exists()

        if not exists and stage == "qc_report":
            print(f"[{stage}] running Quality-Control Agent checks...")
            result = _run([sys.executable, str(ORCH_DIR / "qc_checks.py"), "--campaign", campaign_id, "--report", str(path)])
            print(result.stdout)
            exists = path.exists()

        if not exists:
            print(f"[{stage}] MISSING — needs: {RESPONSIBLE_SKILL[stage]}")
            print(f"\nStopped at stage '{stage}'. Run that agent/skill, then re-run this orchestrator.")
            return 2

        schema = SCHEMA_NAME.get(stage)
        if schema and path.suffix == ".json":
            result = _run([sys.executable, str(ORCH_DIR / "validate.py"), "--schema", schema, "--data", str(path)])
            status = "OK" if result.returncode == 0 else "INVALID"
            print(f"[{stage}] present — schema check: {status}")
            if result.returncode != 0:
                print(result.stdout)
                return 1
        else:
            print(f"[{stage}] present")

    print(f"\nAll stages present for campaign '{campaign_id}'.")
    print(f"See {campaign_dir(campaign_id) / ARTIFACT_FILENAMES['qc_report']} for the final approval status.")
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--campaign", required=True)
    args = ap.parse_args()
    sys.exit(run_campaign(args.campaign))


if __name__ == "__main__":
    main()
