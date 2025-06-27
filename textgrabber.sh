#!/usr/bin/env bash
# Dependencies: tesseract gnome-screenshot wl-copy (for Wayland only), xsel (for X11 only) bash

beep() {
  echo -ne '\007'  # Beep
}

trap 'beep' ERR  # Beep if there is an error or an exit 1
set -e  # Stop the script if there is an error

LANGUAGES=${1:-"eng"}  # eng as default argument
SCR_IMG=$(mktemp)
trap 'rm $SCR_IMG*' EXIT  # cleanup

gnome-screenshot -a -f "$SCR_IMG.png"

tesseract "$SCR_IMG.png" "$SCR_IMG" -l "$LANGUAGES" &> /dev/null

if [ ! -s "$SCR_IMG.txt" ]; then  # Unable to read text
  exit 1
fi

if [[ "$XDG_SESSION_TYPE" == "wayland" ]]; then
  wl-copy -n < "$SCR_IMG.txt" 
else
  xsel -bi < "$SCR_IMG.txt"
fi
