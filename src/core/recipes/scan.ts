import type { GridSize, RecipeParams } from '../types';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const FRAME_MS = 70;
const LAST_FRAME_MS = 240;

/** Default params of the `scan` recipe; it always has one frame per column. */
export const SCAN_DEFAULTS = { trail: 1 } as const satisfies RecipeParams;

/** A full-height bar sweeping left to right with `trail` columns behind it. */
export function generateScan(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const trail = params.trail ?? SCAN_DEFAULTS.trail;
  const frames = Array.from({ length: grid.cols }, (_, index) =>
    createFrame(grid, (x) => x <= index && x >= index - trail),
  );
  return {
    frames,
    durations: frames.map((_, index) => (index === grid.cols - 1 ? LAST_FRAME_MS : FRAME_MS)),
  };
}
