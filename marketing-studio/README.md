# Zaviqu Marketing Studio

A modular multi-agent system that turns a campaign idea into a fully
specified, QC'd campaign package — strategy, creative concept, AI
generation prompts, an editing brief, platform ad copy, and a quality
report — built around the existing, unchanged **Zaviqu Video Editing
Agent** (`video-editing/`, `.claude/skills/zaviqu-video-editor/`).

This studio does not generate real media. It builds and validates the
*architecture* — agent instructions, shared brand rules, handoff schemas,
and the deterministic bridge scripts between stages — so that when real
assets are ready to be generated, every stage already knows exactly what
shape to hand the next one.

## Status: Version 1.0 — complete

Every stage, schema, and bridge script is built and verified, including a
full real render through the unmodified Video Editing Agent (using
synthetic stand-in clips in place of real Higgsfield output, then cleaned
up — see `campaigns/anniversary_necklace_reveal/campaign_summary.md`).
Four real bugs were found and fixed in that process; none remain open.
The one intentionally-failing check in the example campaign
(`avatar_consistency`) is a governance gate working as designed, not a
defect — it requires a human to approve a real avatar profile, which is
correct behavior, not missing functionality.

**Known, deliberate scope boundaries (not defects) for a real campaign:**
- No tool has actually been called yet — `zaviqu-ai-video-creator`
  produces real, usable prompts, but generating real assets (e.g. via the
  live `higgs_field` MCP tools) is a separate, later, explicit action.
- Only one avatar profile exists, `pending_approval` — a human needs to
  approve real reference images before any avatar-cast campaign can clear
  QC.
- The example campaign covers Instagram/Facebook only; a TikTok campaign
  needs its own story-paced creative brief (the platform machinery itself
  already supports it).

Nothing else in this studio is unfinished. **Do not expand this studio
further (new agents, new stages, new tool integrations) until
explicitly asked** — the next real work here is running an actual
campaign, not adding more architecture.

## The pipeline

```
Strategy → Creative brief → Asset creation instructions → Editing → Marketing copy → Quality control
```

| # | Stage | Agent | Skill | Output |
|---|-------|-------|-------|--------|
| 1 | Strategy | Marketing Strategist | `zaviqu-marketing-strategist` | `01_strategy.json` |
| 2 | Creative brief | Creative Director | `zaviqu-creative-director` | `02_creative_brief.json` |
| 3 | Asset creation instructions | AI Video Creator | `zaviqu-ai-video-creator` | `03_asset_instructions.json` |
| — | *(persistent, cross-campaign)* | Avatar Director | `zaviqu-avatar-director` | `avatars/profiles/*.yaml` |
| 4 | Editing | **Video Editing Agent — existing, unchanged** | `zaviqu-video-editor` | `04_editing_brief.yaml` (bridged into `video-editing/`'s own brief format), then real renders in `video-editing/final/` |
| 5 | Marketing copy | Content & Ads Agent | `zaviqu-content-ads` | `05_marketing_copy.json` |
| 6 | Quality control | Quality-Control Agent | `zaviqu-quality-control` | `06_qc_report.json` |

The master orchestrator, `zaviqu-marketing-studio`
(`.claude/skills/zaviqu-marketing-studio/SKILL.md`), coordinates all
seven agents through this sequence. Run it with:

```bash
python3 marketing-studio/orchestrator/run_campaign.py --campaign <campaign_id>
```

It validates every JSON artifact against its schema, auto-generates the
two mechanical stages (asset instructions, editing brief) if they're
missing, and stops at the first genuinely missing creative-writing stage
— telling you exactly which skill produces it.

## Folder structure

```
marketing-studio/
  brand/
    brand_memory.yaml          permanent brand rules — every agent reads this first
  config/
    tools.yaml                  pluggable AI tool config (Higgsfield today, swappable)
    platforms.yaml               platform specs: aspects, durations, copy character limits
  schemas/                        JSON Schema (draft-07 subset) for every handoff artifact
  orchestrator/
    common.py                     shared paths/loaders
    validate.py                    schema validator (no external dependency)
    build_asset_instructions.py     creative_brief -> tool-specific prompts (adapter pattern)
    build_editing_brief.py           creative_brief + strategy -> video-editing-compatible brief
    qc_checks.py                     automated studio-level QC
    run_campaign.py                   master orchestrator
  avatars/
    profiles/                         persistent avatar identity records (cross-campaign)
  campaigns/
    <campaign_id>/                     one folder per campaign, one file per pipeline stage
```

## Shared brand memory

Every agent — the six new specialists, the reused Video Editing Agent,
and the orchestrator — is expected to have read
`marketing-studio/brand/brand_memory.yaml` before doing anything. It
encodes the permanent rules from this studio's founding brief:

- ZAVIQU spelled correctly, always, all caps
- Logo/brand name in warm gold
- Warm, intimate, premium, emotionally meaningful, cinematic tone
- Primary audience: men buying meaningful gifts for girlfriends or wives
- The customer-written message is the differentiator — not the necklace
- Never invent product features; never call the Signature Box an "LED box"
- No generic template-message positioning
- No voiceover unless specifically requested
- Every concept solves exactly one buyer problem
- Instagram/Facebook 4:5 + 9:16, TikTok 9:16, ad variation support
- Product and message-card accuracy checked before approval

This file does **not** replace `video-editing/brand-assets/brand.yaml` —
that file belongs to the unchanged Video Editing Agent. The two must be
kept in sync by hand (same gold hex, same brand name) since nothing in
this studio is allowed to modify `video-editing/`.

## Swapping the AI generation tool

`marketing-studio/config/tools.yaml` is the only place a specific tool
(Higgsfield, or its eventual replacement) is named. The AI Video Creator
agent reads `active_video_tool` / `active_image_tool` / `active_avatar_tool`
from that file and dispatches to a matching adapter function in
`orchestrator/build_asset_instructions.py`'s `ADAPTERS` dict (keyed by
`prompt_format`). To replace Higgsfield:

1. Add a new block under `tools:` in `config/tools.yaml` with a new
   `prompt_format` and `param_schema`.
2. Write one adapter function in `build_asset_instructions.py` matching
   that `prompt_format`.
3. Flip `active_video_tool` (and/or `active_image_tool`/`active_avatar_tool`)
   to the new tool's key.

Nothing else — no SKILL.md, no schema, no other script — needs to change.

## Avatars

Avatar identity is the one thing in this studio that outlives a single
campaign. `marketing-studio/avatars/profiles/*.yaml` holds appearance,
age range, an approved wardrobe list, personality, voice settings
(off by default per the no-voiceover rule), approved reference images,
and usage rules. Creative briefs reference an avatar by `avatar_id`; the
Avatar Director (and `qc_checks.py`'s `avatar_consistency` check) make
sure briefs don't quietly drift from the approved profile, and that an
avatar isn't used in production until its `status` is `active`.

## Running a campaign

1. Write `marketing-studio/campaigns/<campaign_id>/00_intake.yaml` —
   see `marketing-studio/schemas/campaign_intake.schema.json`. This is the
   only place campaign-specific facts (`product_facts`) get stated; every
   later stage is only allowed to use what's listed here.
2. Invoke the skills in sequence (or let `zaviqu-marketing-studio`
   coordinate): `zaviqu-marketing-strategist` →
   `zaviqu-creative-director` → `zaviqu-ai-video-creator` (or run
   `build_asset_instructions.py` directly) → bridge to editing via
   `build_editing_brief.py` → `zaviqu-content-ads` →
   `zaviqu-quality-control` (or run `qc_checks.py` directly).
3. Run `python3 marketing-studio/orchestrator/run_campaign.py --campaign <id>`
   at any point to check status and validate everything produced so far.
4. Once `03_asset_instructions.json` has been used to actually generate
   and review real clips, drop them somewhere local and call
   `build_editing_brief.prepare_source_from_shots()` (see that script's
   docstring) to concatenate them into `video-editing/source/` and get
   real timestamp cuts — then hand off to the Video Editing Agent exactly
   as documented in `video-editing/README.md`. That step is unchanged,
   existing behavior; this studio only prepares its input.

## Example: `anniversary_necklace_reveal`

`marketing-studio/campaigns/anniversary_necklace_reveal/` is a complete,
synthetic, end-to-end test campaign — every stage's artifact exists and
validates. Its `campaign_summary.md` documents three real bugs the build
caught (a fixed avatar-leakage bug in `build_asset_instructions.py`, a
fixed brand-name typo, a fixed over-length ad copy variant) and explains
why its final QC state is intentionally *not* a clean pass — read it as a
worked example of what this studio actually catches, not just a demo.

## Relationship to the Video Editing Agent

`video-editing/` and `.claude/skills/zaviqu-video-editor/` are untouched
by this expansion — same scripts, same brief format, same QC. This studio
treats that agent as a fixed, trusted downstream consumer: stage 4's job
is producing a brief that agent already knows how to run, not building a
new editing system. See `video-editing/README.md` for how editing itself
actually works.
