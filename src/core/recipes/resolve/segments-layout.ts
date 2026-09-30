import type { GridSize } from '../../types';
import { centredStart } from '../cross';
import type { Point } from '../helpers';
import { range } from './shared';

/** One of the seven segments: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle. */
export type SegmentId = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

/** Size of one digit cell in dots. */
export interface DigitCell {
  width: number;
  height: number;
}

/** Where the digit cells sit on the grid. */
export interface DigitsLayout {
  cell: DigitCell;
  origins: readonly Point[];
}

const SEGMENT_IDS: readonly SegmentId[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const DIGIT_SEGMENTS: readonly string[] = [
  'abcdef',
  'bc',
  'abdeg',
  'abcdg',
  'bcfg',
  'acdfg',
  'acdefg',
  'abc',
  'abcdefg',
  'abcdfg',
];
const CELLS: readonly DigitCell[] = [
  { width: 3, height: 5 },
  { width: 5, height: 7 },
  { width: 6, height: 9 },
  { width: 7, height: 11 },
  { width: 8, height: 13 },
  { width: 9, height: 15 },
];
const WIDE_CELL = 5;
const NARROW_GAP = 1;
const WIDE_GAP = 2;
const GLYPH_PATTERN = /^(\d{1,2})(?:-(\d{1,2}))?$/;
const BLANK_DIGIT = ' ';

/** True when `glyph` is a number from 0 to 99 or a range such as 5-1 or 0-9. */
export function isSegmentsGlyph(glyph: string): boolean {
  return GLYPH_PATTERN.test(glyph);
}

/** Reads a segments glyph as the numbers it shows in order, throwing a readable error when it is not one. */
export function parseNumbers(glyph: string): number[] {
  const match = GLYPH_PATTERN.exec(glyph);
  if (!match) {
    throw new Error(
      `flickering-dots resolve: glyph ${JSON.stringify(glyph)} is not a segments glyph; use a number from 0 to 99 or a range such as 5-1`,
    );
  }
  const from = Number(match[1]);
  const to = match[2] === undefined ? from : Number(match[2]);
  const step = to >= from ? 1 : -1;
  return range(0, Math.abs(to - from) + 1).map((index) => from + index * step);
}

/** The segments lit for each position of `value`, right aligned in `places` digits. */
export function numberSegments(value: number, places: number): SegmentId[][] {
  return [...String(value).padStart(places, BLANK_DIGIT)].map((digit) =>
    digit === BLANK_DIGIT ? [] : SEGMENT_IDS.filter((id) => DIGIT_SEGMENTS[Number(digit)].includes(id)),
  );
}

function gapFor(cell: DigitCell): number {
  return cell.width >= WIDE_CELL ? WIDE_GAP : NARROW_GAP;
}

function spanOf(cell: DigitCell, places: number): number {
  return places * cell.width + (places - 1) * gapFor(cell);
}

/** Picks the largest digit cell that fits `places` digits on the grid and centres them. */
export function digitsLayout(grid: GridSize, places: number): DigitsLayout {
  const fitting = CELLS.filter((cell) => spanOf(cell, places) <= grid.cols && cell.height <= grid.rows);
  const cell = fitting[fitting.length - 1] ?? CELLS[0];
  const left = centredStart(grid.cols, spanOf(cell, places));
  const top = centredStart(grid.rows, cell.height);
  const origins = range(0, places).map((place): Point => [left + place * (cell.width + gapFor(cell)), top]);
  return { cell, origins };
}

/** The two endpoints of a segment inside a cell, in cell coordinates. */
export function segmentEnds({ width, height }: DigitCell, id: SegmentId): readonly [Point, Point] {
  const right = width - 1;
  const middle = (height - 1) / 2;
  const bottom = height - 1;
  const ends: Readonly<Record<SegmentId, readonly [Point, Point]>> = {
    a: [
      [0, 0],
      [right, 0],
    ],
    b: [
      [right, 0],
      [right, middle],
    ],
    c: [
      [right, middle],
      [right, bottom],
    ],
    d: [
      [0, bottom],
      [right, bottom],
    ],
    e: [
      [0, middle],
      [0, bottom],
    ],
    f: [
      [0, 0],
      [0, middle],
    ],
    g: [
      [0, middle],
      [right, middle],
    ],
  };
  return ends[id];
}

/** The cells of a straight segment from `from` to `to`, both ends included. */
export function strokeCells([fromX, fromY]: Point, [toX, toY]: Point): Point[] {
  const length = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
  return range(0, length + 1).map((step): Point => [
    fromX + Math.sign(toX - fromX) * step,
    fromY + Math.sign(toY - fromY) * step,
  ]);
}
