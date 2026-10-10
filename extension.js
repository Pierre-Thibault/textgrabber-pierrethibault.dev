import Clutter from 'gi://Clutter';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { schemaKeys } from "./const.js";
import { getAvailableLanguages } from "./languages.js";
import { HAS_CONTROLLERS, ScreenOCR } from "./screenocr.js";

export default class extends Extension {
  constructor(metadata) {
    super(metadata);
    this._button = null;
    this._buttonSignalHandler = null;
    this._keyboardShortcutChangeSignalHandler = null;
    this._settings = null;
    this._screenOCR = null;
    this._quitSourceId = null;
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
    ];
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
      this._button = new PanelMenu.Button(0.0, 'Text Grabber');
      // Gnome 50+: remove the gesture opening the menu with any button
      this._button.clear_actions();

      // Use an icon instead of text
      let icon = new St.Icon({
        icon_name: 'zoom-fit-best-symbolic',
        style_class: 'system-status-icon'
      });

      this._button.add_child(icon);

      // Menu opened with a right-click
      this._button.menu.addAction(_('Settings'), () => this.openPreferences());
      this._button.menu.addAction(_('Quit'), () => {
        // Wait for the menu item to finish handling the click: disabling destroys it
        this._quitSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
          this._quitSourceId = null;
          Main.extensionManager.disableExtension(this.uuid);
          return GLib.SOURCE_REMOVE;
        });
      });

      // Left-click grabs text, right-click opens the menu
      if (HAS_CONTROLLERS) {
        const clickGesture = new Clutter.ClickGesture();
        clickGesture.connect('recognize', () => {
          if (clickGesture.get_button() === Clutter.BUTTON_SECONDARY) {
            this._button.menu.toggle();
          } else {
            this._grabText();
          }
        });
        this._button.add_action(clickGesture);
      } else {
        // PanelMenu.Button opens the menu on any press: only let the right button through
        this._button.connect('event', (_actor, event) => {
          const type = event.type();
          if (type === Clutter.EventType.BUTTON_PRESS || type === Clutter.EventType.TOUCH_BEGIN) {
            return type === Clutter.EventType.BUTTON_PRESS && event.get_button() === Clutter.BUTTON_SECONDARY
              ? Clutter.EVENT_PROPAGATE
              : Clutter.EVENT_STOP;
          }
          return Clutter.EVENT_PROPAGATE;
        });
        this._button.connect('button-release-event', (_actor, event) => {
          if (event.get_button() === Clutter.BUTTON_SECONDARY) {
            return Clutter.EVENT_PROPAGATE;
          }
          this._grabText();
          return Clutter.EVENT_STOP;
        });
      }

      Main.panel.addToStatusArea('textgrabber', this._button);
    } else if (!show && this._button) {
      this._button.destroy();
      this._button = null;
    }
  }

  _bindShortcut() {
    // Add shortcut from settings (default: <Super>t from schema)
    this._addKeybinding();

    // Listen for shortcut changes
    this._keyboardShortcutChangeSignalHandler = this._settings.connect(`changed::${schemaKeys.textgrabberShortcut}`, () => {
      Main.wm.removeKeybinding(schemaKeys.textgrabberShortcut);
      this._addKeybinding();
    });
  }

  _addKeybinding() {
    Main.wm.addKeybinding(
      schemaKeys.textgrabberShortcut,
      this._settings,
      Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => this._grabText()
    );
  }

  _grabText() {
    // Only one grab at a time
    if (this._screenOCR) {
      return;
    }
    let languages = this._settings.get_strv(schemaKeys.tesseractLanguages);
    let engine = this._settings.get_string(schemaKeys.ocrEngine);
    const screenOCR = new ScreenOCR();
    this._screenOCR = screenOCR;
    screenOCR.grabText(languages, engine).catch(_ => { }).finally(() => {
      if (this._screenOCR === screenOCR) {
        this._screenOCR = null;
      }
    });
  }

  disable() {
    if (this._quitSourceId) {
      GLib.Source.remove(this._quitSourceId);
      this._quitSourceId = null;
    }
    // Remove the selection overlay if a grab is in progress
    this._screenOCR?.cancel();
    this._screenOCR = null;
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
