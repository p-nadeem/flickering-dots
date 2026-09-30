import type { GridSize } from '../types';
import { createBlankFrame, createFrame, getCentre } from './helpers';
import type { RecipeOutput } from './helpers';

const ON_MS = 1500;
const OFF_MS = 420;
const HALF_CELL = 0.5;

/** A slow blink of the centre dot, or the centre two by two on even sides. */
export function generateIdle(grid: GridSize): RecipeOutput {
  const { cx, cy } = getCentre(grid);
  const centreDot = createFrame(
    grid,
    (x, y) => Math.abs(x - cx) <= HALF_CELL && Math.abs(y - cy) <= HALF_CELL,
  );
  return { frames: [centreDot, createBlankFrame(grid)], durations: [ON_MS, OFF_MS] };
}
