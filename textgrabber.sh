#!/usr/bin/env bash
# Dependencies: tesseract-ocr gnome-screenshot wl-clipboard (for Wayland), xsel (for X11)

LANGUAGES=${1:-"eng"} # Utilise l'argument ou 'eng' par défaut
SCR_IMG=$(mktemp)
trap "rm $SCR_IMG*" EXIT

gnome-screenshot -a -f "$SCR_IMG.png"

tesseract "$SCR_IMG.png" "$SCR_IMG" -l "$LANGUAGES" &> /dev/null

if [[ "$XDG_SESSION_TYPE" == "wayland" ]]; then
  wl-copy -n < "$SCR_IMG.txt" 
else
  xsel -bi < "$SCR_IMG.txt"
fi

