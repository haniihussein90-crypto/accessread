#!/usr/bin/env python3
"""
Orchestrator: reads one creative brief (YAML) and runs the full Zaviqu
editing pipeline end to end — trim, reorder, transitions, motion, resize,
text/captions, music, CTA, export — producing every requested platform
version plus a no-text copy, a contact sheet, a QC report, and a
human-readable edit report.

See video-editing/README.md for the full brief format and
video-editing/briefs/EXAMPLE_brief.yaml for an annotated example.

CLI:
    python3 run_edit.py --brief video-editing/briefs/my_brief.yaml
"""
from __future__ import annotations

import argparse
import datetime
import json
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (  # noqa: E402
    BRIEFS_DIR, FINAL_DIR, FINAL_NO_TEXT_DIR, PREVIEWS_DIR, REPORTS_DIR,
    ROOT, SOURCE_DIR, WORKING_DIR, ensure_parent,
)
from add_brand_end_card import add_brand_end_card  # noqa: E402
from add_captions import build_spec as build_caption_spec  # noqa: E402
from add_cta_ending import add_cta_ending  # noqa: E402
from add_logo_fade_ending import add_logo_fade_ending  # noqa: E402
from add_motion import add_slow_zoom  # noqa: E402
from add_text_overlay import add_overlays  # noqa: E402
from add_transitions import add_transitions  # noqa: E402
from audio_swell import apply_swells  # noqa: E402
from color_grade import grade as color_grade  # noqa: E402
from contact_sheet import make_contact_sheet  # noqa: E402
from export_final import export_final  # noqa: E402
from mix_audio import mix_audio  # noqa: E402
from quality_check import run_quality_check  # noqa: E402
from resize_video import resize as resize_video  # noqa: E402
from trim_clip import trim as trim_clip  # noqa: E402

PLATFORM_FOLDERS = {
    "instagram_facebook": FINAL_DIR / "instagram-facebook",
    "tiktok": FINAL_DIR / "tiktok",
}
ASPECT_SLUGS = {"9:16": "9x16", "4:5": "4x5", "1:1": "1x1"}


def load_brief(path: Path) -> dict:
    return yaml.safe_load(path.read_text())


def run_edit(brief_path: Path) -> dict:
    brief = load_brief(brief_path)
    name = brief["name"]
    log: list[str] = []

    work_dir = WORKING_DIR / name
    work_dir.mkdir(parents=True, exist_ok=True)

    source = SOURCE_DIR / brief["source_file"]
    if not source.exists():
        raise FileNotFoundError(
            f"Source file not found: {source}\n"
            f"Drop the raw Zaviqu clip into video-editing/source/ and reference it "
            f"by filename in the brief's source_file field."
        )
    log.append(f"Loaded brief '{name}' — source: {source}")

    # 1. Trim each scene defined in timestamp_cuts.
    scene_files: dict[str, Path] = {}
    for cut in brief["timestamp_cuts"]:
        scene_id = cut["id"]
        scene_path = work_dir / f"scene_{scene_id}.mp4"
        trim_clip(source, cut["start"], cut["end"], scene_path)
        scene_files[scene_id] = scene_path
        log.append(f"Trimmed scene '{scene_id}': {cut['start']}–{cut['end']} -> {scene_path.name}")

    # 2. Optional per-scene motion (slow zoom), applied before assembly.
    for m in brief.get("motion", []):
        scene_id = m["scene"]
        motion_path = work_dir / f"scene_{scene_id}_motion.mp4"
        add_slow_zoom(scene_files[scene_id], motion_path,
                       zoom_end=m.get("zoom_end", 1.08), direction=m.get("direction", "in"))
        scene_files[scene_id] = motion_path
        log.append(f"Applied slow zoom ({m.get('direction', 'in')}) to scene '{scene_id}'")

    # 2b. Optional per-scene color grade (e.g. a sharpen/sparkle boost on one
    # close-up shot only), applied before assembly so it doesn't touch other scenes.
    for g in brief.get("scene_grade", []):
        scene_id = g["scene"]
        grade_path = work_dir / f"scene_{scene_id}_graded.mp4"
        color_grade(scene_files[scene_id], grade_path, warmth=g.get("warmth", 0.0),
                    contrast=g.get("contrast", 0.0), sharpen=g.get("sharpen", 0.0))
        scene_files[scene_id] = grade_path
        log.append(f"Applied per-scene grade (sharpen={g.get('sharpen', 0.0)}) to scene '{scene_id}'")

    # 3. Assemble in scene_order with the transitions plan (default: all cuts).
    ordered_clips = [scene_files[s] for s in brief["scene_order"]]
    plan = brief.get("transitions") or [{"type": "cut"} for _ in range(len(ordered_clips) - 1)]
    assembled = work_dir / "assembled.mp4"
    if len(ordered_clips) == 1:
        import shutil
        shutil.copy(ordered_clips[0], assembled)
    else:
        add_transitions(ordered_clips, plan, assembled)
    log.append(f"Assembled {len(ordered_clips)} scene(s) in order {brief['scene_order']} "
               f"with transitions plan {plan}")

    # 4. Mix music / original audio once on the assembled master (aspect-independent).
    music_dir_spec = brief.get("music_direction") or {}
    music_track = None
    if music_dir_spec.get("track"):
        music_track = (SOURCE_DIR / music_dir_spec["track"])
        if not music_track.exists():
            music_track = Path(music_dir_spec["track"])  # allow absolute/brand-assets path
    mixed = work_dir / "mixed.mp4"
    mix_audio(
        assembled, mixed,
        music=music_track,
        music_volume=music_dir_spec.get("volume", 0.5),
        original_volume=music_dir_spec.get("original_volume", 1.0),
        duck=music_dir_spec.get("duck", False),
    )
    log.append(f"Mixed audio (music={'yes' if music_track else 'no'}, "
               f"original_volume={music_dir_spec.get('original_volume', 1.0)})")

    # 4b. Optional targeted audio swell (emotional lift at specific beats),
    # applied on top of whatever mix_audio already set.
    swells = brief.get("audio_swell", [])
    if swells:
        swelled = work_dir / "swelled.mp4"
        apply_swells(mixed, swells, swelled)
        mixed = swelled
        log.append(f"Applied {len(swells)} audio swell window(s)")

    # 4c. Optional global color grade (warmth/contrast), applied once so
    # every export version shares the same look.
    global_grade_spec = brief.get("global_grade") or {}
    if global_grade_spec:
        graded_master = work_dir / "graded_master.mp4"
        color_grade(mixed, graded_master, warmth=global_grade_spec.get("warmth", 0.0),
                    contrast=global_grade_spec.get("contrast", 0.0))
        mixed = graded_master
        log.append(f"Applied global grade (warmth={global_grade_spec.get('warmth', 0.0)}, "
                   f"contrast={global_grade_spec.get('contrast', 0.0)})")

    on_screen_text = brief.get("on_screen_text", [])
    captions = build_caption_spec(brief.get("captions", []))
    full_text_spec = on_screen_text + captions
    cta = brief.get("cta")
    end_card = brief.get("end_card")
    logo_fade_ending = brief.get("logo_fade_ending")

    outputs = []
    qc_reports = []

    for version in brief["export_versions"]:
        platform = version["platform"]
        aspect = version["aspect"]
        slug = ASPECT_SLUGS[aspect]
        mode = version.get("resize_mode", "blur_pad")

        resized = work_dir / f"{name}_{slug}_resized.mp4"
        resize_video(mixed, resized, aspect, mode)
        log.append(f"Resized to {aspect} ({mode}) for {platform}")

        # --- with-text version ---
        if version.get("with_text", True):
            current = resized
            if full_text_spec:
                texted = work_dir / f"{name}_{slug}_text.mp4"
                add_overlays(current, full_text_spec, texted)
                current = texted
                log.append(f"Burned in {len(full_text_spec)} text/caption overlay(s) for {aspect}")
            if logo_fade_ending:
                fade_out_path = work_dir / f"{name}_{slug}_logofade.mp4"
                logo_path = Path(logo_fade_ending["lockup"])
                if not logo_path.is_absolute() and not logo_path.exists():
                    logo_path = ROOT / logo_path
                add_logo_fade_ending(
                    current, fade_out_path,
                    lockup=logo_path,
                    brand_promise=logo_fade_ending["brand_promise"],
                    website=logo_fade_ending["website"],
                    fade_in=logo_fade_ending.get("fade_in", 1.0),
                    hold_visible=logo_fade_ending.get("hold_visible", 2.0),
                    fade_to_black=logo_fade_ending.get("fade_to_black", 1.2),
                    black_hold=logo_fade_ending.get("black_hold", 1.0),
                    final_fade_out=logo_fade_ending.get("final_fade_out", 0.8),
                    gold_color=logo_fade_ending.get("gold_color", "#D4AF37"),
                )
                current = fade_out_path
                log.append(f"Appended logo-fade ending over final frame for {aspect}")
            elif end_card:
                card_out = work_dir / f"{name}_{slug}_endcard.mp4"
                logo_path = Path(end_card["logo"])
                if not logo_path.is_absolute() and not logo_path.exists():
                    logo_path = ROOT / logo_path
                add_brand_end_card(
                    current, card_out,
                    logo=logo_path,
                    tagline_line1=end_card["tagline_line1"],
                    tagline_line2=end_card["tagline_line2"],
                    duration=end_card.get("duration", 1.6),
                    bg_color=end_card.get("bg_color", "#D8C9A8"),
                    gold_color=end_card.get("gold_color", "#D4AF37"),
                )
                current = card_out
                log.append(f"Appended branded end card ({end_card.get('duration', 1.6)}s) for {aspect}")
            elif cta:
                cta_out = work_dir / f"{name}_{slug}_cta.mp4"
                add_cta_ending(current, cta_out, text=cta["text"],
                                duration=cta.get("duration", 2.0), color=cta.get("color", "#D4AF37"))
                current = cta_out
                log.append(f"Appended CTA ending '{cta['text']}' ({cta.get('duration', 2.0)}s) for {aspect}")

            platform_dir = PLATFORM_FOLDERS[platform]
            final_path = platform_dir / f"{name}_{slug}.mp4"
            export_final(current, final_path)
            log.append(f"Exported final: {final_path}")
            outputs.append(final_path)

            extra_text = []
            if cta:
                extra_text.append(cta["text"])
            if end_card:
                extra_text += [end_card["tagline_line1"], end_card["tagline_line2"]]
            if logo_fade_ending:
                extra_text += [logo_fade_ending["brand_promise"], logo_fade_ending["website"]]
            qc = run_quality_check(
                final_path, aspect,
                brief.get("final_duration", {}).get("min"),
                brief.get("final_duration", {}).get("max"),
                [t.get("text", "") for t in full_text_spec] + extra_text,
                full_text_spec,
            )
            qc_path = REPORTS_DIR / f"{name}_{slug}_qc.json"
            ensure_parent(qc_path)
            qc_path.write_text(json.dumps(qc, indent=2))
            qc_reports.append(qc_path)
            log.append(f"QC report written: {qc_path} (automated_pass={qc['overall_automated_pass']})")

        # --- no-text version ---
        if version.get("no_text_copy", True):
            no_text_final = FINAL_NO_TEXT_DIR / f"{name}_{slug}_no-text.mp4"
            export_final(resized, no_text_final)
            log.append(f"Exported no-text version: {no_text_final}")
            outputs.append(no_text_final)

    # 5. Cover frame + contact sheet from the first with-text output.
    cover_source = outputs[0] if outputs else mixed
    if brief.get("cover_frame") is not None and outputs:
        cover_path = outputs[0].with_name(outputs[0].stem + "_cover.jpg")
        from common import run as ffmpeg_run
        ffmpeg_run([
            "ffmpeg", "-y", "-ss", str(brief["cover_frame"]), "-i", str(outputs[0]),
            "-vframes", "1", str(cover_path),
        ])
        log.append(f"Cover frame extracted: {cover_path}")

    sheet_path = PREVIEWS_DIR / f"{name}_contact_sheet.jpg"
    make_contact_sheet(cover_source, sheet_path)
    log.append(f"Contact sheet written: {sheet_path}")

    # 6. Edit report.
    report_path = REPORTS_DIR / f"{name}_edit_report.md"
    ensure_parent(report_path)
    report_path.write_text(_render_report(brief, log, outputs, qc_reports))
    log.append(f"Edit report written: {report_path}")

    for line in log:
        print(line)

    return {"outputs": [str(o) for o in outputs], "report": str(report_path)}


def _render_report(brief: dict, log: list[str], outputs: list[Path], qc_reports: list[Path]) -> str:
    lines = [
        f"# Edit report — {brief['name']}",
        "",
        f"Generated: {datetime.datetime.utcnow().isoformat()}Z",
        f"Source: `{brief['source_file']}`",
        f"Brief hook: {brief.get('hook', '(none given)')}",
        "",
        "## Steps taken",
        "",
    ]
    lines += [f"- {line}" for line in log]
    lines += ["", "## Outputs", ""]
    lines += [f"- `{o}`" for o in outputs]
    lines += ["", "## QC reports", ""]
    lines += [f"- `{q}`" for q in qc_reports]
    lines += [
        "",
        "## Manual review still required",
        "",
        "- Product (necklace / message card / gift box) clearly and attractively visible",
        "- Spelling/grammar of any text baked into the source footage itself",
        "- Overall emotional tone matches the brand style (premium, warm, intimate, cinematic)",
        "- Final creative sign-off per rule #9 — this pipeline follows the brief exactly and "
        "does not make creative decisions beyond it",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--brief", type=Path, required=True)
    args = ap.parse_args()
    run_edit(args.brief)


if __name__ == "__main__":
    main()
