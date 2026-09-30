import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { GRAIN_STEP_MS, STEPS_PER_GRAIN, flowShots, restShot } from './hourglass-draw';
import { getHourglassLayout } from './hourglass-layout';
import type { HourglassLayout } from './hourglass-layout';
import { getProgressMarks, mergedShotsToOutput, shotsToOutput } from './shared';
import type { Shot } from './shared';

const TURN_MS = 200;
const EMPTY_HOLD_MS = 400;
const SLOW_STEP_MS = 200;
const FULL_IDLE_MS = 1200;
const PROGRESS_HOLD_MS = 480;
const DEFAULT_SEED = 11;

function drainLoop(grid: GridSize, stepMs: number): RecipeOutput {
  const layout = getHourglassLayout(grid);
  const grains = layout.drain.length;
  const shots: Shot[] = [
    restShot(layout, 0, TURN_MS),
    ...flowShots(layout, 0, grains, stepMs),
    restShot(layout, grains, EMPTY_HOLD_MS),
  ];
  return shotsToOutput(grid, shots, 1 + STEPS_PER_GRAIN * Math.round(grains / 2));
}

/** Sand drains through the neck two sub-frames per grain, holds empty, then the glass turns back to full. */
export function generateHourglass(grid: GridSize): RecipeOutput {
  return drainLoop(grid, GRAIN_STEP_MS);
}

/** The same drain at one grain per 400 ms, for a rate-limited wait. */
export function generateHourglassSlow(grid: GridSize): RecipeOutput {
  return drainLoop(grid, SLOW_STEP_MS);
}

function baseCorners({ fill, bottomRow }: HourglassLayout): Point[] {
  const xs = fill.filter(([, y]) => y === bottomRow).map(([x]) => x);
  if (xs.length < 2) return [];
  return [
    [Math.min(...xs), bottomRow],
    [Math.max(...xs), bottomRow],
  ];
}

/** The full top chamber with no flow, over the two base corners of the empty bottom chamber. */
export function generateHourglassFull(grid: GridSize): RecipeOutput {
  const layout = getHourglassLayout(grid);
  const rest = restShot(layout, 0, FULL_IDLE_MS);
  return shotsToOutput(grid, [{ ...rest, points: [...rest.points, ...baseCorners(layout)] }]);
}

/** Drains in seeded uneven steps, k = round(p * grains), resting between updates. */
export function generateHourglassProgress(grid: GridSize, params: RecipeParams): RecipeOutput {
  const layout = getHourglassLayout(grid);
  const grains = layout.drain.length;
  const targets = getProgressMarks(params.seed ?? DEFAULT_SEED).map((mark) => Math.round(mark * grains));
  const steps = targets.flatMap((target, index): Shot[] => [
    ...flowShots(layout, index === 0 ? 0 : targets[index - 1], target, GRAIN_STEP_MS),
    restShot(layout, target, index === targets.length - 1 ? EMPTY_HOLD_MS : PROGRESS_HOLD_MS),
  ]);
  return mergedShotsToOutput(grid, [restShot(layout, 0, TURN_MS + PROGRESS_HOLD_MS), ...steps]);
}
