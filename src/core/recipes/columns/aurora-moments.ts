import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import {
  auroraPhase,
  createTwinkles,
  curtainDepth,
  drawCurtain,
  isRayColumn,
  rayBottoms,
} from './aurora-sky';
import type { RayBottoms } from './aurora-sky';
import { AURORA_DEFAULTS } from './aurora';
import { mergeOnce } from './clip-merge';
import type { Shot } from './clip-merge';
import { RESULT_HOLD_MS } from './shared';

const STEP_MS = 90;
const FULL_HOLD_MS = 600;
const EASE_STEPS = 3;

function easeBottoms(from: RayBottoms, to: RayBottoms, share: number): number[] {
  return from.map((row, x) => Math.round(row + (to[x] - row) * share));
}

function easeShots(grid: GridSize, from: RayBottoms, to: RayBottoms): Shot[] {
  return Array.from({ length: EASE_STEPS }, (_, step) => ({
    frame: drawCurtain(grid, easeBottoms(from, to, (step + 1) / EASE_STEPS), 0),
    ms: STEP_MS,
  }));
}

function evenCurtain(grid: GridSize, depth: number): number[] {
  return Array.from({ length: grid.cols }, (_, x) => (isRayColumn(x, grid.cols) ? depth : -1));
}

/** Aurora success: every ray drops to full length together over 3 frames, holds 600 ms, then settles into an even curtain. */
export function generateAuroraFull(grid: GridSize, params: RecipeParams): RecipeOutput {
  const twinkles = createTwinkles(grid, params.seed ?? AURORA_DEFAULTS.seed);
  const start = rayBottoms(grid, auroraPhase(0), curtainDepth(grid), AURORA_DEFAULTS.density);
  const full = evenCurtain(grid, grid.rows - 1);
  const settled = evenCurtain(grid, Math.round(curtainDepth(grid)) - 1);
  const drop = easeShots(grid, start, full);
  const settle = easeShots(grid, full, settled);
  return mergeOnce([
    { frame: drawCurtain(grid, start, 0, twinkles), ms: STEP_MS },
    ...drop.slice(0, -1),
    { frame: drop[drop.length - 1].frame, ms: FULL_HOLD_MS },
    ...settle.slice(0, -1),
    { frame: settle[settle.length - 1].frame, ms: RESULT_HOLD_MS },
  ]);
}

/** Aurora error: the rays retract upward 1 row per 90 ms until the sky is dark. */
export function generateAuroraFade(grid: GridSize, params: RecipeParams): RecipeOutput {
  const twinkles = createTwinkles(grid, params.seed ?? AURORA_DEFAULTS.seed);
  const start = rayBottoms(grid, auroraPhase(0), curtainDepth(grid), AURORA_DEFAULTS.density);
  const steps = Math.max(0, ...start) + 1;
  const retract = Array.from({ length: steps }, (_, step) => ({
    frame: drawCurtain(
      grid,
      start.map((row) => row - step),
      step,
      twinkles,
    ),
    ms: STEP_MS,
  }));
  return mergeOnce([
    ...retract,
    {
      frame: drawCurtain(
        grid,
        start.map(() => -1),
        0,
      ),
      ms: RESULT_HOLD_MS,
    },
  ]);
}
