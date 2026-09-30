import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';

/** One full turn in radians. */
export const TAU = Math.PI * 2;

const HALF = 0.5;
const EASE_POWER = 2;

/** Fractional part of `value`, always in [0, 1). */
export function frac(value: number): number {
  return value - Math.floor(value);
}

/** Smooth ease in and out for `progress` in [0, 1]. */
export function easeInOut(progress: number): number {
  if (progress < HALF) return EASE_POWER * progress * progress;
  return 1 - EASE_POWER * (1 - progress) * (1 - progress);
}

/** `count` when it is a positive whole number, else `fallback`, capped to [1, max]. */
export function pickCount(count: number | undefined, fallback: number, max: number): number {
  const picked = count !== undefined && count > 0 ? count : fallback;
  return Math.min(max, Math.max(1, Math.round(picked)));
}

/** True when the cell at `x`, `y` is inside the grid and lit. */
export function isLitAt(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  const isInside = x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
  return isInside && frame[y * grid.cols + x] === 1;
}

/** Lights every cell lit in any of the frames. */
export function unionFrames(grid: GridSize, frames: readonly Frame[]): Frame {
  return createFrame(grid, (x, y) => frames.some((frame) => isLitAt(frame, grid, x, y)));
}

/** Places a smaller frame on the grid with its top-left cell at `left`, `top`. */
export function placeFrame(
  grid: GridSize,
  part: Frame,
  partGrid: GridSize,
  left: number,
  top: number,
): Frame {
  return createFrame(grid, (x, y) => isLitAt(part, partGrid, x - left, y - top));
}

/** Moves every lit cell down by `rows`; cells pushed past the bottom are dropped. */
export function shiftDown(grid: GridSize, frame: Frame, rows: number): Frame {
  return createFrame(grid, (x, y) => isLitAt(frame, grid, x, y - rows));
}
