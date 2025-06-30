import St from 'gi://St';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { schemaKeys } from "./const.js";
import { getAvailableLanguages } from "./languages.js";
import { ScreenOCR } from "./screenocr.js";

export default class extends Extension {
  constructor(metadata) {
    super(metadata);
    this._button = null;
    this._buttonSignalHandler = null;
    this._keyboardShortcutChangeSignalHandler = null;
    this._settings = null;
  }

  enable() {
    this._ensureDependencies();

    // Load settings
    this._settings = this.getSettings();

    // Manage button visibility
    let showButton = this._settings.get_boolean(schemaKeys.showButton);
    this._updateButton(showButton);

    // Listen for changes to button visibility
    this._buttonSignalHandler = this._settings.connect(`changed::${schemaKeys.showButton}`, () => {
      this._updateButton(this._settings.get_boolean(schemaKeys.showButton));
    });

    // Set up keyboard shortcut
    this._bindShortcut();
  }

  _ensureDependencies() {
    // Throw an error if something is missging  

    const errorMessages = [];

    // Check dependencies
    const dependencies = [
      'tesseract',
      'gnome-screenshot',
    ];
    switch (GLib.getenv('XDG_SESSION_TYPE')) {
      case "wayland":
        dependencies.push("wl-copy");
        break;
      case "x11":
        dependencies.push("xsel");
        break;
      default:
        errorMessages.push(_("Not running on X11 or Wayland."));
    }
    const missingDependencies = [];
    for (const command of dependencies) {
      if (!GLib.find_program_in_path(command)) {
        missingDependencies.push(command);
      }
    }

    // Build error message
    if (missingDependencies.length !== 0) {
      errorMessages.push(_('Missing dependencies: ') + missingDependencies.join(', ') + '.');
    }
    if (missingDependencies.includes("tesseract")) {
      errorMessages.push(_('Ensure to install Tesseract with your language(s).'));
    }
    else if (getAvailableLanguages().length === 0) {
      errorMessages.push(_('No known Tesseract languages installed.'));
    }

    // Throw if we found an error
    if (errorMessages.length) {
      throw new Error(errorMessages.join(' '));
    }
  }

  _updateButton(show) {
    if (show && !this._button) {
      this._button = new PanelMenu.Button({ reactive: true, track_hover: true, style_class: 'panel-button' });

      // Use an icon instead of text
      let icon = new St.Icon({
        icon_name: 'zoom-fit-best-symbolic',
        style_class: 'system-status-icon'
      });

      this._button.add_child(icon);
      this._button.connect('button-press-event', () => {
        this._grabText();
      });

      Main.panel.addToStatusArea('textgrabber', this._button);
    } else if (!show && this._button) {
      this._button.destroy();
      this._button = null;
    }
  }

  _bindShortcut() {
    // Add shortcut from settings (default: <Super>t from schema)
    Main.wm.addKeybinding(
      schemaKeys.textgrabberShortcut,
      this._settings,
      Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => this._grabText()
    );

    // Listen for shortcut changes
    this._keyboardShortcutChangeSignalHandler = this._settings.connect(`changed::${schemaKeys.textgrabberShortcut}`, () => {
      Main.wm.removeKeybinding(schemaKeys.textgrabberShortcut);
      Main.wm.addKeybinding(
        schemaKeys.textgrabberShortcut,
        this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.ALL,
        () => this._grabText()
      );
    });
  }

  _grabText() {
    let languages = this._settings.get_strv(schemaKeys.tesseractLanguages);
    let langString = languages.join('+');
    new ScreenOCR().grabText(langString).catch(_ => { });
  }

  disable() {
    this._button?.destroy();
    this._button = null;
    if (this._buttonSignalHandler) {
      this._settings.disconnect(this._buttonSignalHandler);
      this._buttonSignalHandler = null;
    }
    if (this._keyboardShortcutChangeSignalHandler) {
      this._settings.disconnect(this._keyboardShortcutChangeSignalHandler);
      this._keyboardShortcutChangeSignalHandler = null;
    }
    Main.wm.removeKeybinding(schemaKeys.textgrabberShortcut);
    this._settings = null;
  }
}
