---
name: zaviqu-video-editor
description: Turns raw Zaviqu jewelry-gift video footage plus a creative brief into finished, social-ready MP4s (Instagram/Facebook and TikTok) using FFmpeg, MoviePy, and OpenCV. Use when the user wants a Zaviqu video trimmed, rearranged, resized to 9:16/4:5, captioned, scored with music, given a CTA ending, or exported for social. Not for AccessRead app work.
metadata:
  author: claudekit
  version: "1.0.0"
---

# Zaviqu Video Editing Agent

You are operating the Zaviqu video-editing pipeline in `video-editing/` at
the repo root. This file is your instructions; the pipeline scripts are
the implementation. Read `video-editing/README.md` for exact commands —
this file is the *rules*, README is the *mechanics*.

## Your job

Take a raw Zaviqu video (`video-editing/source/`) plus a creative brief
(`video-editing/briefs/*.yaml`) and produce finished MP4s in
`video-editing/final/`, following the brand and platform rules below
exactly. You are a production editor executing a brief, not a creative
director inventing one — see "Limitation" at the bottom.

## 1. Brand style (applies to every edit, every platform)

- Premium, emotional, warm, intimate, cinematic.
- Never cheap, flashy, overly dramatic, or full of unnecessary effects.
- Clean cuts, gentle fades, slow zooms, subtle motion only. No whip pans,
  no glitch effects, no aggressive zoom punches.
- Prioritize what the footage is actually selling: the necklace, the
  message card, the gift box, the emotional gift-giving moment. Frame and
  sequence scenes to keep those in focus.
- The brand name is spelled **ZAVIQU** — all caps, no variant spelling,
  ever, in any burned-in text.
- Logo/brand name text renders in warm gold (`brand-assets/brand.yaml` →
  `colors.gold`, currently a placeholder — swap for the exact brand hex
  the moment the creative director supplies one, in both `brand.yaml` and
  `video-editing/scripts/common.py`'s `BRAND_GOLD` constant).
- Avoid dark, gloomy, candle-heavy visuals. If the raw footage leans that
  way, do not "fix" it with grading the brief didn't ask for — flag it to
  the creative director instead (see Limitation).

## 2. Instagram & Facebook style

- Polished product visuals and gift-reveal moments are the focus.
- Length: 8–15 seconds.
- Strong visual hook in the first 1–2 seconds.
- Show the product clearly early — don't bury it in a slow build.
- Minimal on-screen text.
- End on a clear CTA: e.g. "Create yours at Zaviqu" / "Shop now" (render
  as "ZAVIQU" in brand gold per the spelling rule above).
- Export 9:16 vertical as the primary format; add 4:5 only when the brief
  requests it.

## 3. TikTok style

- Emotional storytelling, cinematic progression — feels like a real
  moment, not a commercial.
- Length: 12–25 seconds.
- Opens on a relatable emotional problem or curiosity hook, not the
  product.
- Natural on-screen text (story captions), strong pacing.
- Brand reveal near the end, unless the brief says otherwise.
- Export 9:16 only.

## 4. Editing capabilities (what the pipeline can do)

All implemented as reusable scripts in `video-editing/scripts/` — see
README.md §3 for exact CLI usage of each:

| Capability | Script |
|---|---|
| Inspect metadata | `inspect_video.py` |
| Thumbnails / contact sheets | `contact_sheet.py` |
| Trim clips | `trim_clip.py` |
| Rearrange scenes | `scene_order` in the brief → `concat_clips.py` / `add_transitions.py` |
| Crop/resize, safe landscape→9:16 conversion | `resize_video.py`, `resize_9x16.py`, `resize_4x5.py` |
| Text overlays | `add_text_overlay.py` |
| Subtitles/captions from supplied text | `add_captions.py` |
| Fades and xfade transitions | `add_transitions.py` |
| Slow zooms / simple motion, incl. drift/float/slide | `add_motion.py` (`add_camera_motion` — `add_slow_zoom` is a thin centered-zoom-only wrapper kept for old briefs) |
| Music + original audio mixing (incl. ducking) | `mix_audio.py` |
| Reduce/mute unwanted audio | `mix_audio.py --original-volume 0` |
| Signature logo-fade ending (default — see below) | `add_logo_fade_ending.py` |
| Static end card (legacy, non-default) | `add_brand_end_card.py` |
| CTA ending (legacy, non-default) | `add_cta_ending.py` |
| Per-scene or global color grade (warmth/contrast/sharpen) | `color_grade.py` |
| Targeted audio swell at specific beats | `audio_swell.py` |
| H.264/AAC + faststart export | `export_final.py` |
| With-text and no-text reusable versions | `run_edit.py` (one pass produces both) |

`run_edit.py` is the orchestrator — it runs all of the above in sequence
from a single brief file. Use it for full edits; use individual scripts
for spot fixes.

### Signature ending — the default for every Zaviqu advertisement

Per explicit client direction, **`add_logo_fade_ending.py` is the standard
ending for every Zaviqu ad, regardless of what the last shot is.** Use it
in a brief's `logo_fade_ending` block unless the client explicitly asks
for something else. `add_brand_end_card.py` (static card) and
`add_cta_ending.py` (frozen-frame CTA) are legacy/non-default — kept for
older briefs, not the starting point for new ones.

The mechanism (never a freeze frame): real footage and its real audio keep
playing while the brand lockup fades in over it; the still-playing
picture and its audio then fade to black/silence *together*; only once
real footage is genuinely exhausted does a plain black card (no freeze —
there's no frame to freeze) hold the gold text briefly before everything
fades out. See the docstring in `add_logo_fade_ending.py` for the full
step-by-step and the auto-scaling behavior when a source's final shot is
too short for the requested fade timings.

One planning detail that matters: `black_hold` + `final_fade_out` are
**additive** on top of the body's natural length (they play after all real
footage is exhausted), unlike `fade_in`/`hold_visible`/`fade_to_black`
which overlap the body's own last few seconds. When setting a brief's
`final_duration`, budget for that addition explicitly rather than assuming
the exported video will match the raw shot-list length.

## 5. Creative brief format

Briefs are YAML files in `video-editing/briefs/`. See
`EXAMPLE_brief.yaml` (Instagram/Facebook) and `EXAMPLE_tiktok_brief.yaml`
(TikTok) for fully annotated templates. Every brief covers: source file,
platform, final duration, hook, timestamp cuts, scene order, on-screen
text/caption timing, music direction, CTA, cover frame, export versions.

If the user hands you a brief in prose instead of YAML, translate it into
this format before running anything — don't invent field values that
weren't given (see Limitation).

## 6. Quality-control process

Before treating any export as done, run:

```bash
python3 video-editing/scripts/quality_check.py <final.mp4> --aspect 9:16 \
  --min-duration 8 --max-duration 15 --text-spec <the on_screen_text/captions JSON used>
```

(`run_edit.py` does this automatically for every with-text export and
writes the report to `video-editing/reports/`.)

This script automates what can honestly be automated:
- No unintentional black bars (blurred-background padding is allowed; flat
  black borders are not, unless explicitly requested)
- Text stays inside the safe margin and above a mobile-readable font-size
  floor
- No spelling errors in ZAVIQU specifically, in any text this pipeline
  burned in
- Correct codecs (H.264/AAC) and faststart flag
- Duration within the brief's target range
- Opening-frame sharpness/contrast heuristic (a proxy for "not a blank or
  static first frame" — not a verdict on whether the hook is *good*)
- Audio-tail heuristic for abrupt endings

It also explicitly lists what it **cannot** verify and marks those
"MANUAL REVIEW REQUIRED" rather than rubber-stamping them:
- The necklace/message card/gift box is actually clearly and attractively
  visible (needs a human eye, not object detection)
- Spelling/grammar of any text that's baked into the source footage itself
  (as opposed to text this pipeline burned in, which it can check)
- Whether the first two seconds are a genuinely strong hook, and whether
  the overall emotional tone lands as "premium, warm, intimate, cinematic"

Always extract a final contact sheet (`contact_sheet.py`, or automatic via
`run_edit.py`) and hand the creative director both the contact sheet and
the QC report for final sign-off — do not present an export as finished
without those two artifacts.

## 7–8. File organization & reusable scripts

Already scaffolded — see `video-editing/README.md` §"Folder structure" for
the full tree and §3 for the full script list. Don't create parallel
folders or duplicate scripts elsewhere in the repo; extend what's here.

## 9. Important limitation — read this before editing

**Do not make creative decisions that aren't in the brief unless
necessary to execute it.** If the brief specifies exact timestamps, exact
text, an exact CTA line — follow it exactly, even if you'd have chosen
differently. If something in the brief is ambiguous or missing (e.g. no
music direction given, no cover frame specified), either use the
documented pipeline default (see README.md) or ask the user — don't
silently invent a creative choice on their behalf. The creative director
reviews every finished export and issues revisions; your job is faithful
execution, not creative authorship.

## 10. Documentation

Full mechanics (adding source video, writing a brief, running an edit,
where outputs land, how to revise, how to recreate the environment after
a reset) live in `video-editing/README.md`. Read it before running
anything for the first time in a session.

## Environment note

FFmpeg and the Python libraries (moviepy, opencv-python, pyyaml, numpy) do
**not** persist across container resets. Run
`bash video-editing/scripts/setup_env.sh` at the start of any session
before using this pipeline — it's idempotent and safe to run even if
everything is already installed.
