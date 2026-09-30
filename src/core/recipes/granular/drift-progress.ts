import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { DRIFT_TICK_MS, getFlakeConfig } from './drift';
import { getFallTicks, getSpawns } from './drift-flakes';
import { getDriftProfile, stepToward } from './drift-profile';
import { simulateDrift } from './drift-sim';
import type { DriftState } from './drift-sim';
import { getProgressMarks, range, shotsToOutput } from './shared';

const HOLD_TICKS = 7;
const FULL_HOLD_TICKS = 9;
const MELT_EVERY_TICKS = 2;

type Heights = readonly number[];

function isSame(a: Heights, b: Heights): boolean {
  return a.every((height, x) => height === b[x]);
}

function growTo(timeline: readonly Heights[], target: Heights): Heights[] {
  const last = timeline[timeline.length - 1];
  if (isSame(last, target)) return [...timeline];
  return growTo([...timeline, stepToward(last, target, timeline.length)], target);
}

function holdFor(timeline: readonly Heights[], ticks: number): Heights[] {
  const last = timeline[timeline.length - 1];
  return [...timeline, ...range(0, ticks).map(() => last)];
}

function meltAway(timeline: readonly Heights[]): Heights[] {
  const last = timeline[timeline.length - 1];
  if (last.every((height) => height === 0)) return [...timeline];
  const lowered = last.map((height) => Math.max(0, height - 1));
  return meltAway([...holdFor(timeline, MELT_EVERY_TICKS - 1), lowered]);
}

function getTimeline(grid: GridSize, seed: number): Heights[] {
  const empty = Array.from({ length: grid.cols }, () => 0);
  const grown = getProgressMarks(seed).reduce<Heights[]>(
    (timeline, mark) => holdFor(growTo(timeline, getDriftProfile(grid, seed, mark)), HOLD_TICKS),
    holdFor([empty], HOLD_TICKS - 1),
  );
  return meltAway(holdFor(grown, FULL_HOLD_TICKS));
}

/** The drift rises with seeded progress updates while flakes keep falling, holds full, then melts away. */
export function generateDriftProgress(grid: GridSize, params: RecipeParams): RecipeOutput {
  const config = getFlakeConfig(grid, params);
  const fall = getFallTicks(grid, config);
  const heights = getTimeline(grid, config.seed);
  const laps = Math.ceil(heights.length / fall);
  const ticks = laps * fall;
  const zeros = heights[heights.length - 1];
  const at = (tick: number): Heights => heights[tick] ?? zeros;
  const run = simulateDrift<DriftState>({
    grid,
    config,
    spawns: getSpawns(grid, config, 0, laps),
    ticks,
    ageAt: (spawn, tick) => (((tick - spawn.start) % ticks) + ticks) % ticks,
    initial: { heights: zeros },
    advance: (_, __, tick) => ({ heights: at(tick) }),
  });
  return shotsToOutput(
    grid,
    run.map(({ points }) => ({ points, ms: DRIFT_TICK_MS })),
  );
}
