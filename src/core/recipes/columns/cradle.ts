import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { mergeLoop, scaleShots } from './clip-merge';
import type { Shot } from './clip-merge';
import { cradleLayout, swingFrame, swingShots } from './cradle-scene';

const REST_MS = 2700;
const LIFT_MS = 300;
const SLOW_FACTOR = 2;

function swingLoop(grid: GridSize): Shot[] {
  const layout = cradleLayout(grid);
  return [...swingShots(grid, layout, 1, layout.reach), ...swingShots(grid, layout, -1, layout.reach)];
}

/** Cradle thinking: the right end ball swings out and clacks, then the left one, 880 ms a loop at 9x4. */
export function generateCradle(grid: GridSize, _params: RecipeParams): RecipeOutput {
  return mergeLoop(swingLoop(grid));
}

/** Cradle waiting: the same swing with every duration doubled. */
export function generateCradleSlow(grid: GridSize, _params: RecipeParams): RecipeOutput {
  return mergeLoop(scaleShots(swingLoop(grid), SLOW_FACTOR));
}

/** Cradle idle: the balls at rest, the right end ball lifting 1 cell for 300 ms every 3 s. */
export function generateCradleRest(grid: GridSize, _params: RecipeParams): RecipeOutput {
  const layout = cradleLayout(grid);
  return mergeLoop([
    { frame: swingFrame(grid, layout, 1, 0), ms: REST_MS },
    { frame: swingFrame(grid, layout, 1, 1), ms: LIFT_MS },
  ]);
}
