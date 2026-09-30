import type { GridSize, RecipeParams } from '../../types';
import type { RecipeFn, RecipeOutput } from '../helpers';
import {
  evenDurations,
  frameFromColumnRows,
  joinOutputs,
  middleRow,
  RESULT_HOLD_MS,
  settleIntoCheck,
  TAU,
  wholeWithin,
  withLastDuration,
} from './shared';

const WAVE_MS = 45;
const SYNC_FRAMES = 40;
const SYNC_MS = 60;
const DEFAULT_LENGTH = 6;
const SHORT_LENGTH = 4;
const SHORT_BELOW_COLS = 9;
const MAX_LENGTH = 16;
const TRAVEL_LENGTH = 1;
const FRAMES_PER_FASTEST_SWING = 8;
const LINE_HOLD_MS = 400;
const SETTLE_MS = 60;
const DROP_MS = 60;

function bobRow(rows: number, cycles: number, frame: number, period: number): number {
  const mid = (rows - 1) / 2;
  return Math.round(mid + mid * Math.cos((TAU * cycles * frame) / period));
}

function waveOutput(grid: GridSize, length: number): RecipeOutput {
  const period = FRAMES_PER_FASTEST_SWING * (length + grid.cols - 1);
  const frames = Array.from({ length: period }, (_, frame) =>
    frameFromColumnRows(
      grid,
      Array.from({ length: grid.cols }, (__, x) => bobRow(grid.rows, length + x, frame, period)),
    ),
  );
  return { frames, durations: evenDurations(period, WAVE_MS) };
}

function syncOutput(grid: GridSize): RecipeOutput {
  const frames = Array.from({ length: SYNC_FRAMES }, (_, frame) =>
    frameFromColumnRows(
      grid,
      Array.from({ length: grid.cols }, () => bobRow(grid.rows, 1, frame, SYNC_FRAMES)),
    ),
  );
  return { frames, durations: evenDurations(SYNC_FRAMES, SYNC_MS) };
}

function travelOutput(grid: GridSize): RecipeOutput {
  const frames = Array.from({ length: SYNC_FRAMES }, (_, frame) =>
    frameFromColumnRows(
      grid,
      Array.from({ length: grid.cols }, (__, x) =>
        bobRow(grid.rows, 1, frame * grid.cols - x * SYNC_FRAMES, SYNC_FRAMES * grid.cols),
      ),
    ),
  );
  return { frames, durations: evenDurations(SYNC_FRAMES, SYNC_MS) };
}

function middleLine(grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, () => middleRow(grid.rows));
}

/** A row of pendulums that drift apart and meet again; length 0 swings them as one, length 1 sends one wave along. */
export const generatePendulum: RecipeFn = (grid, params: RecipeParams) => {
  const fallback = grid.cols < SHORT_BELOW_COLS ? SHORT_LENGTH : DEFAULT_LENGTH;
  const length = wholeWithin(params.length, fallback, 0, MAX_LENGTH);
  if (length === 0) return syncOutput(grid);
  return length === TRAVEL_LENGTH ? travelOutput(grid) : waveOutput(grid, length);
};

/** The pendulums snap into one middle line, hold it, then settle into the check. */
export const generatePendulumSync: RecipeFn = (grid) => {
  const line = middleLine(grid);
  return joinOutputs([
    { frames: [frameFromColumnRows(grid, line)], durations: [LINE_HOLD_MS] },
    settleIntoCheck(grid, line, SETTLE_MS),
  ]);
};

function fallenRow(start: number, bottom: number, fallFrames: number): number {
  const drop = fallFrames > 0 ? (fallFrames * (fallFrames + 1)) / 2 : 0;
  return Math.min(bottom, start + drop);
}

function framesToLand(start: number, bottom: number): number {
  const needed = Array.from({ length: bottom - start + 1 }, (_, k) => k).find(
    (k) => fallenRow(start, bottom, k) === bottom,
  );
  return needed ?? 0;
}

/** The pendulums fall from the middle line to the bottom row one column after another, then hold. */
export const generatePendulumDrop: RecipeFn = (grid) => {
  const start = middleRow(grid.rows);
  const bottom = grid.rows - 1;
  const count = grid.cols + framesToLand(start, bottom);
  const frames = Array.from({ length: count }, (_, frame) =>
    frameFromColumnRows(
      grid,
      Array.from({ length: grid.cols }, (__, x) => fallenRow(start, bottom, frame - x)),
    ),
  );
  return withLastDuration({ frames, durations: evenDurations(count, DROP_MS) }, RESULT_HOLD_MS);
};
