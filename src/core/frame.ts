import { GRID_MAX, GRID_MIN } from './constants';
import type { Bit, Frame, GridSize } from './types';

function toBit(isLit: boolean): Bit {
  return isLit ? 1 : 0;
}

/** Builds a frame by asking `isLit` about every cell in row-major order; blank when `isLit` is omitted. */
export function createFrame(grid: GridSize, isLit: (x: number, y: number) => boolean = () => false): Frame {
  return Array.from({ length: grid.cols * grid.rows }, (_, index) =>
    toBit(isLit(index % grid.cols, Math.floor(index / grid.cols))),
  );
}

/** Index of the cell at `x`, `y` in a row-major frame `cols` wide. */
export function cellIndex(cols: number, x: number, y: number): number {
  return y * cols + x;
}

/** Number of lit cells in a frame. */
export function countLit(frame: Frame): number {
  return frame.reduce<number>((total, bit) => total + bit, 0);
}

/** True when both frames have the same length and the same cells. */
export function framesEqual(a: Frame, b: Frame): boolean {
  return a.length === b.length && a.every((bit, index) => bit === b[index]);
}

/** True for a whole number from `GRID_MIN` to `GRID_MAX`. */
export function isGridSide(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= GRID_MIN && value <= GRID_MAX;
}

/** True for a finite duration above 0 ms. */
export function isFrameDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
