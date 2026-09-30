import type { GridSize } from '../types';
import { createFrame, getCentre } from './helpers';
import type { RecipeOutput } from './helpers';

const HOLD_MS = 700;
const STEP_MS = 280;
const HALF_CELL = 0.5;
const TOLERANCE = 0.01;

/** A square that grows from the centre dot to fill the grid and shrinks back, holding at both ends. */
export function generateBreathe(grid: GridSize): RecipeOutput {
  const { cx, cy } = getCentre(grid);
  const largest = Math.floor(Math.min(cx, cy) + TOLERANCE);
  const drawSquare = (size: number) =>
    createFrame(grid, (x, y) => Math.max(Math.abs(x - cx), Math.abs(y - cy)) <= size + HALF_CELL);
  const growing = Array.from({ length: largest + 1 }, (_, size) => size);
  const shrinking = Array.from({ length: Math.max(0, largest - 1) }, (_, index) => largest - 1 - index);
  return {
    frames: [...growing, ...shrinking].map(drawSquare),
    durations: [
      ...growing.map((size) => (size === 0 || size === largest ? HOLD_MS : STEP_MS)),
      ...shrinking.map(() => STEP_MS),
    ],
  };
}
