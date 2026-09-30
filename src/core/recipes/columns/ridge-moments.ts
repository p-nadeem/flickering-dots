import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { mergeOnce, toShots } from './clip-merge';
import type { Shot } from './clip-merge';
import { ridgePhase } from './ridge';
import {
  drawRidges,
  RIDGE_FULL_AMPLITUDE,
  ridgeLayout,
  ridgeTop,
  surfaceFrame,
  surfaceLines,
} from './ridge-surface';
import type { RidgeLayout } from './ridge-surface';
import { RESULT_HOLD_MS, settleIntoCheck } from './shared';

const STEP_MS = 90;
const LIFT_MS = 60;
const FLATTEN_STEPS = 4;
const SPIKE_AMPLITUDES = [1, 0.5] as const;
const SPIKE_HALF_WIDTH = 1;
const SHOULDER_HALF_WIDTH = 2;

function flattenShots(grid: GridSize, layout: RidgeLayout): Shot[] {
  return Array.from({ length: FLATTEN_STEPS + 1 }, (_, step) => ({
    frame: surfaceFrame(grid, layout, RIDGE_FULL_AMPLITUDE * (1 - step / FLATTEN_STEPS), ridgePhase(step)),
    ms: STEP_MS,
  }));
}

function dropBackShots(grid: GridSize, layout: RidgeLayout): Shot[] {
  const flat = layout.bases.map((base) => Array.from({ length: grid.cols }, () => base));
  return flat.slice(1).map((_, index) => ({
    frame: drawRidges(grid, flat.slice(0, flat.length - 1 - index)),
    ms: STEP_MS,
  }));
}

/** Ridgeline success: the surface flattens over 4 frames, the back lines drop away and the front line lifts into the check. */
export function generateRidgeSettle(grid: GridSize, _params: RecipeParams): RecipeOutput {
  const layout = ridgeLayout(grid);
  const frontLine = Array.from({ length: grid.cols }, () => layout.bases[0]);
  return mergeOnce([
    ...flattenShots(grid, layout),
    ...dropBackShots(grid, layout),
    ...toShots(settleIntoCheck(grid, frontLine, LIFT_MS)),
  ]);
}

function spikeRow(layout: RidgeLayout, row: number, x: number): number {
  const distance = Math.abs(x - layout.centre);
  const top = ridgeTop(layout);
  if (distance < SPIKE_HALF_WIDTH) return top;
  return distance < SHOULDER_HALF_WIDTH ? Math.min(row, Math.round((top + layout.bases[0]) / 2)) : row;
}

function withSpike(layout: RidgeLayout, lines: readonly (readonly number[])[]): number[][] {
  const front = lines[0].map((row, x) => spikeRow(layout, row, x));
  return [front, ...lines.slice(1).map((line) => [...line])];
}

/** Ridgeline error: a single spike shoots up from the front line for 2 frames, then every line goes flat. */
export function generateRidgeSpike(grid: GridSize, _params: RecipeParams): RecipeOutput {
  const layout = ridgeLayout(grid);
  const spiked = SPIKE_AMPLITUDES.map((share, step) => ({
    frame: drawRidges(
      grid,
      withSpike(layout, surfaceLines(grid, layout, RIDGE_FULL_AMPLITUDE * share, ridgePhase(step))),
    ),
    ms: STEP_MS,
  }));
  return mergeOnce([...spiked, { frame: surfaceFrame(grid, layout, 0, 0), ms: RESULT_HOLD_MS }]);
}
