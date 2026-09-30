import type { GridSize } from '../types';
import { createBlankFrame, createFrameFromPoints } from './helpers';
import type { Point, RecipeOutput } from './helpers';

const STROKE_MS = 40;
const SHAKE_MS = 60;
const BLINK_MS = 160;
const HOLD_MS = 1500;
const INSET_MIN_SIDE = 7;
const SHAKE_OFFSETS = [-1, 0, 1] as const;
const BLINK_COUNT = 2;

/** The centred square both result marks are drawn in: `inset` is kept clear, `size` is odd unless even centres exactly. */
export interface ResultSquare {
  inset: number;
  size: number;
  left: number;
  top: number;
}

/** Where an extent starts when the leftover space is split floor before, ceil after. */
export function centredStart(space: number, extent: number): number {
  return Math.floor((space - extent) / 2);
}

function isExactlyCentred({ cols, rows }: GridSize, size: number): boolean {
  return (cols - size) % 2 === 0 && (rows - size) % 2 === 0;
}

/** Returns the centred square shared by the check and cross recipes. */
export function getResultSquare(grid: GridSize): ResultSquare {
  const shortSide = Math.min(grid.cols, grid.rows);
  const inset = shortSide >= INSET_MIN_SIDE ? 1 : 0;
  const fitted = shortSide - 2 * inset;
  const size = fitted % 2 === 1 || isExactlyCentred(grid, fitted) ? fitted : fitted - 1;
  return { inset, size, left: centredStart(grid.cols, size), top: centredStart(grid.rows, size) };
}

function strokePoints({ size, left, top }: ResultSquare): Point[] {
  const falling = Array.from({ length: size }, (_, step): Point => [left + step, top + step]);
  const rising = Array.from({ length: size }, (_, step): Point => [left + size - 1 - step, top + step]);
  const isShared = ([x, y]: Point) => falling.some(([fx, fy]) => fx === x && fy === y);
  return [...falling, ...rising.filter((point) => !isShared(point))];
}

function shift(points: readonly Point[], dx: number): Point[] {
  return points.map(([x, y]): Point => [x + dx, y]);
}

function hasShakeRoom(grid: GridSize, square: ResultSquare): boolean {
  return square.left >= 1 && grid.cols - square.left - square.size >= 1;
}

function settle(grid: GridSize, square: ResultSquare, points: readonly Point[]): RecipeOutput {
  const full = createFrameFromPoints(grid, points);
  if (hasShakeRoom(grid, square)) {
    const shaken = SHAKE_OFFSETS.map((dx) => createFrameFromPoints(grid, shift(points, dx)));
    return { frames: [...shaken, full], durations: [...shaken.map(() => SHAKE_MS), HOLD_MS] };
  }
  const blink = Array.from({ length: BLINK_COUNT }, () => [createBlankFrame(grid), full]).flat();
  return {
    frames: blink,
    durations: blink.map((_, index) => (index === blink.length - 1 ? HOLD_MS : BLINK_MS)),
  };
}

/** Two 45-degree diagonals drawn one after the other, then shaken a column at a time (or blinked on narrow grids) and held. */
export function generateCross(grid: GridSize): RecipeOutput {
  const square = getResultSquare(grid);
  const points = strokePoints(square);
  const strokes = points.map((_, index) => createFrameFromPoints(grid, points.slice(0, index + 1)));
  const ending = settle(grid, square, points);
  return {
    frames: [...strokes, ...ending.frames],
    durations: [
      ...strokes.map((_, index) => (index === strokes.length - 1 ? SHAKE_MS : STROKE_MS)),
      ...ending.durations,
    ],
  };
}
