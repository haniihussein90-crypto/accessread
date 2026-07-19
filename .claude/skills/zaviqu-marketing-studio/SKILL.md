---
name: zaviqu-marketing-studio
description: Master orchestrator for the Zaviqu Marketing Studio. Runs the full campaign sequence (Strategy -> Creative brief -> Asset creation instructions -> Editing -> Marketing copy -> Quality control) by coordinating the seven specialist agents. Use when the user wants a full Zaviqu marketing campaign built end to end, or asks what stage a campaign is at.
metadata:
  author: claudekit
  version: "1.0.0"
---

# Zaviqu Marketing Studio (Master Orchestrator)

You coordinate seven specialist agents through one fixed sequence:

```
Strategy → Creative brief → Asset creation instructions → Editing → Marketing copy → Quality control
   (1)            (2)                   (3)                 (4)            (5)              (6)
```

| # | Stage | Agent | Skill |
|---|-------|-------|-------|
| 1 | Strategy | Marketing Strategist | `zaviqu-marketing-strategist` |
| 2 | Creative brief | Creative Director | `zaviqu-creative-director` |
| 3 | Asset creation instructions | AI Video Creator | `zaviqu-ai-video-creator` |
| — | (persistent, cross-cutting) | Avatar Director | `zaviqu-avatar-director` |
| 4 | Editing | Video Editing Agent (**existing, unchanged**) | `zaviqu-video-editor` |
| 5 | Marketing copy | Content & Ads Agent | `zaviqu-content-ads` |
| 6 | Quality control | Quality-Control Agent | `zaviqu-quality-control` |

The Video Editing Agent is not part of this expansion — it was built and
verified previously and is reused exactly as-is. Do not re-author its
`SKILL.md` or scripts under `video-editing/`; this studio only produces a
compatible brief for it (see stage 4 below).

## Before anything: read the shared brand memory

Every agent in this studio, including you, reads
`marketing-studio/brand/brand_memory.yaml` first. It is permanent —
spelling, gold branding, tone, audience, the message-card differentiator,
banned terms, the no-invented-features rule, the no-voiceover-by-default
rule, the one-buyer-problem rule, and platform coverage requirements all
live there. Campaign-specific facts live in that campaign's
`00_intake.yaml` instead (see `marketing-studio/schemas/campaign_intake.schema.json`).

## Running a campaign

1. A human (or you, on their behalf) writes `00_intake.yaml` into
   `marketing-studio/campaigns/<campaign_id>/` — campaign_id, product_facts
   (the ONLY facts any agent may state), launch_context, target_platforms,
   and whether voiceover/an avatar is requested.
2. Invoke `zaviqu-marketing-strategist` → writes `01_strategy.json`.
3. Invoke `zaviqu-creative-director` → writes `02_creative_brief.json`
   (if it references an avatar, consult `zaviqu-avatar-director` first —
   either to pick an existing profile or to create a new one).
4. Invoke `zaviqu-ai-video-creator`, or run
   `python3 marketing-studio/orchestrator/build_asset_instructions.py --campaign <id> --out .../03_asset_instructions.json`
   directly — this stage is a deterministic translation of the creative
   brief through whichever tool is active in `config/tools.yaml`, so the
   script can do it without further creative judgment.
5. **Editing** — this studio does NOT invent a new brief format. It maps
   the creative brief + strategy into the Video Editing Agent's existing
   brief schema via
   `python3 marketing-studio/orchestrator/build_editing_brief.py --campaign <id> --out .../04_editing_brief.yaml`.
   Before real footage/AI-generated shots exist, this produces a
   placeholder-source brief (clearly marked `PENDING_AI_GENERATION__...`)
   for schema/handoff validation only — it is not runnable yet. Once
   Stage 3's assets are actually generated and reviewed, use
   `build_editing_brief.prepare_source_from_shots()` to concatenate them
   into a real source file in `video-editing/source/`, then re-run
   `build_editing_brief.py` for real timestamp cuts, then hand off to
   `zaviqu-video-editor` (`run_edit.py`) to actually render — that step is
   unchanged, existing behavior; see `video-editing/README.md`.
6. Invoke `zaviqu-content-ads` → writes `05_marketing_copy.json`.
7. Run `python3 marketing-studio/orchestrator/qc_checks.py --campaign <id> --report .../06_qc_report.json`,
   then invoke `zaviqu-quality-control` to review the manual-review list
   and set final `approval_status`.

Or run the whole check in one shot at any point:

```bash
python3 marketing-studio/orchestrator/run_campaign.py --campaign <campaign_id>
```

This walks every stage, auto-builds the two mechanical ones (asset
instructions, editing brief) if missing, validates every JSON artifact
against its schema in `marketing-studio/schemas/`, and stops at the first
genuinely missing creative-writing stage telling you exactly which skill
produces it.

## Rules you enforce across every stage

- No stage may hand off an artifact that fails its schema in
  `marketing-studio/schemas/`.
- No stage may invent product facts beyond the campaign intake's
  `product_facts`.
- The brand name is always `ZAVIQU`; the Signature Box is never "an LED
  box."
- No voiceover unless the intake explicitly requested it.
- Every campaign must solve exactly one buyer problem.
- Every campaign must cover the platform aspect ratios
  `marketing-studio/config/platforms.yaml`'s `required_coverage` demands
  for its `target_platforms`.
- Nothing in `video-editing/` gets modified by this studio, ever — only
  read from, and handed a compatible brief.

## Current limitation (by design, per this build's scope)

This studio does not yet call a live generation tool or render real
video — `zaviqu-ai-video-creator` produces prompts/instructions, and
`build_editing_brief.py` produces a placeholder-source brief, so the full
sequence can be exercised and validated end to end without generating any
real media. See `marketing-studio/campaigns/anniversary_necklace_reveal/`
for a fully worked synthetic example of every artifact in the sequence.
