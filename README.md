# Text Grabber

[![stars](https://img.shields.io/github/stars/Pierre-Thibault/textgrabber-pierrethibault.dev)](https://github.com/Pierre-Thibault/textgrabber-pierrethibault.dev)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![GitHub release (latest by date)](https://img.shields.io/github/v/tag/Pierre-Thibault/textgrabber-pierrethibault.dev)](https://github.com/Pierre-Thibault/textgrabber-pierrethibault.dev/releases/latest)

 
![image](https://github.com/user-attachments/assets/4506a4b4-bd4f-4406-a0ed-6a74ae1814fc)


A GNOME Extension to grab text on the screen using OCR.

## Description

Text Grabber is a simple Gnome Extension based on the Tesseract OCR (Optical Character Recognition) application, enabling the possibility to grab any text on the screen and paste the result as plain text to the clipboard.

### Motivation

Quite often, there is text on the screen that we cannot directly select. This could because this text is integrated inside an image, a video or even a web page (sometimes, the text is in a link or in another place where it is difficult to select). I created Text Grabber to solve this issue.

### Functionalities

- Can appear or not appear in the top panel.
- Assign an optional keyboard shortcut for fast access.
- Define the language(s) to use for Tesseract.
- The GUI offered in English, French and Spanish.

## Requirements

- Bash
- Gnome 46, 47 or 48
- Gnome-Screenshot
- Tesseract with at least one language data model installed
- Wayland or X11

## Installation

1. Download the ZIP archive.
1. Decompress the folder `textgrabber@pierrethibault.dev` inside archive in ~/.local/share/gnome-shell/extensions/. The archive is available the releases section of the GitHub page.
1. Wayland: Logout and login back. X11: Restart the window environment (usually, Alt-F2, r, return) or logout and login back.
1. Open the Gnome Extensions app.
1. Activate Text Grabber in the extension list.

## Usage

By default, the icon will appear on the Gnome Top Panel. Just click the icon, click on the screen and hold the mouse button to create a marquee around the text to grab. If everything works fine, the text is now available in the clipboard. Otherwise, you can also assign a keyboard shortcut if you prefer. The rest is self-explanatory.

### Top Panel: 

![image](https://github.com/user-attachments/assets/fe33fb6b-9431-48c8-88dd-32b73ba7eb4c)

### Preferences:

![image](https://github.com/user-attachments/assets/4fe711de-3aa4-4fe3-86fc-bcd482739eda)

## Author

Pierre Thibault 2025-06-28

## License

[GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html)

## Contribute

Open an issue on the GitHub page. Help for translation in other languages is welcome. I'll keep the contributor list updated based on the contributions made.

## Contributors 🌟

  - Inspired by: [TextSniper](https://www.textsniper.app)
  - The code for managing the keyboard shortcut is from [Caffeine](https://github.com/eonpatapon/gnome-shell-extension-caffeine)
