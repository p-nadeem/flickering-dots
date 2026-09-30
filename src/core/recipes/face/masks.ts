/** An eye drawn as rows of `#` (lit) and `.` (off), left eye orientation. */
export type EyeMask = readonly string[];

/** A squashed eye and how many rows below the eye's top it sits. */
export interface SquashedEye {
  rows: EyeMask;
  offset: number;
}

const LIT = '#';
const OFF = '.';
const ROUND_MIN_WIDTH = 4;
const ROUND_MIN_HEIGHT = 3;
const ANGRY_ROUND_MIN_HEIGHT = 5;
const TALL_EYE = 6;
const TALL_ARC = 4;
const SHORT_ARC = 3;
const SHOULDER = 2;

function row(width: number, isLit: (x: number) => boolean): string {
  return Array.from({ length: width }, (_, x) => (isLit(x) ? LIT : OFF)).join('');
}

function capRow(width: number): string {
  return row(width, (x) => width < ROUND_MIN_WIDTH || (x > 0 && x < width - 1));
}

function fullRow(width: number): string {
  return row(width, () => true);
}

/** An open eye: a rectangle with its four corners cut once it is 4 wide and 3 tall. */
export function openEye(width: number, height: number): EyeMask {
  const isRound = width >= ROUND_MIN_WIDTH && height >= ROUND_MIN_HEIGHT;
  return Array.from({ length: height }, (_, y) =>
    isRound && (y === 0 || y === height - 1) ? capRow(width) : fullRow(width),
  );
}

/** A blink frame: an open eye `height` rows tall, centred in an eye `fullHeight` rows tall. */
export function squashEye(width: number, fullHeight: number, height: number): SquashedEye {
  return { rows: openEye(width, height), offset: Math.floor((fullHeight - height) / 2) };
}

/** A lidded eye: the bottom `height` rows of the open eye, flat on top. */
export function lidEye(width: number, fullHeight: number, height: number): EyeMask {
  return openEye(width, fullHeight).slice(fullHeight - height);
}

function arcHeight(eyeHeight: number): number {
  if (eyeHeight >= TALL_EYE) return TALL_ARC;
  return Math.min(eyeHeight, SHORT_ARC);
}

function arcRow(width: number, y: number): string {
  if (y === 0) return capRow(width);
  if (y === 1 && width >= ROUND_MIN_WIDTH) return row(width, (x) => x < SHOULDER || x >= width - SHOULDER);
  return row(width, (x) => x === 0 || x === width - 1);
}

/** A happy eye: an upside-down U arc, shorter than the open eye. */
export function happyArc(width: number, eyeHeight: number): EyeMask {
  return Array.from({ length: arcHeight(eyeHeight) }, (_, y) => arcRow(width, y));
}

/** An angry left eye: the open eye with its inner top corner cut away along a 45 degree slant. */
export function angryEye(width: number, height: number): EyeMask {
  const slant = Math.max(0, Math.min(width - 1, height - 1));
  const isRound = width >= ROUND_MIN_WIDTH && height >= ANGRY_ROUND_MIN_HEIGHT;
  return Array.from({ length: height }, (_, y) => {
    if (y < slant) return row(width, (x) => x <= y);
    return isRound && y === height - 1 ? capRow(width) : fullRow(width);
  });
}

/** Flips a mask left to right, turning a left eye into a right eye. */
export function mirrorMask(mask: EyeMask): EyeMask {
  return mask.map((line) => [...line].reverse().join(''));
}
