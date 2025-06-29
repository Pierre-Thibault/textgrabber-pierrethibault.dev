import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export class ScreenOCR {
  constructor() {
    this._imageFile = null;
    this._textFile = null;
  }

  _sendNotification(title, message) {
    try {
      Main.notify(title, message);
    } catch (e) {
      log(`Error while trying to send a notification: ${e.message}`);
    }
  }

  async _runCommandAsync(command, args, input = null) {
    return new Promise((resolve, reject) => {
      try {
        const proc = Gio.Subprocess.new(
          [command, ...args],
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE | (input ? Gio.SubprocessFlags.STDIN_PIPE : 0)
        );

        proc.communicate_utf8_async(input, null, (proc, result) => {
          try {
            const [_, stdout, stderr] = proc.communicate_utf8_finish(result);
            if (!proc.get_successful()) {
              reject(new Error(`Command ${command} has failed: ${stderr}`));
            }
            resolve(stdout);
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async _createTempFiles() {
    try {
      this._imageFile = Gio.File.new_tmp('XXXXXX.png')[0];
      this._textFile = Gio.File.new_tmp('XXXXXX.txt')[0];
    } catch (e) {
      throw new Error(`Unable to create temporary files: ${e.message}`);
    }
  }

  async _captureScreenshot() {
    try {
      await this._runCommandAsync('gnome-screenshot', ['-a', '-f', this._imageFile.get_path()]);
    } catch (e) {
      throw new Error(`Screen capture has failed: ${e.message}`);
    }
  }

  async _performOCR(languages) {
    try {
      const textFilePath = this._textFile.get_path();  // Tesseract adds .txt extension itself
      const tesseractArgs = [this._imageFile.get_path(), textFilePath.slice(0, textFilePath.length - ".txt".length)];
      if (languages) {
        tesseractArgs.push(...['-l', languages]);
      }
      await this._runCommandAsync('tesseract', tesseractArgs);

      if (!this._textFile.query_exists(null)) {
        throw new Error('No file output from Tesseract.');
      } else if (isFileEmpty(this._textFile)) {
        return false;  // OCR has failed (this is not an error)
      }
    } catch (e) {
      throw new Error(`OCR has failed: ${e.message}`);
    }
    return true;
  }

  async _copyToClipboard() {
    try {
      // Lire le contenu du fichier texte
      const [success, contents] = await new Promise((resolve, reject) => {
        this._textFile.load_contents_async(null, (file, result) => {
          try {
            const [success, contents] = file.load_contents_finish(result);
            resolve([success, contents]);
          } catch (e) {
            reject(e);
          }
        });
      });

      if (!success) {
        throw new Error('Reading text file failed.');
      }

      const text = new TextDecoder().decode(contents).trim();

      const sessionType = GLib.getenv('XDG_SESSION_TYPE');
      if (sessionType === 'wayland') {
        await this._runCommandAsync('wl-copy', ['-n'], text);
      } else {
        await this._runCommandAsync('xsel', ['-bi'], text);
      }
    } catch (e) {
      throw new Error(`Copy to clipboard failed: ${e.message}`);
    }
  }

  async _cleanup() {
    try {
      for (const file of [this._imageFile, this._textFile]) {
        if (file) {
          await new Promise((resolve, reject) => {
            file.delete_async(null, (file, result) => {
              try {
                file.delete_finish(result);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });
        }
      }
    } catch (e) {
      throw new Error(`Cleanup failed: ${e.message}`);
    }
  }

  async grabText(languages) {
    try {
      await this._createTempFiles();
      await this._captureScreenshot();
      if (isFileEmpty(this._imageFile)) {
        this._cleanup();
        return true; // The image file is empty, the user has probably cancelled its screenshot
      }
      const isOCRSuccessful = await this._performOCR(languages);
      this._sendNotification(isOCRSuccessful ? _('Text copied to the clipboard!') + ' 😀' : _('OCR failed.') + ' 🙁');
      await this._copyToClipboard();
      await this._cleanup();
      return true;
    } catch (e) {
      this._sendNotification(_('An error occurred during the OCR process.') + ' 🙁', e.message);
      log(e.message);
      await this._cleanup();
      return false;
    }
  }
}

function isFileEmpty(file) {
  return file.query_info('standard::size', 0, null).get_size() === 0;
}

