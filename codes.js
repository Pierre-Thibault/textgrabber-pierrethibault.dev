// QR codes and barcodes are read with zbarimg, from zbar (optional dependency).

export const ZBARIMG = 'zbarimg';

// Only codes with error detection are read: Code 39, Interleaved 2 of 5 and the
// other codes without a check digit can be found by mistake in a line of text.
const SYMBOLOGIES = ['qrcode', 'ean13', 'ean8', 'upca', 'upce', 'code128'];

export function getZbarimgArgs(imagePath) {
  return [
    '--quiet',
    // Only the content of the codes, without the name of the symbology
    '--raw',
    // When zbar is built with D-Bus (Debian, Ubuntu), the content of each code is
    // also sent as a signal on the system bus, where any local user can read it.
    // Ignored when zbar is built without D-Bus.
    '--nodbus',
    '-Sdisable',
    ...SYMBOLOGIES.map(symbology => `-S${symbology}.enable`),
    imagePath,
  ];
}

// zbarimg ends each code with a new line. Only the last one is removed, so the
// content of a code on several lines (a contact card, for example) is kept.
export function parseZbarimgOutput(stdout) {
  return stdout.endsWith('\n') ? stdout.slice(0, -1) : stdout;
}

// The content of the code when it is a single web link, null otherwise.
// Other URI schemes are not opened: they could start any application.
export function getWebLink(text) {
  const link = text.trim();
  return /^https?:\/\/\S+$/i.test(link) ? link : null;
}
