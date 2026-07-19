#!/usr/bin/env python3
"""
Generate a thumbnail contact sheet from a video using OpenCV: samples N
frames evenly across the duration, labels each with its timestamp, and
tiles them into a single grid image for fast visual review.

CLI:
    python3 contact_sheet.py path/to/clip.mp4 --out video-editing/previews/clip_sheet.jpg \
        --frames 12 --cols 4
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ensure_parent  # noqa: E402


def make_contact_sheet(
    video_path: Path,
    out_path: Path,
    num_frames: int = 12,
    cols: int = 4,
    thumb_width: int = 320,
) -> Path:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    if total_frames <= 0:
        raise RuntimeError(f"Video reports 0 frames: {video_path}")

    indices = sorted(set(np.linspace(0, max(total_frames - 1, 0), num=num_frames, dtype=int).tolist()))

    # Sequential decode, NOT cap.set(CAP_PROP_POS_FRAMES, ...) — OpenCV's
    # frame-index seek is unreliable on many H.264 files (it can land
    # several frames off, silently). That's not a cosmetic problem: this
    # contact sheet is what a human/agent uses to pick exact cut points
    # for trim_clip.py, so a wrong preview frame produces a wrong edit.
    # Reading every frame once is slower but always accurate, and these
    # are short social clips (seconds to low tens of seconds) where the
    # cost is negligible.
    thumbs = []
    wanted = list(indices)
    frame_idx = 0
    while wanted:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx == wanted[0]:
            wanted.pop(0)
            h, w = frame.shape[:2]
            thumb_h = int(thumb_width * h / w)
            thumb = cv2.resize(frame, (thumb_width, thumb_h))

            timestamp_sec = frame_idx / fps
            label = f"{int(timestamp_sec // 60):02d}:{timestamp_sec % 60:05.2f}"
            cv2.rectangle(thumb, (0, thumb_h - 22), (thumb_width, thumb_h), (0, 0, 0), -1)
            cv2.putText(
                thumb, label, (4, thumb_h - 6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA,
            )
            thumbs.append(thumb)
        frame_idx += 1
    cap.release()

    if not thumbs:
        raise RuntimeError(f"No frames extracted from {video_path}")

    rows = (len(thumbs) + cols - 1) // cols
    th, tw = thumbs[0].shape[:2]
    sheet = np.full((rows * th, cols * tw, 3), 30, dtype=np.uint8)
    for i, thumb in enumerate(thumbs):
        r, c = divmod(i, cols)
        sheet[r * th:(r + 1) * th, c * tw:(c + 1) * tw] = thumb

    ensure_parent(out_path)
    cv2.imwrite(str(out_path), sheet)
    return out_path


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--frames", type=int, default=12)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--thumb-width", type=int, default=320)
    args = ap.parse_args()

    out = make_contact_sheet(args.input, args.out, args.frames, args.cols, args.thumb_width)
    print(f"Contact sheet written: {out}")


if __name__ == "__main__":
    main()
