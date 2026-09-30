import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { mergeLoop, mergeOnce } from './clip-merge';
import type { Shot } from './clip-merge';
import { governFlashes } from './flash-governor';
import { RESULT_HOLD_MS } from './shared';
import { drawBars, insertionSteps, oddEvenPass, shuffleValues, staircase } from './sort-bars';

const SHUFFLE_MS = 300;
const PASS_MS = 120;
const SORTED_HOLD_MS = 500;
const DIP_MS = 50;
const LOOP_END_MS = 400;
const STILL_MS = 1000;
const RESULT_START_MS = 300;
const INSERT_HOLD_MS = 600;
const SCRAMBLE_MS = 150;
const SCRAMBLES = 3;

/** Default params of the sort variants: the shuffle seed. */
export const SORT_DEFAULTS = { seed: 2 } as const satisfies RecipeParams;

function shuffledStart(grid: GridSize, params: RecipeParams): number[] {
  return shuffleValues(staircase(grid), createRng(params.seed ?? SORT_DEFAULTS.seed));
}

function passShots(grid: GridSize, start: readonly number[]): Shot[] {
  const states = Array.from({ length: grid.cols }).reduce<number[][]>(
    (done, _, pass) => [...done, oddEvenPass(done[done.length - 1], pass)],
    [[...start]],
  );
  return states.slice(1).map((values, index) => ({
    frame: drawBars(grid, values),
    ms: index === grid.cols - 1 ? SORTED_HOLD_MS : PASS_MS,
  }));
}

function sweepShots(grid: GridSize): Shot[] {
  const sorted = staircase(grid);
  return Array.from({ length: grid.cols }, (_, x) => ({ frame: drawBars(grid, sorted, x), ms: DIP_MS }));
}

/** Sort Pass thinking: a held shuffle, exactly `cols` odd-even transposition passes, a hold, a verification sweep and a hold. */
export function generateSort(grid: GridSize, params: RecipeParams): RecipeOutput {
  const start = shuffledStart(grid, params);
  const shots = [
    { frame: drawBars(grid, start), ms: SHUFFLE_MS },
    ...passShots(grid, start),
    ...sweepShots(grid),
    { frame: drawBars(grid, staircase(grid)), ms: LOOP_END_MS },
  ];
  return mergeLoop(governFlashes(shots, true));
}

/** The sorted staircase, still. */
export function generateSortDone(grid: GridSize, _params: RecipeParams): RecipeOutput {
  return { frames: [drawBars(grid, staircase(grid))], durations: [STILL_MS] };
}

/** Sort Pass success: the staircase, the verification sweep, then a hold. */
export function generateSortVerify(grid: GridSize, _params: RecipeParams): RecipeOutput {
  const sorted = drawBars(grid, staircase(grid));
  return mergeOnce([
    { frame: sorted, ms: RESULT_START_MS },
    ...sweepShots(grid),
    { frame: sorted, ms: RESULT_HOLD_MS },
  ]);
}

/** Sort Pass ranking: an insertion sort that slides one bar at a time into place, then holds. */
export function generateSortInsert(grid: GridSize, params: RecipeParams): RecipeOutput {
  const steps = insertionSteps(shuffledStart(grid, params));
  const shots = steps.map((values, index) => ({
    frame: drawBars(grid, values),
    ms: [SHUFFLE_MS, ...Array.from({ length: steps.length - 2 }, () => PASS_MS), INSERT_HOLD_MS][index],
  }));
  return mergeLoop(governFlashes(shots, true));
}

/** Sort Pass error: the staircase is rescrambled three times at 150 ms and left unsorted. */
export function generateSortBogo(grid: GridSize, params: RecipeParams): RecipeOutput {
  const random = createRng(params.seed ?? SORT_DEFAULTS.seed);
  const orders = Array.from({ length: SCRAMBLES }).reduce<number[][]>(
    (done) => [...done, shuffleValues(done[done.length - 1], random)],
    [staircase(grid)],
  );
  return mergeOnce(
    orders.map((values, index) => ({
      frame: drawBars(grid, values),
      ms: index === orders.length - 1 ? RESULT_HOLD_MS : SCRAMBLE_MS,
    })),
  );
}
