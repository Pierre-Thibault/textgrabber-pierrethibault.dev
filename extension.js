const { St, Clutter, Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const Gettext = imports.gettext;

Gettext.textdomain('textgrabber');
const _ = Gettext.gettext;

class Extension {
    constructor() {
        this._button = null;
        this._settings = null;
    }

    enable() {
        // Load settings
        this._settings = new Gio.Settings({
            schema_id: 'org.gnome.shell.extensions.textgrabber'
        });

        // Manage button visibility
        let showButton = this._settings.get_boolean('show-button');
        this._updateButton(showButton);

        // Listen for changes to button visibility
        this._settings.connect('changed::show-button', () => {
            this._updateButton(this._settings.get_boolean('show-button'));
        });

        // Set up keyboard shortcut
        this._bindShortcut();
    }

    _updateButton(show) {
        if (show && !this._button) {
            this._button = new St.Bin({
                style_class: 'panel-button',
                reactive: true,
                can_focus: true,
                track_hover: true
            });

            // Use an icon instead of text
            let icon = new St.Icon({
                icon_name: 'edit-copy-symbolic', // Fallback system icon
                g_icon: Gio.icon_new_for_string(GLib.build_filenamev(['', GLib.get_user_data_dir(), 'gnome-shell', 'extensions/textgrabber@your-domain.com', 'icon.png'])),
                style_class: 'system-status-icon'
            });

            this._button.set_child(icon);
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
            'textgrabber-shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => this._grabText()
        );

        // Listen for shortcut changes
        this._settings.connect('changed::shortcut', () => {
            Main.wm.removeKeybinding('textgrabber-shortcut');
            Main.wm.addKeybinding(
                'textgrabber-shortcut',
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => this._grabText()
            );
        });
    }

    _grabText() {
        try {
            let languages = this._settings.get_strv('tesseract-languages');
            let langString = languages.length > 0 ? languages.join('+') : 'eng';
            let extensionPath = GLib.get_user_data_dir() + '/gnome/shell/extensions/textgrabber@your-domain.com';
            let scriptPath = extensionPath + '/textgrabber.sh';
            let [success, _pid] = GLib.spawn_command_line_async(`${scriptPath} ${langString}`);
            if (success) {
                Main.notify(_('TextGrabber'), _('Text captured and copied to clipboard!'));
            } else {
                Main.notifyError(_('TextGrabber'), _('Error running the script.'));
            }
        } catch (e) {
            Main.notifyError(_('TextGrabber'), _('Error: ') + e.message);
        }
    }

    disable() {
        if (this._button) {
            this._button.destroy();
            this._button = null;
        }
        Main.wm.removeKeybinding('textgrabber-shortcut');
        this._settings = null;
    }
}

function init() {
    let localeDir = GLib.get_user_data_dir() + '/gnome-shell/extensions/textgrabber@your-domain.com/locale';
    Gettext.bindtextdomain('textgrabber', localeDir);
    return new Extension();
}
