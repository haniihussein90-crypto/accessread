"""
Shared utilities for the Zaviqu Marketing Studio orchestrator.
Mirrors the pattern in video-editing/scripts/common.py (paths + small
loaders, no framework) — kept deliberately independent of that module so
the two systems never need to import across each other's package
boundary. video-editing/ is not touched by anything in this file.
"""
from __future__ import annotations

import json
from pathlib import Path

import yaml

ORCH_DIR = Path(__file__).resolve().parent
ROOT = ORCH_DIR.parent  # marketing-studio/
REPO_ROOT = ROOT.parent

BRAND_MEMORY_PATH = ROOT / "brand" / "brand_memory.yaml"
CONFIG_DIR = ROOT / "config"
TOOLS_CONFIG_PATH = CONFIG_DIR / "tools.yaml"
PLATFORMS_CONFIG_PATH = CONFIG_DIR / "platforms.yaml"
SCHEMAS_DIR = ROOT / "schemas"
CAMPAIGNS_DIR = ROOT / "campaigns"
AVATARS_DIR = ROOT / "avatars" / "profiles"

VIDEO_EDITING_DIR = REPO_ROOT / "video-editing"  # read-only from here — never write into it except via the documented bridge script


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text())


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def load_brand_memory() -> dict:
    return load_yaml(BRAND_MEMORY_PATH)


def load_tool_config() -> dict:
    return load_yaml(TOOLS_CONFIG_PATH)


def load_platform_config() -> dict:
    return load_yaml(PLATFORMS_CONFIG_PATH)


def campaign_dir(campaign_id: str) -> Path:
    return CAMPAIGNS_DIR / campaign_id


def load_avatar(avatar_id: str) -> dict:
    path = AVATARS_DIR / f"{avatar_id}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"No avatar profile at {path}")
    return load_yaml(path)


ARTIFACT_FILENAMES = {
    "campaign_intake": "00_intake.yaml",
    "strategy": "01_strategy.json",
    "creative_brief": "02_creative_brief.json",
    "asset_instructions": "03_asset_instructions.json",
    "editing_brief": "04_editing_brief.yaml",
    "marketing_copy": "05_marketing_copy.json",
    "qc_report": "06_qc_report.json",
}


def artifact_path(campaign_id: str, artifact: str) -> Path:
    return campaign_dir(campaign_id) / ARTIFACT_FILENAMES[artifact]
