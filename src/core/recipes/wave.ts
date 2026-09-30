import type { GridSize, RecipeParams } from '../types';
import { createFrameFromPoints, getCentre } from './helpers';
import type { Point, RecipeOutput } from './helpers';

const FRAME_MS = 70;
const MIN_FRAMES = 8;

/** Default params of the `wave` recipe; `frames` defaults to the column count, at least 8. */
export const WAVE_DEFAULTS = { trail: 0 } as const satisfies RecipeParams;

/** One sine period scrolling left across the grid; any `trail` thickens the line downwards. */
export function generateWave(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const { cols, rows } = grid;
  const { cy } = getCentre(grid);
  const count = params.frames || Math.max(MIN_FRAMES, cols);
  const isThick = Boolean(params.trail ?? WAVE_DEFAULTS.trail);
  const frames = Array.from({ length: count }, (_, index) =>
    createFrameFromPoints(
      grid,
      Array.from({ length: cols }, (__, x): Point[] => {
        const height = Math.round(cy + cy * Math.sin(Math.PI * 2 * (x / cols + index / count)));
        return isThick
          ? [
              [x, height],
              [x, Math.min(rows - 1, height + 1)],
            ]
          : [[x, height]];
      }).flat(),
    ),
  );
  return { frames, durations: frames.map(() => FRAME_MS) };
}
