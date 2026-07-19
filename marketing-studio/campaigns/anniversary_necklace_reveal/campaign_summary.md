# Campaign summary — anniversary_necklace_reveal

**Status: synthetic architecture test. No real footage or AI-generated
assets exist for this campaign — every artifact below exists to prove the
Marketing Studio's six-stage pipeline and handoff formats work end to
end, not to ship anything.**

## What ran

| Stage | Artifact | How it was produced |
|---|---|---|
| 1. Strategy | `01_strategy.json` | Hand-authored (Marketing Strategist is a creative-writing role) |
| 2. Creative brief | `02_creative_brief.json` | Hand-authored (Creative Director is a creative-writing role) |
| 3. Asset instructions | `03_asset_instructions.json` | **Auto-generated** by `orchestrator/build_asset_instructions.py` via the `higgsfield_v1` adapter |
| 4. Editing brief | `04_editing_brief.yaml` | **Auto-generated** by `orchestrator/build_editing_brief.py` — matches the existing Video Editing Agent's brief schema exactly, with a placeholder `source_file` since no real clips exist |
| 5. Marketing copy | `05_marketing_copy.json` | Hand-authored (Content & Ads Agent is a creative-writing role) |
| 6. QC report | `06_qc_report.json` | **Auto-generated** by `orchestrator/qc_checks.py` |

`python3 marketing-studio/orchestrator/run_campaign.py --campaign anniversary_necklace_reveal`
walks all six stages and confirms every artifact is present and passes
its schema.

## Bugs this test run actually caught (kept as evidence, not hidden)

Building this test surfaced three real issues before any human review —
which is the point of having the schemas/QC in the first place:

1. **`build_asset_instructions.py` was injecting the campaign's avatar
   into every shot**, including `card_tuck` (hands only) and
   `necklace_closeup` (no cast), instead of only the `reveal` shot that
   actually casts her. Fixed — the adapter now only attaches avatar
   identity to shots whose `casting` field matches the avatar_id.
2. **A lowercase "Zaviqu" typo** in `01_strategy.json`'s `offer` field,
   caught by `qc_checks.py`'s `brand_name_spelling` check. Fixed.
3. **A 205-character Facebook primary-text variant** in
   `05_marketing_copy.json`, over the 125-char platform limit. Caught by
   hand while drafting; the `copy_char_limits` check didn't exist yet at
   that point, so it was added to `qc_checks.py` so this class of issue
   is caught automatically from now on, not just this once. Fixed.

## Final QC state (intentionally not a clean pass)

`overall_automated_pass: false`, `approval_status: blocked_automated_failure`.

The one failing check is `avatar_consistency`: the campaign casts
`recipient_woman_late20s` in the `reveal` shot, but that avatar profile's
`status` is `pending_approval` (correctly — no real reference images have
been approved for her yet; see `marketing-studio/avatars/profiles/recipient_woman_late20s.yaml`).

This is left failing on purpose. It's the Avatar Director's governance
gate working exactly as designed: a campaign cannot be approved with an
unapproved avatar, automatically, without anyone having to remember to
check by hand. To clear it in a real run: get the avatar's reference
images approved and flip `status: active` in its profile — not by
editing the QC script.

## What's genuinely NOT tested here

- No real image/video generation — `03_asset_instructions.json` contains
  real, usable Higgsfield prompts, but they were never sent anywhere.
- `04_editing_brief.yaml`'s `source_file` is a placeholder
  (`PENDING_AI_GENERATION__anniversary_necklace_reveal_raw.mp4`) — this
  brief cannot be run through `run_edit.py` yet. Once shots are generated
  and reviewed, `build_editing_brief.prepare_source_from_shots()` produces
  the real source file and real timestamp cuts.
- Only one platform (`instagram_facebook`) — a real TikTok version needs
  its own creative brief with story-paced shots per
  `.claude/skills/zaviqu-creative-director/SKILL.md`, not a resized copy
  of this one (see the note in `00_intake.yaml`).
- The Video Editing Agent's own `quality_check.py` (pixel/codec-level QC)
  never ran — there's no rendered video for it to check yet.
