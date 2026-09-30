/** Width of one character of the 3x5 board font, in dots. */
export const FONT_WIDTH = 3;

/** Height of one character of the 3x5 board font, in dots. */
export const FONT_HEIGHT = 5;

/** Rows of the font drawn by the first half of a flip; the rest turn in the second half. */
export const FONT_TOP_ROWS = 3;

/** Character that splits a font glyph into words. */
export const WORD_SEPARATOR = '|';

/** A character of the board font as five rows of three cells, `#` lit. */
export type FontCharacter = readonly string[];

const LETTERS: Readonly<Record<string, FontCharacter>> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['###', '#.#', '###', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
};

const DIGITS: Readonly<Record<string, FontCharacter>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
};

const MARKS: Readonly<Record<string, FontCharacter>> = {
  ' ': ['...', '...', '...', '...', '...'],
  '-': ['...', '...', '###', '...', '...'],
};

/** Every character the board font draws, keyed by the character. */
export const FONT: Readonly<Record<string, FontCharacter>> = { ...LETTERS, ...DIGITS, ...MARKS };

/** Characters a flipping slot passes through on its way to the next word, in a fixed order. */
export const FLIP_POOL: readonly string[] = [...Object.keys(LETTERS), ...Object.keys(DIGITS)];

function isDrawable(word: string): boolean {
  return word.length > 0 && [...word.toUpperCase()].every((character) => Object.hasOwn(FONT, character));
}

/** True when `glyph` is one or more words the board font can draw, joined by `|`. */
export function isFontGlyph(glyph: string): boolean {
  return glyph.split(WORD_SEPARATOR).every(isDrawable);
}

/** Splits a font glyph into upper-case words, throwing a readable error when the font cannot draw it. */
export function parseWords(glyph: string): string[] {
  if (!isFontGlyph(glyph)) {
    throw new Error(
      `flickering-dots resolve: glyph ${JSON.stringify(glyph)} is not a font glyph; use letters, digits, spaces and dashes, with ${WORD_SEPARATOR} between words`,
    );
  }
  return glyph.toUpperCase().split(WORD_SEPARATOR);
}
