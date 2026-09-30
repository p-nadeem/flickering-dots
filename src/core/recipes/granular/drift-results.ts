import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import { mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { DRIFT_TICK_MS, getFlakeConfig } from './drift';
import { getFallTicks, getSpawns } from './drift-flakes';
import { getDriftProfile } from './drift-profile';
import { simulateDrift } from './drift-sim';
import type { DriftState } from './drift-sim';
import { range, shotsToOutput } from './shared';

const SETTLE_START_PROGRESS = 0.35;
const SETTLE_EVERY_TICKS = 2;
const SETTLE_HOLD_MS = 900;
const BLIZZARD_TICKS = 25;
const BLIZZARD_TICK_MS = 60;
const BLIZZARD_SHARE = 0.08;
const BLIZZARD_SEED_OFFSET = 101;
const EMPTY_HOLD_MS = 400;

function holdLast(output: RecipeOutput, ms: number): RecipeOutput {
  const merged = mergeRepeatedFrames(output);
  const last = merged.durations.length - 1;
  return {
    ...merged,
    durations: merged.durations.map((duration, index) => (index === last ? ms : duration)),
  };
}

/** Snowing stops: the flakes in the air land and the drift levels into one solid bottom row that holds. */
export function generateDriftSettle(grid: GridSize, params: RecipeParams): RecipeOutput {
  const config = getFlakeConfig(grid, params);
  const fall = getFallTicks(grid, config);
  const ticks = Math.max(fall, SETTLE_EVERY_TICKS * grid.rows) + 1;
  const run = simulateDrift<DriftState>({
    grid,
    config,
    spawns: getSpawns(grid, config, -1, 0),
    ticks,
    ageAt: (spawn, tick) => tick - spawn.start,
    initial: { heights: getDriftProfile(grid, config.seed, SETTLE_START_PROGRESS) },
    advance: (state, _, tick) =>
      tick % SETTLE_EVERY_TICKS === 0
        ? state
        : { heights: state.heights.map((height) => height + Math.sign(1 - height)) },
  });
  const shots = run.map(({ points }) => ({ points, ms: DRIFT_TICK_MS }));
  return holdLast(shotsToOutput(grid, shots), SETTLE_HOLD_MS);
}

interface Streak {
  x: number;
  y: number;
}

function getStreaks(grid: GridSize, seed: number): Streak[] {
  const random = createRng(seed + BLIZZARD_SEED_OFFSET);
  const count = Math.max(1, Math.floor(grid.cols * grid.rows * BLIZZARD_SHARE));
  return range(0, count).map((index) => ({
    x: Math.floor(random() * grid.cols),
    y: Math.floor((index * grid.rows) / count),
  }));
}

function streakCell(grid: GridSize, streak: Streak, tick: number, stopTick: number): Point[] {
  const depth = streak.y + tick;
  const lap = Math.floor(depth / grid.rows);
  const lapStart = lap * grid.rows - streak.y;
  if (tick < 0 || (lap > 0 && lapStart >= stopTick)) return [];
  return [[(streak.x + tick) % grid.cols, depth % grid.rows]];
}

/** Fast diagonal two-dot flakes blow through and nothing settles, then the grid empties. */
export function generateDriftBlizzard(grid: GridSize, params: RecipeParams): RecipeOutput {
  const streaks = getStreaks(grid, getFlakeConfig(grid, params).seed);
  const stopTick = Math.max(0, BLIZZARD_TICKS - grid.rows);
  const shots = range(0, stopTick + grid.rows + 2).map((tick) => ({
    points: streaks.flatMap((streak) => [
      ...streakCell(grid, streak, tick, stopTick),
      ...streakCell(grid, streak, tick - 1, stopTick),
    ]),
    ms: BLIZZARD_TICK_MS,
  }));
  return holdLast(shotsToOutput(grid, shots), EMPTY_HOLD_MS);
}
