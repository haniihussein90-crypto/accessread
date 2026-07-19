# Campaign summary — anniversary_necklace_reveal

**Status: synthetic architecture test, used as the Version 1.0
verification campaign. No real footage or AI-generated assets exist for
this campaign — every committed artifact below exists to prove the
Marketing Studio's six-stage pipeline and handoff formats work end to
end, not to ship anything. The bridge into the Video Editing Agent was
additionally proven with a real (synthetic-input) render — see "Full
real-render verification" below — then cleaned up so `video-editing/`
stays untouched.**

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

Building and then stress-testing this campaign surfaced four real issues
before any human review — which is the point of having the
schemas/QC/integration test in the first place:

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
4. **`build_editing_brief.py`'s `final_duration` estimate didn't account
   for the CTA card `run_edit.py` appends after the assembled scenes** —
   it computed the range from scene length alone, so the Video Editing
   Agent's own QC duration check would fail on every real campaign with a
   CTA (i.e. nearly all of them). Caught by actually running a real
   render through this brief (see "Full real-render verification" below),
   not just validating shapes. Fixed — the estimate now adds the CTA
   duration before computing the range.

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

## Full real-render verification (done once, then cleaned up)

To answer "would this actually work on a real campaign" with evidence
instead of assertion, the full bridge was exercised for real, once,
using three synthetic stand-in clips (matching `03_asset_instructions.json`'s
shot durations and 9:16 aspect) in place of real Higgsfield output:

1. `build_editing_brief.prepare_source_from_shots()` concatenated the
   three stand-in clips into a real source file and computed real
   timestamp cuts — worked correctly on the first attempt.
2. The resulting brief was run through the actual, unmodified
   `video-editing/scripts/run_edit.py` — full render, both 9:16 and 4:5,
   text overlays, CTA card, no-text copies, contact sheet, edit report.
   This is where bug #4 above was caught (`automated_pass=False` on
   duration) and then confirmed fixed (`automated_pass=True` on
   re-render, both aspect versions).
3. All test-only files (the stand-in clips, the generated source/working/
   final/preview/report files, the throwaway brief) were deleted
   afterward — `video-editing/` has zero diff from its committed state
   (`git diff --stat -- video-editing` is empty). Only the
   `build_editing_brief.py` fix and this campaign's own artifacts were
   kept.

## What's genuinely still NOT exercised

- No real image/video generation was ever sent to Higgsfield or any other
  tool — `03_asset_instructions.json` contains real, usable prompts, but
  the verification above used synthetic placeholder clips standing in for
  what that tool would produce, not actual Higgsfield output.
- `04_editing_brief.yaml` as committed still has a placeholder
  `source_file` (`PENDING_AI_GENERATION__...`) — the real-cuts path was
  proven separately (above) and deleted rather than left half-finished in
  this campaign's committed artifacts.
- Only one platform (`instagram_facebook`) has a written creative brief —
  a real TikTok version needs its own creative brief with story-paced
  shots per `.claude/skills/zaviqu-creative-director/SKILL.md`, not a
  resized copy of this one (see the note in `00_intake.yaml`). The
  platform-coverage machinery itself (schema, config, QC check) supports
  TikTok; it's just untested by this particular campaign.
