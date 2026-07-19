#!/usr/bin/env python3
"""
Join an ordered list of clips using a per-junction transition plan —
this is how "clean cuts, gentle fades" (the Zaviqu brand default) and
occasional xfade crossfades get mixed in the same sequence.

Transitions plan: a JSON list with (len(clips) - 1) entries, one per
junction between adjacent clips, e.g. for 3 clips you need 2 entries:
[
  {"type": "cut"},
  {"type": "xfade", "style": "fade", "duration": 0.4}
]
Allowed "type": "cut" (hard cut, no transition), "fade" (alias for a plain
crossfade), "xfade" (ffmpeg xfade filter — set "style" to any xfade
transition name, e.g. fade, dissolve, wipeleft; default "fade").

Consecutive "cut" junctions are merged with plain concat first, then
crossfade transitions are applied between the resulting segments — so a
sequence can freely mix hard cuts and crossfades in one call.

CLI:
    python3 add_transitions.py scene_a.mp4 scene_b.mp4 scene_c.mp4 \
        --plan briefs/transitions.json --out working/assembled.mp4
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import H264_EXPORT_ARGS, check_tools, ensure_parent, get_duration, run  # noqa: E402
from concat_clips import concat as plain_concat  # noqa: E402

DEFAULT_XFADE_DURATION = 0.4


def _group_by_cuts(clips: list[Path], plan: list[dict]) -> tuple[list[list[Path]], list[dict]]:
    """Split clips into segments at non-cut junctions; return segments + the
    transition spec that joins each pair of segments."""
    segments: list[list[Path]] = [[clips[0]]]
    joins: list[dict] = []
    for clip, junction in zip(clips[1:], plan):
        if junction.get("type") == "cut":
            segments[-1].append(clip)
        else:
            segments.append([clip])
            joins.append(junction)
    return segments, joins


def add_transitions(clips: list[Path], plan: list[dict], out: Path,
                     width: int | None = None, height: int | None = None) -> Path:
    check_tools()
    ensure_parent(out)
    if len(plan) != len(clips) - 1:
        raise ValueError(f"Expected {len(clips) - 1} transition entries, got {len(plan)}")

    with tempfile.TemporaryDirectory() as tmp:
        segments, joins = _group_by_cuts(clips, plan)

        # Collapse each cut-run into a single segment file.
        segment_files = []
        for i, group in enumerate(segments):
            if len(group) == 1:
                segment_files.append(group[0])
            else:
                seg_out = Path(tmp) / f"segment_{i}.mp4"
                plain_concat(group, seg_out, width=width, height=height)
                segment_files.append(seg_out)

        if len(segment_files) == 1:
            # Nothing but hard cuts — re-encode to guarantee clean output.
            run(["ffmpeg", "-y", "-i", str(segment_files[0]), *H264_EXPORT_ARGS, str(out)])
            return out

        # Chain xfade (video) + acrossfade (audio) across segments.
        durations = [get_duration(f) for f in segment_files]
        inputs = []
        for f in segment_files:
            inputs += ["-i", str(f)]

        v_label, a_label = "0:v", "0:a"
        running_duration = durations[0]
        filter_lines = []
        for i in range(1, len(segment_files)):
            join = joins[i - 1]
            dur = float(join.get("duration", DEFAULT_XFADE_DURATION))
            style = join.get("style", "fade")
            offset = max(running_duration - dur, 0)

            v_out = f"v{i}"
            a_out = f"a{i}"
            filter_lines.append(
                f"[{v_label}][{i}:v]xfade=transition={style}:duration={dur}:offset={offset}[{v_out}]"
            )
            filter_lines.append(
                f"[{a_label}][{i}:a]acrossfade=d={dur}[{a_out}]"
            )
            v_label, a_label = v_out, a_out
            running_duration = running_duration + durations[i] - dur

        filter_complex = ";".join(filter_lines)
        run([
            "ffmpeg", "-y", *inputs,
            "-filter_complex", filter_complex,
            "-map", f"[{v_label}]", "-map", f"[{a_label}]",
            *H264_EXPORT_ARGS,
            str(out),
        ])
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("clips", type=Path, nargs="+")
    ap.add_argument("--plan", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    args = ap.parse_args()

    plan = json.loads(args.plan.read_text())
    out = add_transitions(args.clips, plan, args.out, args.width, args.height)
    print(f"Transitioned video written: {out}")


if __name__ == "__main__":
    main()
