import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { blockPoints, loopLength, planCornerPath, positionAt } from './corner-path';
import type { ArcadeStep } from './shared';
import { stepsOutput } from './kit-b';
import { centreStart } from './shared';

const STEP_MS = 110;
const DRIFT_MS = 250;
const WAIT_MS = 500;

function bounceSteps(grid: GridSize, ms: number): ArcadeStep[] {
  const path = planCornerPath(grid);
  return Array.from({ length: loopLength(path) }, (_, step) => {
    const [x, y] = positionAt(path, step, path.x0, path.y0);
    return { points: blockPoints(path, x, y), ms };
  });
}

/** The block bouncing off the walls and never reaching a corner, one step per 110 ms. */
export function generateCorner(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  return stepsOutput(grid, bounceSteps(grid, STEP_MS));
}

/** The same bounce at a calm 250 ms per step. */
export function generateCornerDrift(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  return stepsOutput(grid, bounceSteps(grid, DRIFT_MS));
}

/** The block paused in the middle of the grid, blinking every 500 ms. */
export function generateCornerWait(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const path = planCornerPath(grid);
  const block = blockPoints(path, centreStart(grid.cols, path.w), centreStart(grid.rows, path.h));
  return stepsOutput(grid, [
    { points: block, ms: WAIT_MS },
    { points: [], ms: WAIT_MS },
  ]);
}
