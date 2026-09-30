import type { GridSize, RecipeParams } from '../types';
import { createRng } from '../rng';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const FRAME_MS = 90;

/** Default params of the `noise` recipe. */
export const NOISE_DEFAULTS = { seed: 3, frames: 8, density: 0.3 } as const satisfies RecipeParams;

/** Random static; `density` is the chance that a dot is lit. */
export function generateNoise(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const random = createRng(params.seed ?? NOISE_DEFAULTS.seed);
  const count = params.frames || NOISE_DEFAULTS.frames;
  const density = params.density ?? NOISE_DEFAULTS.density;
  const frames = Array.from({ length: count }, () => createFrame(grid, () => random() < density));
  return { frames, durations: frames.map(() => FRAME_MS) };
}
