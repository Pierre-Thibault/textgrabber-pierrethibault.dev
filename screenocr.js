import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from "gi://GLib";
import Meta from 'gi://Meta';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import Shell from 'gi://Shell';

import { getEasyOCRLanguages } from "./languages.js";

const Cursor = Clutter.CursorType ?? Meta.Cursor;

// Gnome 50+ provides gesture and key controllers. They replace the legacy
// event signals (deprecated in Gnome 51) and handle touch screens as well.
// ClickGesture is required for the panel button (extension.js).
export const HAS_CONTROLLERS = Clutter.PanGesture !== undefined && Clutter.KeyController !== undefined && Clutter.ClickGesture !== undefined;

function setCursor(actor, cursor) {
  if (typeof Clutter.CursorType !== 'undefined' && actor && 'cursor_type' in actor) {
    try {
      actor.cursor_type = cursor;
      return;
    } catch (e) {
      // Fall back to the global cursor API below.
    }
  }

  global.display?.set_cursor?.(cursor);
}

export class ScreenOCR {
  constructor() {
    this._imageFile = null;
    this._textFile = null;
    this._cancelSelection = null;
    this._cancellable = new Gio.Cancellable();
  }

  _sendNotification(title, message) {
    try {
      Main.notify(title, message);
    } catch (e) {
      console.error(`Error while trying to send a notification: ${e.message}`);
    }
  }

  async _runCommandAsync(command, args, input = null) {
    return new Promise((resolve, reject) => {
      try {
        const proc = Gio.Subprocess.new(
          [command, ...args],
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE | (input ? Gio.SubprocessFlags.STDIN_PIPE : 0)
        );

        // Stop the process if the grab is cancelled (runs right away if already cancelled)
        const cancelledId = this._cancellable.connect(() => proc.force_exit());

        proc.communicate_utf8_async(input, null, (proc, result) => {
          this._cancellable.disconnect(cancelledId);
          try {
            const [_, stdout, stderr] = proc.communicate_utf8_finish(result);
            if (!proc.get_successful()) {
              reject(new Error(`Command ${command} has failed: ${stderr}`));
              return;
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
      // new_tmp() also opens the files: close the streams to not leak file descriptors
      let stream;
      [this._imageFile, stream] = Gio.File.new_tmp('XXXXXX.png');
      stream.close(null);
      [this._textFile, stream] = Gio.File.new_tmp('XXXXXX.txt');
      stream.close(null);
    } catch (e) {
      throw new Error(`Unable to create temporary files: ${e.message}`);
    }
  }

  cancel() {
    // Abort the grab: remove the selection overlay right away if it is shown
    // and stop the OCR processes
    this._cancellable.cancel();
    this._cancelSelection?.();
  }

  _selectArea() {
    return new Promise((resolve) => {
      let startX, startY;
      let selectionActor = null;
      let overlayTop = null;
      let overlayBottom = null;
      let overlayLeft = null;
      let overlayRight = null;
      let fullOverlay = null;

      // Initial overlay covering all the screen
      fullOverlay = new St.Widget({
        style: 'background-color: rgba(0, 0, 0, 0.5);',
        x: 0,
        y: 0,
        width: global.screen_width,
        height: global.screen_height
      });

      // Four gray rectangles around the marquise
      overlayTop = new St.Widget({
        style: 'background-color: rgba(0, 0, 0, 0.5);',
        visible: false,
        x: 0,
        y: 0,
        width: global.screen_width,
        height: 0
      });

      overlayBottom = new St.Widget({
        style: 'background-color: rgba(0, 0, 0, 0.5);',
        visible: false,
        x: 0,
        y: 0,
        width: global.screen_width,
        height: 0
      });

      overlayLeft = new St.Widget({
        style: 'background-color: rgba(0, 0, 0, 0.5);',
        visible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });

      overlayRight = new St.Widget({
        style: 'background-color: rgba(0, 0, 0, 0.5);',
        visible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });

      // Transparent fullscreen widget
      let captureActor = new St.Widget({
        reactive: true,
        x: 0,
        y: 0,
        width: global.screen_width,
        height: global.screen_height
      });

      setCursor(captureActor, Cursor.CROSSHAIR);

      // White border marquise
      selectionActor = new St.Widget({
        style: 'border: 2px solid white;',
        visible: false
      });

      Main.uiGroup.add_child(fullOverlay);
      Main.uiGroup.add_child(overlayTop);
      Main.uiGroup.add_child(overlayBottom);
      Main.uiGroup.add_child(overlayLeft);
      Main.uiGroup.add_child(overlayRight);
      Main.uiGroup.add_child(captureActor);
      Main.uiGroup.add_child(selectionActor);

      const destroyActors = () => {
        [fullOverlay, overlayTop, overlayBottom, overlayLeft, overlayRight, captureActor, selectionActor].forEach(actor => {
          if (actor) {
            Main.uiGroup.remove_child(actor);
            actor.destroy();
          }
        });
      };

      const grab = Main.pushModal(captureActor);

      if (!grab) {
        console.error('Failed to grab modal');
        setCursor(captureActor, Cursor.DEFAULT);
        destroyActors();
        resolve([0, 0, 0, 0]);
        return;
      }

      // Update overlay function
      const updateOverlays = (x, y, width, height) => {
        // Hide full overlay for show four rectangles
        fullOverlay.hide();
        overlayTop.show();
        overlayBottom.show();
        overlayLeft.show();
        overlayRight.show();

        // Top: from 0 to y
        overlayTop.set_position(0, 0);
        overlayTop.set_size(global.screen_width, y);

        // Bottom: from y+height up to the end
        overlayBottom.set_position(0, y + height);
        overlayBottom.set_size(global.screen_width, global.screen_height - (y + height));

        // Left: from y to y+height, from 0 to x
        overlayLeft.set_position(0, y);
        overlayLeft.set_size(x, height);

        // Right: from y to y+height, from x+width up to the end
        overlayRight.set_position(x + width, y);
        overlayRight.set_size(global.screen_width - (x + width), height);
      };

      const signalIds = [];
      let done = false;
      let isDrawing = false;

      const cleanup = () => {
        signalIds.forEach(([object, id]) => object.disconnect(id));
        this._cancelSelection = null;

        setCursor(captureActor, Cursor.DEFAULT);

        Main.popModal(grab);
        destroyActors();
      };

      // Selection steps shared by the gesture controllers and the legacy event signals
      const startSelection = (x, y) => {
        [startX, startY] = [x, y];
        isDrawing = true;
        selectionActor.set_position(startX, startY);
        selectionActor.set_size(0, 0);
        selectionActor.show();
      };

      const updateSelection = (currentX, currentY) => {
        if (!isDrawing) return;

        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionActor.set_position(x, y);
        selectionActor.set_size(width, height);

        // Update the overlays to create a hole
        updateOverlays(x, y, width, height);
      };

      const finishSelection = (currentX, currentY) => {
        if (done) return;
        done = true;

        if (!isDrawing) {
          cleanup();
          resolve([0, 0, 0, 0]);
          return;
        }

        const x = Math.round(Math.min(startX, currentX));
        const y = Math.round(Math.min(startY, currentY));
        const width = Math.round(Math.abs(currentX - startX));
        const height = Math.round(Math.abs(currentY - startY));

        cleanup();
        resolve([x, y, width, height]);
      };

      const cancelSelection = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve([0, 0, 0, 0]);
      };
      this._cancelSelection = cancelSelection;

      if (HAS_CONTROLLERS) {
        // Mouse and touch screen
        const panGesture = new Clutter.PanGesture();
        panGesture.set_begin_threshold(0);
        signalIds.push([panGesture, panGesture.connect('recognize', () => {
          const { x, y } = panGesture.get_begin_centroid_abs();
          startSelection(x, y);
        })]);
        signalIds.push([panGesture, panGesture.connect('pan-update', () => {
          const { x, y } = panGesture.get_centroid_abs();
          updateSelection(x, y);
        })]);
        signalIds.push([panGesture, panGesture.connect('end', () => {
          const { x, y } = panGesture.get_centroid_abs();
          finishSelection(x, y);
        })]);
        signalIds.push([panGesture, panGesture.connect('cancel', cancelSelection)]);
        captureActor.add_action(panGesture);

        const keyController = new Clutter.KeyController();
        signalIds.push([keyController, keyController.connect('key-press', () => {
          const [, keyval] = keyController.get_key();
          if (keyval === Clutter.KEY_Escape) {
            cancelSelection();
            return Clutter.EVENT_STOP;
          }
          return Clutter.EVENT_PROPAGATE;
        })]);
        captureActor.add_action(keyController);
      } else {
        signalIds.push([captureActor, captureActor.connect('button-press-event', (_actor, event) => {
          startSelection(...event.get_coords());
          return Clutter.EVENT_STOP;
        })]);

        signalIds.push([captureActor, captureActor.connect('motion-event', (_actor, event) => {
          if (!isDrawing) return Clutter.EVENT_PROPAGATE;
          updateSelection(...event.get_coords());
          return Clutter.EVENT_STOP;
        })]);

        signalIds.push([captureActor, captureActor.connect('button-release-event', (_actor, event) => {
          finishSelection(...event.get_coords());
          return Clutter.EVENT_STOP;
        })]);

        signalIds.push([captureActor, captureActor.connect('key-press-event', (_actor, event) => {
          if (event.get_key_symbol() === Clutter.KEY_Escape) {
            cancelSelection();
            return Clutter.EVENT_STOP;
          }
          return Clutter.EVENT_PROPAGATE;
        })]);
      }
    });
  }

  async _captureScreenshot(x, y, width, height) {
    const screenshot = new Shell.Screenshot();

    // Créer le stream de sortie
    const outputStream = this._imageFile.replace(
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null
    );

    return new Promise((resolve, reject) => {
      screenshot.screenshot_area(
        x, y, width, height,
        outputStream,  // Passer le stream, pas null
        (_obj, result) => {
          try {
            screenshot.screenshot_area_finish(result);
            outputStream.close(null);
            resolve();
          } catch (e) {
            outputStream.close(null);
            reject(e);
          }
        }
      );
    });
  }

  async _performOCR(languages, engine) {
    if (engine === 'easyocr') {
      return this._runEasyOCR(languages);
    }
    if (engine !== 'both') {
      return this._runTesseract(languages);
    }

    // Run both engines and keep the longest result, Tesseract wins ties
    const results = await Promise.allSettled([this._runTesseract(languages), this._runEasyOCR(languages)]);
    const texts = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        texts.push(result.value);
      } else if (!this._cancellable.is_cancelled()) {
        console.warn(result.reason.message);
      }
    }
    if (!texts.length) {
      throw results[0].reason;
    }
    return texts.reduce((longest, text) => text.length > longest.length ? text : longest);
  }

  async _runTesseract(languages) {
    try {
      const textFilePath = this._textFile.get_path();  // Tesseract adds .txt extension itself
      const tesseractArgs = [this._imageFile.get_path(), textFilePath.slice(0, textFilePath.length - ".txt".length)];
      if (languages.length) {
        tesseractArgs.push(...['-l', languages.join('+')]);
      }
      await this._runCommandAsync('tesseract', tesseractArgs);

      if (!this._textFile.query_exists(null)) {
        throw new Error('No file output from Tesseract.');
      }
    } catch (e) {
      throw new Error(`OCR has failed: ${e.message}`);
    }
    return this._readText();
  }

  async _runEasyOCR(languages) {
    if (!GLib.find_program_in_path('easyocr')) {
      throw new Error(_('EasyOCR is not installed.'));
    }
    const easyocrArgs = [
      '-l', ...getEasyOCRLanguages(languages),
      '-f', this._imageFile.get_path(),
      '--detail', '0',
      // EasyOCR converts its boolean options with bool(): only an empty string gives False.
      // Otherwise, a progress bar is printed with the text when a model is downloaded.
      '--verbose', '',
    ];
    try {
      const stdout = await this._runCommandAsync('easyocr', easyocrArgs);
      return stdout.trim();
    } catch (e) {
      // Keep only the last line of the Python traceback
      throw new Error(`EasyOCR has failed: ${e.message.trim().split('\n').pop()}`);
    }
  }

  async _readText() {
    // Read the content of the text file
    const contents = await new Promise((resolve, reject) => {
      this._textFile.load_contents_async(null, (file, result) => {
        try {
          const [, contents] = file.load_contents_finish(result);
          resolve(contents);
        } catch (e) {
          reject(new Error(`Reading text file failed: ${e.message}`));
        }
      });
    });

    return new TextDecoder().decode(contents).trim();
  }

  _copyToClipboard(text) {
    try {
      St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
    } catch (e) {
      throw new Error(`Copy to clipboard failed: ${e.message}`);
    }
  }

  async _cleanup() {
    for (const file of [this._imageFile, this._textFile]) {
      if (file) {
        try {
          await new Promise((resolve, reject) => {
            file.delete_async(GLib.PRIORITY_DEFAULT, null, (file, result) => {
              try {
                file.delete_finish(result);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });
        } catch (e) {
          console.warn(`Impossible to delete temporary file: ${e.message}`);
        }
      }
    }
  }

  async grabText(languages, engine) {
    try {
      await this._createTempFiles();

      const [x, y, width, height] = await this._selectArea();

      if (this._cancellable.is_cancelled() || width === 0 || height === 0) {
        console.log('Cancelled selection');
        await this._cleanup();
        return true;
      }

      await this._captureScreenshot(x, y, width, height);

      if (isFileEmpty(this._imageFile)) {
        await this._cleanup();
        return true;
      }

      const text = await this._performOCR(languages, engine);

      if (this._cancellable.is_cancelled()) {
        // The extension has been disabled in the meantime
      } else if (text) {
        this._copyToClipboard(text);
        this._sendNotification(_('Text copied to the clipboard!') + ' 😀');
      } else {
        // Keep the current clipboard content when no text is found
        this._sendNotification(_('OCR failed.') + ' 🙁');
      }
      await this._cleanup();
      return true;
    } catch (e) {
      if (!this._cancellable.is_cancelled()) {
        this._sendNotification(_('An error occurred during the OCR process.') + ' 🙁', e.message);
        console.error(e.message);
      }
      await this._cleanup();
      return false;
    }
  }
}

function isFileEmpty(file) {
  return file.query_info('standard::size', 0, null).get_size() === 0;
}
