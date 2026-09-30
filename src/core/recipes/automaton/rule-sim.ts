import type { Bit, Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';

const NEIGHBOURHOOD_LEFT_SHIFT = 2;

/** One row of an elementary automaton on a ring. */
export type Row = readonly Bit[];

/** Where a row pattern sits inside the grid: `copies` rings of `width` cells starting at column `offset`. */
export interface RingLayout {
  width: number;
  copies: number;
  offset: number;
}

/** First step of the repeating part of a row sequence and its length. */
export interface RowCycle {
  start: number;
  period: number;
}

/** Applies an elementary rule (0 to 255) to a ring: the next cell is bit `(L << 2 | C << 1 | R)` of the rule. */
export function stepRow(row: Row, rule: number): Row {
  const width = row.length;
  return row.map((cell, index): Bit => {
    const left = row[(index - 1 + width) % width];
    const right = row[(index + 1) % width];
    const pattern = (left << NEIGHBOURHOOD_LEFT_SHIFT) | (cell << 1) | right;
    return ((rule >> pattern) & 1) === 1 ? 1 : 0;
  });
}

/** A ring layout's starting row: one lit seed in the middle of each copy. */
export function seedRow(layout: RingLayout): Row {
  const seed = Math.floor(layout.width / 2);
  return Array.from({ length: layout.width * layout.copies }, (_, index): Bit =>
    index % layout.width === seed ? 1 : 0,
  );
}

/** Rows 0 to `count - 1` of a rule run from `first`. */
export function runRows(first: Row, rule: number, count: number): Row[] {
  return Array.from({ length: Math.max(0, count - 1) }).reduce<Row[]>(
    (rows) => [...rows, stepRow(rows[rows.length - 1], rule)],
    [first],
  );
}

/** Finds where a rule run from `first` starts to repeat within `limit` steps, or undefined when it does not. */
export function findCycle(first: Row, rule: number, limit: number): RowCycle | undefined {
  const keys = runRows(first, rule, limit).map((row) => row.join(''));
  const repeat = keys.findIndex((key, step) => keys.indexOf(key) < step);
  if (repeat < 0) return undefined;
  const start = keys.indexOf(keys[repeat]);
  return { start, period: repeat - start };
}

/** Draws history rows as a view: the newest row at the bottom, older rows above, empty where history is missing. */
export function drawHistory(
  grid: GridSize,
  layout: RingLayout,
  rowAt: (step: number) => Row | undefined,
  newest: number,
): Frame {
  return createFrame(grid, (x, y) => {
    const row = rowAt(newest - (grid.rows - 1 - y));
    const ringX = x - layout.offset;
    return row !== undefined && ringX >= 0 && ringX < row.length && row[ringX] === 1;
  });
}
