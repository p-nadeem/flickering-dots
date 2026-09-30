import type { Bit, Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import type { Point } from '../helpers';

/** Hold of the final frame of a one-shot result, in ms. */
export const RESULT_HOLD_MS = 1500;

/** Lights every cell lit in either frame. */
export function orFrames(a: Frame, b: Frame): Frame {
  return a.map((bit, index): Bit => (bit === 1 || b[index] === 1 ? 1 : 0));
}

/** Moves a frame down by `rows` (up when negative); cells pushed off the grid are dropped. */
export function shiftFrame(frame: Frame, grid: GridSize, rows: number): Frame {
  return createFrame(grid, (x, y) => {
    const sourceY = y - rows;
    return sourceY >= 0 && sourceY < grid.rows && frame[sourceY * grid.cols + x] === 1;
  });
}

/** Lights the given points on a copy of `frame`; points outside the grid are ignored. */
export function withPoints(frame: Frame, grid: GridSize, points: readonly Point[]): Frame {
  const lit = new Set(
    points
      .filter(([x, y]) => x >= 0 && y >= 0 && x < grid.cols && y < grid.rows)
      .map(([x, y]) => y * grid.cols + x),
  );
  return frame.map((bit, index): Bit => (bit === 1 || lit.has(index) ? 1 : 0));
}

/** Plays items forward then back without repeating either end, so the loop has no stall. */
export function pingPong<T>(items: readonly T[]): T[] {
  return [...items, ...items.slice(1, -1).reverse()];
}

/** Returns `durations` with the last entry replaced by `lastMs`. */
export function withLastDuration(durations: readonly number[], lastMs: number): number[] {
  return durations.map((ms, index) => (index === durations.length - 1 ? lastMs : ms));
}

/** Row of the top-most lit cell, or `grid.rows` for a blank frame. */
export function topLitRow(frame: Frame, grid: GridSize): number {
  const first = frame.indexOf(1);
  return first < 0 ? grid.rows : Math.floor(first / grid.cols);
}
