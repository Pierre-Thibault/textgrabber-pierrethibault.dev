import GLib from "gi://GLib";

// List of all possible Tesseract languages with translatable names (known at this time)
// and the matching EasyOCR code when EasyOCR supports the language
const allTesseractLanguages = [
  { name: 'Afrikaans', code: 'afr', easyocr: 'af' },
  { name: 'Albanian', code: 'sqi', easyocr: 'sq' },
  { name: 'Amharic', code: 'amh' },
  { name: 'Arabic', code: 'ara', easyocr: 'ar' },
  { name: 'Armenian', code: 'hye' },
  { name: 'Azerbaijani', code: 'aze', easyocr: 'az' },
  { name: 'Basque', code: 'eus' },
  { name: 'Belarusian', code: 'bel', easyocr: 'be' },
  { name: 'Bengali', code: 'ben', easyocr: 'bn' },
  { name: 'Bosnian', code: 'bos', easyocr: 'bs' },
  { name: 'Bulgarian', code: 'bul', easyocr: 'bg' },
  { name: 'Burmese', code: 'mya' },
  { name: 'Catalan', code: 'cat' },
  { name: 'Cebuano', code: 'ceb' },
  { name: 'Cherokee', code: 'chr' },
  { name: 'Chinese (Simplified)', code: 'chi_sim', easyocr: 'ch_sim' },
  { name: 'Chinese (Traditional)', code: 'chi_tra', easyocr: 'ch_tra' },
  { name: 'Croatian', code: 'hrv', easyocr: 'hr' },
  { name: 'Czech', code: 'ces', easyocr: 'cs' },
  { name: 'Danish', code: 'dan', easyocr: 'da' },
  { name: 'Dutch', code: 'nld', easyocr: 'nl' },
  { name: 'English', code: 'eng', easyocr: 'en' },
  { name: 'Esperanto', code: 'epo' },
  { name: 'Estonian', code: 'est', easyocr: 'et' },
  { name: 'Finnish', code: 'fin' },
  { name: 'French', code: 'fra', easyocr: 'fr' },
  { name: 'Galician', code: 'glg' },
  { name: 'Georgian', code: 'kat' },
  { name: 'German', code: 'deu', easyocr: 'de' },
  { name: 'Greek', code: 'ell' },
  { name: 'Gujarati', code: 'guj' },
  { name: 'Hebrew', code: 'heb' },
  { name: 'Hindi', code: 'hin', easyocr: 'hi' },
  { name: 'Hungarian', code: 'hun', easyocr: 'hu' },
  { name: 'Icelandic', code: 'isl', easyocr: 'is' },
  { name: 'Indonesian', code: 'ind', easyocr: 'id' },
  { name: 'Italian', code: 'ita', easyocr: 'it' },
  { name: 'Japanese', code: 'jpn', easyocr: 'ja' },
  { name: 'Kannada', code: 'kan', easyocr: 'kn' },
  { name: 'Khmer', code: 'khm' },
  { name: 'Korean', code: 'kor', easyocr: 'ko' },
  { name: 'Lao', code: 'lao' },
  { name: 'Latvian', code: 'lav', easyocr: 'lv' },
  { name: 'Lithuanian', code: 'lit', easyocr: 'lt' },
  { name: 'Macedonian', code: 'mkd' },
  { name: 'Malay', code: 'msa', easyocr: 'ms' },
  { name: 'Malayalam', code: 'mal' },
  { name: 'Maltese', code: 'mlt', easyocr: 'mt' },
  { name: 'Marathi', code: 'mar', easyocr: 'mr' },
  { name: 'Nepali', code: 'nep', easyocr: 'ne' },
  { name: 'Norwegian', code: 'nor', easyocr: 'no' },
  { name: 'Persian', code: 'fas', easyocr: 'fa' },
  { name: 'Polish', code: 'pol', easyocr: 'pl' },
  { name: 'Portuguese', code: 'por', easyocr: 'pt' },
  { name: 'Punjabi', code: 'pan' },
  { name: 'Romanian', code: 'ron', easyocr: 'ro' },
  { name: 'Russian', code: 'rus', easyocr: 'ru' },
  { name: 'Serbian', code: 'srp', easyocr: 'rs_cyrillic' },
  { name: 'Sinhala', code: 'sin' },
  { name: 'Slovak', code: 'slk', easyocr: 'sk' },
  { name: 'Slovenian', code: 'slv', easyocr: 'sl' },
  { name: 'Spanish', code: 'spa', easyocr: 'es' },
  { name: 'Swahili', code: 'swa', easyocr: 'sw' },
  { name: 'Swedish', code: 'swe', easyocr: 'sv' },
  { name: 'Tamil', code: 'tam', easyocr: 'ta' },
  { name: 'Telugu', code: 'tel', easyocr: 'te' },
  { name: 'Thai', code: 'tha', easyocr: 'th' },
  { name: 'Tibetan', code: 'bod' },
  { name: 'Turkish', code: 'tur', easyocr: 'tr' },
  { name: 'Ukrainian', code: 'ukr', easyocr: 'uk' },
  { name: 'Urdu', code: 'urd', easyocr: 'ur' },
  { name: 'Vietnamese', code: 'vie', easyocr: 'vi' },
  { name: 'Welsh', code: 'cym', easyocr: 'cy' },
  { name: 'Yiddish', code: 'yid' }
];

export function getAvailableLanguages() {
  // Get the available languages for the interface
  // (meaning available in Tesseract while having a name for the GUI)
  return allTesseractLanguages.filter(lang => getTesseractInstalledLanguages().includes(lang.code));
}

export function getEasyOCRLanguages(tesseractCodes) {
  // Convert Tesseract language codes to EasyOCR ones, skipping the languages EasyOCR does not support
  const easyocrCodes = tesseractCodes
    .map(code => allTesseractLanguages.find(lang => lang.code === code)?.easyocr)
    .filter(code => code);
  return easyocrCodes.length ? easyocrCodes : ['en'];
}

function getTesseractInstalledLanguages() {
  // Get installed Tesseract languages as an array
  try {
    let [success, stdout, _stderr] = GLib.spawn_command_line_sync('tesseract --list-langs');
    if (success) {
      return new TextDecoder().decode(stdout).split('\n').slice(1).filter(lang => lang.trim() !== '');
    }
  } catch (e) {
    console.error(`Failed to fetch Tesseract languages: ${e.message}`);
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
