import type { Frame, GridSize, RecipeParams } from '../types';
import { createRng } from '../rng';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const TYPE_MS = 90;
const BLINK_MS = 530;
const MIN_WORD = 2;
const MAX_WORD = 5;
const WORD_GAP = 1;
const CARET_HEIGHT = 3;
const CARET_COLUMNS = 1;
const MAX_LINES = 3;
const LINE_PITCH = 2;
const MULTILINE_MIN_ROWS = 5;
const BLINK_CARET: readonly boolean[] = [false, true, false];

/** Default params of the `typewriter` recipe; `seed` picks the word lengths. */
export const TYPEWRITER_DEFAULTS = { seed: 31 } as const satisfies RecipeParams;

interface Line {
  row: number;
  cells: ReadonlySet<number>;
  end: number;
}

interface Cursor {
  line: number;
  column: number;
  isCaretShown: boolean;
}

function getLineRows(rows: number): number[] {
  if (rows < MULTILINE_MIN_ROWS) return [Math.floor((rows - 1) / 2)];
  const count = Math.min(MAX_LINES, Math.floor((rows - 1) / LINE_PITCH));
  const top = Math.floor((rows - (count * LINE_PITCH + 1)) / 2);
  return Array.from({ length: count }, (_, index) => top + 1 + index * LINE_PITCH);
}

function packWords(width: number, random: () => number, start = 0): number[] {
  if (width - start < MIN_WORD) return [];
  const drawn = MIN_WORD + Math.floor(random() * (MAX_WORD - MIN_WORD + 1));
  const length = Math.min(drawn, width - start);
  const word = Array.from({ length }, (_, offset) => start + offset);
  return [...word, ...packWords(width, random, start + length + WORD_GAP)];
}

function createLines(grid: GridSize, seed: number): Line[] {
  const random = createRng(seed);
  const width = grid.cols - CARET_COLUMNS;
  return getLineRows(grid.rows).map((row) => {
    const cells = packWords(width, random);
    return { row, cells: new Set(cells), end: cells.length > 0 ? Math.max(...cells) + 1 : 0 };
  });
}

function isCaretCell(grid: GridSize, line: Line, cursor: Cursor, x: number, y: number): boolean {
  const top = Math.max(0, line.row - 1);
  const height = Math.min(grid.rows, CARET_HEIGHT);
  return cursor.isCaretShown && x === cursor.column && y >= top && y < top + height;
}

function drawCursor(grid: GridSize, lines: readonly Line[], cursor: Cursor): Frame {
  const current = lines[cursor.line];
  return createFrame(grid, (x, y) => {
    if (isCaretCell(grid, current, cursor, x, y)) return true;
    const lineIndex = lines.findIndex((line) => line.row === y);
    if (lineIndex < 0 || lineIndex > cursor.line || !lines[lineIndex].cells.has(x)) return false;
    return lineIndex < cursor.line || x < cursor.column;
  });
}

function getCursors(lines: readonly Line[]): Cursor[] {
  const typing = lines.flatMap((line, lineIndex) =>
    Array.from({ length: line.end + 1 }, (_, column) => ({ line: lineIndex, column, isCaretShown: true })),
  );
  const last = typing[typing.length - 1];
  const blink = BLINK_CARET.map((isCaretShown) => ({ ...last, isCaretShown }));
  return [...typing, ...blink];
}

function getDuration(index: number, blinkStart: number): number {
  return index === 0 || index >= blinkStart ? BLINK_MS : TYPE_MS;
}

/** Dot-words of 2 to 5 dots typed one per frame behind a steady caret, which blinks twice at the end of the text before the line clears; `seed` picks the words. */
export function generateTypewriter(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const lines = createLines(grid, params.seed ?? TYPEWRITER_DEFAULTS.seed);
  const cursors = getCursors(lines);
  const blinkStart = cursors.length - BLINK_CARET.length - 1;
  const frames = cursors.map((cursor) => drawCursor(grid, lines, cursor));
  return { frames, durations: frames.map((_, index) => getDuration(index, blinkStart)) };
}
