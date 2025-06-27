import GLib from "gi://GLib";

import { Utf8ArrayToStr } from "./Utf8ArrayToStr.js";

// List of all possible Tesseract languages with translatable names (known at this time)
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

export function getAvailableLanguages() {
  // Get the available languages for the interface
  // (meaning available in Tesseract while having a name for the GUI)
  return allTesseractLanguages.filter(lang => getTesseractInstalledLanguages().includes(lang.code));
}

function getTesseractInstalledLanguages() {
  // Get installed Tesseract languages as an array
  try {
    let [success, stdout, _stderr] = GLib.spawn_command_line_sync('tesseract --list-langs');
    if (success) {
      return Utf8ArrayToStr(stdout).split('\n').slice(1).filter(lang => lang.trim() !== '');
    }
  } catch (e) {
    logError(e, 'Failed to fetch Tesseract languages');
  }
  return [];
}

function _() {
  // Static invocation to tell gettext that our strings exist
  // Never called

  _('Afrikaans');
  _('Albanian');
  _('Amharic');
  _('Arabic');
  _('Armenian');
  _('Azerbaijani');
  _('Basque');
  _('Belarusian');
  _('Bengali');
  _('Bosnian');
  _('Bulgarian');
  _('Burmese');
  _('Catalan');
  _('Cebuano');
  _('Cherokee');
  _('Chinese (Simplified)');
  _('Chinese (Traditional)');
  _('Croatian');
  _('Czech');
  _('Danish');
  _('Dutch');
  _('English');
  _('Esperanto');
  _('Estonian');
  _('Finnish');
  _('French');
  _('Galician');
  _('Georgian');
  _('German');
  _('Greek');
  _('Gujarati');
  _('Hebrew');
  _('Hindi');
  _('Hungarian');
  _('Icelandic');
  _('Indonesian');
  _('Italian');
  _('Japanese');
  _('Kannada');
  _('Khmer');
  _('Korean');
  _('Lao');
  _('Latvian');
  _('Lithuanian');
  _('Macedonian');
  _('Malay');
  _('Malayalam');
  _('Maltese');
  _('Marathi');
  _('Nepali');
  _('Norwegian');
  _('Persian');
  _('Polish');
  _('Portuguese');
  _('Punjabi');
  _('Romanian');
  _('Russian');
  _('Serbian');
  _('Sinhala');
  _('Slovak');
  _('Slovenian');
  _('Spanish');
  _('Swahili');
  _('Swedish');
  _('Tamil');
  _('Telugu');
  _('Thai');
  _('Tibetan');
  _('Turkish');
  _('Ukrainian');
  _('Urdu');
  _('Vietnamese');
  _('Welsh');
  _('Yiddish');
}
