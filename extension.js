import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { KEYS } from "./const.js"

export default class extends Extension {
  constructor(metadata) {
    super(metadata);
    this._button = null;
    this._settings = null;
  }

  enable() {
    const dependencies = {
      tesseract: 'tesseract',
      gnomeScreenshot: 'gnome-screenshot',
      clipboard: GLib.getenv('XDG_SESSION_TYPE') === 'wayland' ? 'wl-copy' : 'xsel'
    };

    const missingDependencies = [];

    for (let [name, command] of Object.entries(dependencies)) {
      if (!GLib.find_program_in_path(command)) {
        missingDependencies.push(command);
        Main.notifyError(_('TextGrabber'), _(`The required command "${command}" is not available. Please install it to use the ${name} feature.`));
      }
    }

    if (missingDependencies.length !== 0) {
      // Lancer une exception pour indiquer l'échec de l'activation
      throw new Error(_('Activation failed: Missing dependencies: ') + missingDependencies.join(', '));
    }

    // Load settings
    this._settings = this.getSettings();

    // Manage button visibility
    let showButton = this._settings.get_boolean(KEYS.show_button);
    this._updateButton(showButton);

    // Listen for changes to button visibility
    this._settings.connect(`changed::${KEYS.show_button}`, () => {
      this._updateButton(this._settings.get_boolean(KEYS.show_button));
    });

    // Set up keyboard shortcut
    this._bindShortcut();
  }

  _updateButton(show) {
    if (show && !this._button) {
      this._button = new PanelMenu.Button({ reactive: true, track_hover: true, style_class: 'panel-button' });

      // Use an icon instead of text
      let icon = new St.Icon({
        icon_name: 'zoom-fit-best-symbolic', // edit-copy-symbolic', // Fallback system icon
        // gicon: Gio.icon_new_for_string(this.path + '/icon-light.png'),
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
      KEYS.textgrabber_shortcut,
      this._settings,
      Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => this._grabText()
    );

    // Listen for shortcut changes
    this._settings.connect(`changed::${KEYS.textgrabber_shortcut}`, () => {
      Main.wm.removeKeybinding(KEYS.textgrabber_shortcut);
      Main.wm.addKeybinding(
        KEYS.textgrabber_shortcut,
        this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.ALL,
        () => this._grabText()
      );
    });
  }

  _grabText() {
    try {
      let languages = this._settings.get_strv(KEYS.tesseract_languages);
      let langString = languages.length > 0 ? languages.join('+') : 'eng';
      let scriptPath = this.path + '/textgrabber.sh';
      GLib.spawn_command_line_async(`${scriptPath} ${langString}`);
    } catch (e) {
      Main.notifyError(_('TextGrabber'), _('Error: ') + e.message);
    }
  }

  disable() {
    if (this._button) {
      this._button.destroy();
      this._button = null;
    }
    Main.wm.removeKeybinding(KEYS.textgrabber_shortcut);
    this._settings = null;
  }
}
