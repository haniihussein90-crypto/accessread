# Zaviqu Video Editing Pipeline

A reusable, script-driven video editor for turning raw Zaviqu footage plus
a creative brief into finished, social-ready MP4s using **FFmpeg**,
**MoviePy**, and **OpenCV**. The agent that operates this pipeline is
defined in `.claude/skills/zaviqu-video-editor/SKILL.md` — that file holds
the brand rules, platform rules, and QC checklist; this README covers the
mechanics of running it.

Everything here is command-line driven and reproducible. Nothing is a
one-off manual edit — every operation is a script you can re-run, tweak,
and re-run again.

## Folder structure

```
video-editing/
  source/                    raw footage you provide (NOT committed to git)
  briefs/                    creative briefs, one YAML file per edit (committed)
  working/                   intermediate render files (NOT committed)
  previews/                  contact sheets / low-res previews (NOT committed)
  final/                     finished exports (NOT committed)
    no-text/                 clean versions with no burned-in text
    instagram-facebook/      IG/FB exports
    tiktok/                  TikTok exports
  scripts/                   the pipeline itself (committed)
  brand-assets/              logo, fonts, brand.yaml, music beds (committed, keep small)
  reports/                   QC reports + edit reports (committed — text, not video)
```

Only `scripts/`, `briefs/`, `brand-assets/`, `reports/`, and this README
are meant to be committed. Raw and exported video files are excluded via
`.gitignore` — see "Do not commit large files" below.

## 1. How to add a source video

Copy your raw Zaviqu clip into `video-editing/source/`:

```bash
cp ~/Downloads/zaviqu_raw_01.mp4 video-editing/source/
```

If you're working in Claude Code on the web / a remote session, upload the
file into the session first (attach it in chat, or provide a direct
download URL) — the agent has no access to your local disk or cloud drive
on its own.

## 2. How to create an editing brief

Copy the template and fill in every field:

```bash
cp video-editing/briefs/EXAMPLE_brief.yaml video-editing/briefs/my_edit.yaml
```

(For a TikTok-style story edit, start from
`video-editing/briefs/EXAMPLE_tiktok_brief.yaml` instead.)

A brief captures, in one YAML file:

| Field              | What it means |
|--------------------|----------------|
| `source_file`      | filename inside `source/` |
| `platform`          | documentation only — `export_versions` is what actually renders |
| `final_duration`    | `{min, max}` seconds, used by the QC pass |
| `hook`               | one line describing the opening hook (documentation) |
| `timestamp_cuts`    | named in/out points to pull from the source |
| `scene_order`        | the sequence to play those named scenes in (this is how you rearrange) |
| `transitions`        | one entry per junction: `cut`, `fade`, or `xfade` + style/duration |
| `motion`              | optional slow zoom per scene (`direction: in/out`, `zoom_end`) |
| `on_screen_text`      | timed text overlays (title cards, minimal IG/FB text) |
| `captions`             | timed story captions (TikTok-style) |
| `music_direction`      | music track + volume levels + ducking |
| `cta`                    | the closing CTA card text/duration |
| `cover_frame`             | timestamp (seconds, in the final edit) to grab as the thumbnail |
| `export_versions`         | every platform/aspect/with-or-without-text combo to render |

All timestamps in `timestamp_cuts` are against the **raw source file**.
Everything else (`transitions`, `motion` timing is per-scene not global,
`on_screen_text`, `captions`, `cover_frame`) is against the **assembled,
final-length edit** — i.e. after trimming and reordering, before export.

## 3. How to run the edit

```bash
# One-time per fresh environment:
bash video-editing/scripts/setup_env.sh

# Run the edit:
python3 video-editing/scripts/run_edit.py --brief video-editing/briefs/my_edit.yaml
```

This runs the full pipeline (trim → reorder/transitions → motion → resize
→ text/captions → music → CTA → export) for every entry in
`export_versions`, then writes a contact sheet, a QC report per export,
and a combined edit report.

### Running individual steps

Every step is also a standalone, reusable script — useful for spot-fixing
one part of an edit without re-running the whole brief:

```bash
python3 video-editing/scripts/inspect_video.py video-editing/source/clip.mp4
python3 video-editing/scripts/contact_sheet.py video-editing/source/clip.mp4 --out video-editing/previews/clip_sheet.jpg
python3 video-editing/scripts/trim_clip.py video-editing/source/clip.mp4 --start 1.0 --end 4.0 --out video-editing/working/scene_a.mp4
python3 video-editing/scripts/concat_clips.py working/scene_a.mp4 working/scene_b.mp4 --out working/assembled.mp4
python3 video-editing/scripts/resize_9x16.py working/assembled.mp4 --out working/assembled_916.mp4
python3 video-editing/scripts/resize_4x5.py working/assembled.mp4 --out working/assembled_45.mp4
python3 video-editing/scripts/add_text_overlay.py working/assembled_916.mp4 --spec my_text.json --out working/with_text.mp4
python3 video-editing/scripts/add_captions.py working/assembled_916.mp4 --captions my_captions.json --out working/with_captions.mp4
python3 video-editing/scripts/add_transitions.py scene_a.mp4 scene_b.mp4 --plan my_plan.json --out working/assembled.mp4
python3 video-editing/scripts/add_motion.py working/scene_a.mp4 --out working/scene_a_motion.mp4 --direction in --zoom-end 1.08
python3 video-editing/scripts/mix_audio.py working/with_text.mp4 --music brand-assets/music/theme.mp3 --out working/mixed.mp4
python3 video-editing/scripts/add_cta_ending.py working/mixed.mp4 --text "Create yours at ZAVIQU" --out working/final.mp4
python3 video-editing/scripts/export_final.py working/final.mp4 --out final/instagram-facebook/my_edit_9x16.mp4
python3 video-editing/scripts/quality_check.py final/instagram-facebook/my_edit_9x16.mp4 --aspect 9:16 --min-duration 8 --max-duration 15
```

## 4. Where previews and final files are saved

- **Contact sheet / thumbnail grid**: `video-editing/previews/<name>_contact_sheet.jpg`
- **Cover frame**: next to its final video, `<name>_<aspect>_cover.jpg`
- **Finished, with-text exports**: `video-editing/final/instagram-facebook/` or `video-editing/final/tiktok/`
- **Clean no-text exports**: `video-editing/final/no-text/`
- **QC report (per export)**: `video-editing/reports/<name>_<aspect>_qc.json`
- **Edit report (per brief)**: `video-editing/reports/<name>_edit_report.md` — a
  plain-language log of every step the pipeline took, plus what still
  needs the creative director's manual sign-off

## 5. How to revise an existing edit

The pipeline is fully re-runnable — there's no destructive manual editing
to undo. To revise:

1. Edit the brief YAML directly (change a timestamp, reorder
   `scene_order`, tweak `on_screen_text`, swap the CTA line, etc.).
2. Re-run `python3 video-editing/scripts/run_edit.py --brief <your brief>`.

It regenerates the working files, finals, contact sheet, and QC report
from scratch — nothing carries over stale state. If you only need to
tweak one step (e.g. just the text), call that step's script directly
against the existing `working/<name>/` intermediate files instead of
re-running the whole brief.

## 6. How to recreate the setup if the environment resets

This container is ephemeral — FFmpeg and the Python libraries are **not**
preserved between sessions. Everything needed to rebuild the environment
is committed to git:

```bash
bash video-editing/scripts/setup_env.sh
```

This reinstalls ffmpeg (via apt) and moviepy/opencv-python/pyyaml/numpy
(via pip), then verifies each one. It's idempotent — safe to run even if
some or all of it is already installed. Nothing else needs to be
reconstructed: scripts, briefs, and brand assets live in git and survive
resets on their own.

## Do not commit large files

`source/`, `working/`, `previews/`, and `final/` are all `.gitignore`d —
raw and exported MP4s stay local to the session unless you're explicitly
told to commit one. If you need a deliverable preserved past the session,
download it or push it somewhere outside this repo before the container
is reclaimed.
