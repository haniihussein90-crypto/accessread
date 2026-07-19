#!/usr/bin/env bash
# Reinstall everything the Zaviqu video-editing pipeline needs.
#
# This container is ephemeral — ffmpeg and the Python libraries do NOT
# survive a session reset. This script is what's committed to git so the
# environment can be rebuilt in under a minute in a fresh session:
#
#   bash video-editing/scripts/setup_env.sh
#
# Idempotent: safe to run again even if everything is already installed.
set -euo pipefail

echo "== Zaviqu video-editing environment setup =="

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "-- Installing ffmpeg via apt-get --"
  if [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
  else
    SUDO=""
  fi
  $SUDO apt-get update -qq
  $SUDO apt-get install -y ffmpeg
else
  echo "-- ffmpeg already installed: $(ffmpeg -version | head -1) --"
fi

echo "-- Installing Python libraries (moviepy, opencv-python, pyyaml, numpy) --"
python3 -m pip install --quiet --upgrade moviepy opencv-python pyyaml numpy

echo "-- Verifying --"
ffmpeg -version | head -1
python3 -c "import moviepy; print('moviepy', moviepy.__version__)"
python3 -c "import cv2; print('opencv', cv2.__version__)"
python3 -c "import yaml; print('pyyaml OK')"
python3 -c "import numpy; print('numpy', numpy.__version__)"

echo "== Setup complete =="
