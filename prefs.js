import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib"
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

// List of all possible Tesseract languages with translatable names
const allTesseractLanguages = [
    { name: 'Afrikaans', code: 'afr' },
    { name: 'Albanian', code: 'sqi' },
    { name: 'Amharic', code: 'amh' },
    { name: 'Arabic', code: 'ara' },
    { name: 'Armenian', code: 'hye' },
    { name: 'Azerbaijani', code: 'aze' },
    { name: 'Basque', code: 'eus' },
    { name: 'Belarusian', code: 'bel' },
    { name: 'Bengali', code: 'ben' },
    { name: 'Bosnian', code: 'bos' },
    { name: 'Bulgarian', code: 'bul' },
    { name: 'Burmese', code: 'mya' },
    { name: 'Catalan', code: 'cat' },
    { name: 'Cebuano', code: 'ceb' },
    { name: 'Cherokee', code: 'chr' },
    { name: 'Chinese (Simplified)', code: 'chi_sim' },
    { name: 'Chinese (Traditional)', code: 'chi_tra' },
    { name: 'Croatian', code: 'hrv' },
    { name: 'Czech', code: 'ces' },
    { name: 'Danish', code: 'dan' },
    { name: 'Dutch', code: 'nld' },
    { name: 'English', code: 'eng' },
    { name: 'Esperanto', code: 'epo' },
    { name: 'Estonian', code: 'est' },
    { name: 'Finnish', code: 'fin' },
    { name: 'French', code: 'fra' },
    { name: 'Galician', code: 'glg' },
    { name: 'Georgian', code: 'kat' },
    { name: 'German', code: 'deu' },
    { name: 'Greek', code: 'ell' },
    { name: 'Gujarati', code: 'guj' },
    { name: 'Hebrew', code: 'heb' },
    { name: 'Hindi', code: 'hin' },
    { name: 'Hungarian', code: 'hun' },
    { name: 'Icelandic', code: 'isl' },
    { name: 'Indonesian', code: 'ind' },
    { name: 'Italian', code: 'ita' },
    { name: 'Japanese', code: 'jpn' },
    { name: 'Kannada', code: 'kan' },
    { name: 'Khmer', code: 'khm' },
    { name: 'Korean', code: 'kor' },
    { name: 'Lao', code: 'lao' },
    { name: 'Latvian', code: 'lav' },
    { name: 'Lithuanian', code: 'lit' },
    { name: 'Macedonian', code: 'mkd' },
    { name: 'Malay', code: 'msa' },
    { name: 'Malayalam', code: 'mal' },
    { name: 'Maltese', code: 'mlt' },
    { name: 'Marathi', code: 'mar' },
    { name: 'Nepali', code: 'nep' },
    { name: 'Norwegian', code: 'nor' },
    { name: 'Persian', code: 'fas' },
    { name: 'Polish', code: 'pol' },
    { name: 'Portuguese', code: 'por' },
    { name: 'Punjabi', code: 'pan' },
    { name: 'Romanian', code: 'ron' },
    { name: 'Russian', code: 'rus' },
    { name: 'Serbian', code: 'srp' },
    { name: 'Sinhala', code: 'sin' },
    { name: 'Slovak', code: 'slk' },
    { name: 'Slovenian', code: 'slv' },
    { name: 'Spanish', code: 'spa' },
    { name: 'Swahili', code: 'swa' },
    { name: 'Swedish', code: 'swe' },
    { name: 'Tamil', code: 'tam' },
    { name: 'Telugu', code: 'tel' },
    { name: 'Thai', code: 'tha' },
    { name: 'Tibetan', code: 'bod' },
    { name: 'Turkish', code: 'tur' },
    { name: 'Ukrainian', code: 'ukr' },
    { name: 'Urdu', code: 'urd' },
    { name: 'Vietnamese', code: 'vie' },
    { name: 'Welsh', code: 'cym' },
    { name: 'Yiddish', code: 'yid' }
];

function fillPreferencesWindow(window) {
    const settings = this.getSettings();

    // Get installed Tesseract languages
    let installedLanguages = [];
    try {
        let [success, stdout, stderr] = GLib.spawn_command_line_sync('tesseract --list-langs');
        if (success) {
            let langs = stdout.toString().split('\n').slice(1).filter(lang => lang.trim() !== '');
            installedLanguages = langs;
        }
    } catch (e) {
        logError(e, 'Failed to fetch Tesseract languages');
    }

    // Filter available languages to only those installed
    const tesseractLanguages = allTesseractLanguages.filter(lang => installedLanguages.includes(lang.code));

    const page = new Adw.PreferencesPage();
    window.add(page);

    const group = new Adw.PreferencesGroup();
    page.add(group);

    // Show button toggle
    const showButtonRow = new Adw.ActionRow({
        title: _('Show button in top bar')
    });
    const showButtonSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-button'),
        halign: Gtk.Align.END
    });
    settings.bind('show-button', showButtonSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    showButtonRow.add_suffix(showButtonSwitch);
    group.add(showButtonRow);

    // Keyboard shortcut with validation
    const shortcutRow = new Adw.ActionRow({
        title: _('Keyboard shortcut')
    });
    const shortcutEntry = new Gtk.Entry({
        text: settings.get_strv('shortcut')[0],
        halign: Gtk.Align.END,
        placeholder_text: '<Super>t'
    });
    const errorLabel = new Gtk.Label({
        label: '',
        css_classes: ['error'],
        halign: Gtk.Align.END,
        visible: false
    });

    shortcutEntry.connect('changed', () => {
        let text = shortcutEntry.text.trim();
        let [keyval, mods] = Gtk.accelerator_parse(text);
        if (text === '' || (keyval !== 0 && mods !== 0)) {
            // Valid accelerator or empty (to clear)
            settings.set_strv('shortcut', [text]);
            errorLabel.set_visible(false);
        } else {
            // Invalid accelerator
            errorLabel.label = _('Invalid shortcut');
            errorLabel.set_visible(true);
        }
    });

    shortcutRow.add_suffix(shortcutEntry);
    group.add(shortcutRow);
    group.add(errorLabel);

    // Tesseract languages with checkboxes
    const languagesGroup = new Adw.PreferencesGroup({
        title: _('Text Languages'),
        description: installedLanguages.length > 0 ? _('Select languages for OCR') : _('No Tesseract languages installed.')
    });
    page.add(languagesGroup);

    if (installedLanguages.length > 0) {
        const currentLanguages = settings.get_strv('tesseract-languages');
        tesseractLanguages.forEach(lang => {
            const checkButton = new Gtk.CheckButton({
                label: _(lang.name), // Localize the language name
                active: currentLanguages.includes(lang.code)
            });
            checkButton.connect('toggled', () => {
                let updatedLanguages = settings.get_strv('tesseract-languages');
                if (checkButton.active) {
                    if (!updatedLanguages.includes(lang.code)) {
                        updatedLanguages.push(lang.code);
                    }
                } else {
                    updatedLanguages = updatedLanguages.filter(l => l !== lang.code);
                }
                settings.set_strv('tesseract-languages', updatedLanguages);
            });
            const row = new Adw.ActionRow();
            row.add_prefix(checkButton);
            languagesGroup.append(row);
        });
    } else {
        const noLanguagesRow = new Adw.ActionRow({
            title: _('No languages available'),
            subtitle: _('Install Tesseract language data to enable OCR.')
        });
        languagesGroup.add(noLanguagesRow);
    }
}
