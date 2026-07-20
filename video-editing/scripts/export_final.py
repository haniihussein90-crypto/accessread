#!/usr/bin/env python3
"""
Final export pass: guarantees the output is a clean H.264 (yuv420p) / AAC
MP4 with +faststart, regardless of what codec/container the intermediate
working file happened to be in. Every other pipeline script already
encodes with these settings, so this is usually a fast remux — but running
it as the last, explicit step keeps the guarantee independent of whatever
changes upstream.

Also applies a true-peak safety limiter to the audio. Found on VIDEO 010
(sunset_dinner_v1): audio that's already normalized right up to a -1dBTP
ceiling (mix_audio's normal target) can still measure several dB *over*
0dBTP after passing through the pipeline's several downstream lossy
re-encodes (resize, logo-fade-ending concat, this final pass) — not
because any of those steps raise the gain (sample-level peak stays flat
at 0dB the whole way, verified directly), but because ITU-R BS.1770 "true
peak" measurement accounts for inter-sample reconstruction ringing, and
repeated AAC encode/decode cycles on already-hot audio can push that
reconstructed peak higher each time even though the actual samples never
move. A fast, transparent limiter here guarantees the final delivered
file is safe regardless of how much upstream drift accumulated — the
same defense-in-depth approach already used in audio_swell.py.

CLI:
    python3 export_final.py working/final_with_cta.mp4 --out final/instagram-facebook/gift_reveal_9x16.mp4
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import H264_EXPORT_ARGS, audio_stream, check_tools, ensure_parent, ffprobe_json, run  # noqa: E402


def export_final(src: Path, out: Path) -> Path:
    check_tools()
    ensure_parent(out)
    has_audio = audio_stream(ffprobe_json(src)) is not None
    cmd = ["ffmpeg", "-y", "-i", str(src)]
    if has_audio:
        cmd += ["-af", "alimiter=limit=0.891:attack=5:release=50"]
    cmd += [*H264_EXPORT_ARGS, str(out)]
    run(cmd)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    out = export_final(args.input, args.out)
    print(f"Final MP4 exported: {out}")


if __name__ == "__main__":
    main()
