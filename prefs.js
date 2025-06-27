import Adw from "gi://Adw";
import Gdk from 'gi://Gdk';
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GObject from 'gi://GObject';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { schemaKeys } from "./const.js";
import { getAvailableLanguages } from "./languages.js";

const genParam = (type, name, ...dflt) => GObject.ParamSpec[type](name, name, name, GObject.ParamFlags.READWRITE, ...dflt);

export default class extends ExtensionPreferences {

  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    window.add(page);

    const mainGroup = new Adw.PreferencesGroup();
    page.add(mainGroup);

    // Show button toggle
    const showButtonRow = new Adw.ActionRow({
      title: _('Show button in top bar')
    });
    const showButtonSwitch = new Gtk.Switch({
      active: settings.get_boolean(schemaKeys.showButton),
      halign: Gtk.Align.END,
      valign: Gtk.Align.CENTER
    });
    settings.bind(schemaKeys.showButton, showButtonSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    showButtonRow.add_suffix(showButtonSwitch);
    mainGroup.add(showButtonRow);

    // Shortcut group (mostly from https://github.com/eonpatapon/gnome-shell-extension-caffeine)
    let shortcutSettingWidget = new ShortcutSettingWidget(
      settings,
      schemaKeys.textgrabberShortcut,
      _('Toggle shortcut'),
      _('Use Backspace to clear')
    );

    let deleteShortcutButton = new Gtk.Button({
      icon_name: 'edit-delete-symbolic',
      valign: Gtk.Align.CENTER,
      css_classes: ['error'],
      hexpand: false,
      vexpand: false
    });
    deleteShortcutButton.connect('clicked', () => { shortcutSettingWidget.resetAccelerator(); });
    function updateDeleteShortcutButton() {
      deleteShortcutButton.visible = shortcutSettingWidget.isAcceleratorSet();
    }
    updateDeleteShortcutButton();
    settings.connect(`changed::${schemaKeys.textgrabberShortcut}`, updateDeleteShortcutButton);

    // Add elements
    let shortcutGroup = new Adw.PreferencesGroup({
      title: _('Shortcut'),
      header_suffix: deleteShortcutButton
    });
    shortcutGroup.add(shortcutSettingWidget);
    mainGroup.add(shortcutGroup);

    const availableLanguages = getAvailableLanguages();

    // Tesseract languages with checkboxes
    const languagesGroup = new Adw.PreferencesGroup({
      title: _('Text Languages'),
      description: availableLanguages.length ? _('Select languages for OCR') : _('No known Tesseract languages installed.')
    });
    page.add(languagesGroup);

    if (availableLanguages.length) {
      const currentLanguages = settings.get_strv(schemaKeys.tesseractLanguages);
      this._sortLanguages(availableLanguages);
      availableLanguages.forEach(lang => {
        const checkButton = new Gtk.CheckButton({
          label: _(lang.name), // Localize the language name
          active: currentLanguages.includes(lang.code)
        });
        checkButton.connect('toggled', () => {
          let updatedLanguages = settings.get_strv(schemaKeys.tesseractLanguages);
          if (checkButton.active) {
            if (!updatedLanguages.includes(lang.code)) {
              updatedLanguages.push(lang.code);
            }
          } else {
            updatedLanguages = updatedLanguages.filter(l => l !== lang.code);
          }
          settings.set_strv(schemaKeys.tesseractLanguages, updatedLanguages);
        });
        const row = new Adw.ActionRow();
        row.add_prefix(checkButton);
        languagesGroup.add(row);
      });
    } else {
      const noLanguagesRow = new Adw.ActionRow({
        title: _('No languages available'),
        subtitle: _('Install Tesseract language data to enable OCR.')
      });
      languagesGroup.add(noLanguagesRow);
    }
  }

  _sortLanguages(tesseract) {
    // Sort language names in the current language
    const currentLanguage = _("currentLanguage");
    if (currentLanguage === "currentLanguage") {
      return;
    }
    const collation = new Intl.Collator(currentLanguage);
    tesseract.sort((a, b) => {
      return collation.compare(_(a.name), _(b.name));
    });
  }
}

class ShortcutSettingWidget extends Adw.ActionRow {
  static {
    GObject.registerClass({
      Properties: {
        shortcut: genParam('string', 'shortcut', '')
      },
      Signals: {
        changed: { param_types: [GObject.TYPE_STRING] }
      }
    }, this);
  }

  constructor(settings, key, label, sublabel) {
    super({
      title: label,
      subtitle: sublabel,
      activatable: true
    });

    this.shortcutBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      halign: Gtk.Align.CENTER,
      spacing: 5,
      hexpand: false,
      vexpand: false
    });

    this._key = key;
    this._settings = settings;
    this._description = sublabel;

    this.shortLabel = new Gtk.ShortcutLabel({
      disabled_text: _('New accelerator…'),
      valign: Gtk.Align.CENTER,
      hexpand: false,
      vexpand: false
    });

    this.shortcutBox.append(this.shortLabel);

    // Bind signals
    this.connect('activated', this._onActivated.bind(this));
    this.bind_property('shortcut', this.shortLabel, 'accelerator', GObject.BindingFlags.DEFAULT);
    [this.shortcut] = this._settings.get_strv(this._key);

    this.add_suffix(this.shortcutBox);
  }

  isAcceleratorSet() {
    return this.shortLabel.get_accelerator();
  }

  resetAccelerator() {
    this.saveShortcut(); // Clear shortcut
  }

  _onActivated(widget) {
    let ctl = new Gtk.EventControllerKey();

    let content = new Adw.StatusPage({
      title: _('New accelerator…'),
      description: this._description,
      icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic'
    });

    this._editor = new Adw.Window({
      modal: true,
      hide_on_close: true,
      transient_for: widget.get_root(),
      width_request: 480,
      height_request: 320,
      content
    });

    this._editor.add_controller(ctl);
    ctl.connect('key-pressed', this._onKeyPressed.bind(this));
    this._editor.present();
  }

  _onKeyPressed(_widget, keyval, keycode, state) {
    let mask = state & Gtk.accelerator_get_default_mod_mask();
    mask &= ~Gdk.ModifierType.LOCK_MASK;

    if (!mask && keyval === Gdk.KEY_Escape) {
      this._editor.close();
      return Gdk.EVENT_STOP;
    }

    if (keyval === Gdk.KEY_BackSpace) {
      this.saveShortcut(); // Clear shortcut
      return Gdk.EVENT_STOP;
    }

    if (!this.isValidBinding(mask, keycode, keyval) || !this.isValidAccel(mask, keyval)) {
      return Gdk.EVENT_STOP;
    }

    this.saveShortcut(keyval, keycode, mask);
    return Gdk.EVENT_STOP;
  }

  saveShortcut(keyval, keycode, mask) {
    if (!keyval && !keycode) {
      this.shortcut = '';
    } else {
      this.shortcut = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
    }

    this.emit('changed', this.shortcut);
    this._settings.set_strv(this._key, [this.shortcut]);
    this._editor.destroy();
  }

  // Functions from https://gitlab.gnome.org/GNOME/gnome-control-center/-/blob/main/panels/keyboard/keyboard-shortcuts.c

  keyvalIsForbidden(keyval) {
    return [
      // Navigation keys
      Gdk.KEY_Home,
      Gdk.KEY_Left,
      Gdk.KEY_Up,
      Gdk.KEY_Right,
      Gdk.KEY_Down,
      Gdk.KEY_Page_Up,
      Gdk.KEY_Page_Down,
      Gdk.KEY_End,
      Gdk.KEY_Tab,

      // Return
      Gdk.KEY_KP_Enter,
      Gdk.KEY_Return,

      Gdk.KEY_Mode_switch
    ].includes(keyval);
  }

  isValidBinding(mask, keycode, keyval) {
    return !(mask === 0 || mask === Gdk.ModifierType.SHIFT_MASK && keycode !== 0 &&
      ((keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
        (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
        (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9) ||
        (keyval >= Gdk.KEY_kana_fullstop && keyval <= Gdk.KEY_semivoicedsound) ||
        (keyval >= Gdk.KEY_Arabic_comma && keyval <= Gdk.KEY_Arabic_sukun) ||
        (keyval >= Gdk.KEY_Serbian_dje && keyval <= Gdk.KEY_Cyrillic_HARDSIGN) ||
        (keyval >= Gdk.KEY_Greek_ALPHAaccent && keyval <= Gdk.KEY_Greek_omega) ||
        (keyval >= Gdk.KEY_hebrew_doublelowline && keyval <= Gdk.KEY_hebrew_taf) ||
        (keyval >= Gdk.KEY_Thai_kokai && keyval <= Gdk.KEY_Thai_lekkao) ||
        (keyval >= Gdk.KEY_Hangul_Kiyeog && keyval <= Gdk.KEY_Hangul_J_YeorinHieuh) ||
        (keyval === Gdk.KEY_space && mask === 0) || this.keyvalIsForbidden(keyval))
    );
  }

  isValidAccel(mask, keyval) {
    return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
  }
}
