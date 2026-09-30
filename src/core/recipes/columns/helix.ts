import type { Frame, GridSize, RecipeParams } from '../../types';
import { MIN_BIG_CHANGE_GAP_MS } from '../flash-spacing';
import { createFrame } from '../helpers';
import type { RecipeFn, RecipeOutput } from '../helpers';
import { drawHelix, rungPhases, strandRows } from './helix-draw';
import type { HelixPose } from './helix-draw';
import {
  evenDurations,
  joinOutputs,
  RESULT_HOLD_MS,
  settleIntoCheck,
  smoothstep,
  withLastDuration,
} from './shared';

const SLOW_MS = 400;
const FAST_COLUMNS_PER_STEP = 2;
const ZIP_FRAMES = 6;
const ZIP_MS = 80;
const UNRAVEL_MS = 80;

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function turnOutput(grid: GridSize, params: RecipeParams, columnsPerStep: number, ms: number): RecipeOutput {
  const rungs = rungPhases(grid.cols, params);
  const count = grid.cols / greatestCommonDivisor(grid.cols, columnsPerStep);
  const frames = Array.from({ length: count }, (_, index) =>
    drawHelix(grid, { turn: index * columnsPerStep, scale: 1, rungs }),
  );
  return { frames, durations: evenDurations(frames.length, ms) };
}

/** Two strands twist around each other with rungs between them, one column per 170 ms. */
export const generateHelix: RecipeFn = (grid, params) => turnOutput(grid, params, 1, MIN_BIG_CHANGE_GAP_MS);

/** The helix turning one column per 400 ms. */
export const generateHelixSlow: RecipeFn = (grid, params) => turnOutput(grid, params, 1, SLOW_MS);

/** The helix turning two columns per 170 ms. */
export const generateHelixFast: RecipeFn = (grid, params) =>
  turnOutput(grid, params, FAST_COLUMNS_PER_STEP, MIN_BIG_CHANGE_GAP_MS);

/** The strands zip into one middle line as the twist eases flat, then settle into the check. */
export const generateHelixZip: RecipeFn = (grid, params) => {
  const rungs = rungPhases(grid.cols, params);
  const poses: HelixPose[] = Array.from({ length: ZIP_FRAMES + 1 }, (_, turn) => ({
    turn,
    scale: 1 - smoothstep(turn / ZIP_FRAMES),
    rungs,
  }));
  const frames = poses.map((pose) => drawHelix(grid, pose));
  const line = strandRows(grid, poses[ZIP_FRAMES]).map(({ a }) => a);
  return joinOutputs([
    { frames, durations: evenDurations(frames.length, ZIP_MS) },
    settleIntoCheck(grid, line, ZIP_MS),
  ]);
};

function flattenFrames(grid: GridSize, columns: readonly { a: number; b: number }[]): Frame[] {
  const bottom = grid.rows - 1;
  const steps = Math.max(1, ...columns.map(({ a, b }) => Math.max(Math.min(a, b), bottom - Math.max(a, b))));
  return Array.from({ length: steps }, (_, index) =>
    createFrame(grid, (x, y) => {
      const { a, b } = columns[x];
      return (
        y === Math.max(0, Math.min(a, b) - index - 1) || y === Math.min(bottom, Math.max(a, b) + index + 1)
      );
    }),
  );
}

/** The rungs drop out one at a time, then the strands pull apart flat to the top and bottom rows. */
export const generateHelixUnravel: RecipeFn = (grid, params) => {
  const rungs = rungPhases(grid.cols, params);
  const pose: HelixPose = { turn: 0, scale: 1, rungs };
  const dropping = Array.from({ length: rungs.length + 1 }, (_, dropped) =>
    drawHelix(grid, { ...pose, rungs: rungs.slice(dropped) }),
  );
  const unique = dropping.filter(
    (frame, index) => index === 0 || frame.join('') !== dropping[index - 1].join(''),
  );
  const frames = [...unique, ...flattenFrames(grid, strandRows(grid, pose))];
  return withLastDuration({ frames, durations: evenDurations(frames.length, UNRAVEL_MS) }, RESULT_HOLD_MS);
};
