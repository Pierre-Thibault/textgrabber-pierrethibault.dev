// Joins the lines of OCR text into paragraphs.

// A bullet or a number starts a list item: its line break is kept.
const LIST_ITEM = /^\s*([•◦▪●‣\-*–]|\d+[.)])\s/;

// A hyphen at the end of a line: a word cut in two when the next line starts in
// lowercase, otherwise a hyphenated name or range (Jean-Paul, 2025-2026).
const CUT_WORD = /\p{L}-$/u;
const LOWERCASE_START = /^\p{Ll}/u;
const HYPHENATED = /[\p{L}\p{N}]-$/u;
const UPPERCASE_OR_DIGIT_START = /^[\p{Lu}\p{N}]/u;

export function joinLines(text) {
  return text
    .replace(/\r\n?/g, '\n')
    // Paragraphs are separated by empty lines
    .split(/\n[^\S\n]*\n\s*/)
    .map(joinParagraph)
    .join('\n\n');
}

function joinParagraph(paragraph) {
  const lines = paragraph.split('\n').map(line => line.trim()).filter(line => line);
  let result = lines[0] ?? '';
  for (const line of lines.slice(1)) {
    if (LIST_ITEM.test(line)) {
      result += `\n${line}`;
    } else if (CUT_WORD.test(result) && LOWERCASE_START.test(line)) {
      result = result.slice(0, -1) + line;
    } else if (HYPHENATED.test(result) && UPPERCASE_OR_DIGIT_START.test(line)) {
      result += line;
    } else {
      result += ` ${line}`;
    }
  }
  return result;
}
