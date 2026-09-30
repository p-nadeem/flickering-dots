import type { Frame, GridSize } from '../../types';
import { centredStart } from '../cross';
import { createFrame } from '../helpers';
import type { RecipeOutput } from '../helpers';
import { FLIP_POOL, FONT, FONT_HEIGHT, FONT_TOP_ROWS, FONT_WIDTH } from './font-glyphs';
import { range } from './shared';

const SLOT_GAP = 1;
const SLOT_PITCH = FONT_WIDTH + SLOT_GAP;
const LIT = '#';
const BLANK_CHARACTER = ' ';

/** Where the board's slots sit on the grid. */
export interface BoardLayout {
  left: number;
  top: number;
  slots: number;
  width: number;
}

/** What one slot shows: the top rows of `upper` over the bottom rows of `lower`. */
export interface SlotFace {
  upper: string;
  lower: string;
}

/** A lit run along one row under the board. */
export interface Underline {
  row: number;
  length: number;
}

/** Options for drawing the board. */
export interface BoardDrawing {
  faces: readonly SlotFace[];
  shift?: number;
  underline?: Underline;
}

/** Fits up to `slotCount` slots of the 3x5 font, with one-column gaps, centred on the grid. */
export function boardLayout(grid: GridSize, slotCount: number): BoardLayout {
  const capacity = Math.max(0, Math.floor((grid.cols + SLOT_GAP) / SLOT_PITCH));
  const slots = Math.min(slotCount, capacity);
  const width = Math.max(0, slots * SLOT_PITCH - SLOT_GAP);
  return { left: centredStart(grid.cols, width), top: centredStart(grid.rows, FONT_HEIGHT), slots, width };
}

/** Pads or trims a word to the layout's slot count. */
export function fitWord(word: string, layout: BoardLayout): string {
  return word.padEnd(layout.slots, BLANK_CHARACTER).slice(0, layout.slots);
}

/** The faces of a settled word. */
export function settledFaces(word: string): SlotFace[] {
  return [...word].map((character) => ({ upper: character, lower: character }));
}

function isFontCell(layout: BoardLayout, faces: readonly SlotFace[], x: number, y: number): boolean {
  const fontY = y - layout.top;
  if (fontY < 0 || fontY >= FONT_HEIGHT || x < 0) return false;
  const slot = Math.floor(x / SLOT_PITCH);
  const fontX = x - slot * SLOT_PITCH;
  if (slot >= faces.length || fontX >= FONT_WIDTH) return false;
  const face = faces[slot];
  const character = fontY < FONT_TOP_ROWS ? face.upper : face.lower;
  return FONT[character][fontY][fontX] === LIT;
}

function isUnderlineCell(
  layout: BoardLayout,
  underline: Underline | undefined,
  x: number,
  y: number,
): boolean {
  if (!underline || y !== underline.row) return false;
  return x >= layout.left && x < layout.left + underline.length;
}

/** Draws the slots' faces, moved `shift` columns, plus an optional underline. */
export function drawBoard(grid: GridSize, layout: BoardLayout, drawing: BoardDrawing): Frame {
  const shift = drawing.shift ?? 0;
  return createFrame(
    grid,
    (x, y) =>
      isFontCell(layout, drawing.faces, x - layout.left - shift, y) ||
      isUnderlineCell(layout, drawing.underline, x, y),
  );
}

function halves(character: string): readonly [top: string, bottom: string] {
  const rows = FONT[character];
  return [rows.slice(0, FONT_TOP_ROWS).join(''), rows.slice(FONT_TOP_ROWS).join('')];
}

function differsInBothHalves(a: string, b: string): boolean {
  const [aTop, aBottom] = halves(a);
  const [bTop, bBottom] = halves(b);
  return aTop !== bTop && aBottom !== bBottom;
}

function pickNext(previous: string, target: string, isLast: boolean, random: () => number): string {
  const choices = FLIP_POOL.filter(
    (character) =>
      differsInBothHalves(previous, character) && (!isLast || differsInBothHalves(character, target)),
  );
  return choices[Math.floor(random() * choices.length)];
}

/** The characters one slot shows from `from` to `to`: `flips` changes through seeded characters. */
export function slotPath(from: string, to: string, flips: number, random: () => number): string[] {
  const between = range(1, flips).reduce<string[]>(
    (path, step) => [...path, pickNext(path[path.length - 1], to, step === flips - 1, random)],
    [from],
  );
  return [...between, to];
}

function faceAt(path: readonly string[], tick: number, isHalf: boolean): SlotFace {
  const last = path.length - 1;
  if (tick >= last) return { upper: path[last], lower: path[last] };
  return { upper: path[tick + 1], lower: isHalf ? path[tick] : path[tick + 1] };
}

/** Flips every slot from its path's first character to its last, top rows first, `halfMs` per half-frame. */
export function flipFrames(
  grid: GridSize,
  layout: BoardLayout,
  paths: readonly (readonly string[])[],
  halfMs: number,
): RecipeOutput {
  const ticks = Math.max(0, ...paths.map((path) => path.length - 1));
  const frames = range(0, ticks).flatMap((tick) =>
    [true, false].map((isHalf) =>
      drawBoard(grid, layout, { faces: paths.map((path) => faceAt(path, tick, isHalf)) }),
    ),
  );
  return { frames, durations: frames.map(() => halfMs) };
}
