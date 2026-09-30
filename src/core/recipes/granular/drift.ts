import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { getFallTicks, getFlakeCount, getSpawns } from './drift-flakes';
import type { FlakeConfig } from './drift-flakes';
import { simulateDrift } from './drift-sim';
import type { DriftRun, DriftState, DriftTick } from './drift-sim';
import { shotsToOutput } from './shared';

/** Milliseconds per drift tick. */
export const DRIFT_TICK_MS = 70;
/** Seed used when none is given. */
export const DRIFT_DEFAULT_SEED = 11;

const TICKS_PER_ROW = 2;
const IDLE_TICKS_PER_ROW = 3;
const IDLE_DENSITY_BELOW = 0.5;
const IDLE_LAPS = 3;
const MELT_AVERAGE_RATIO = 0.4;
const MELT_EVERY_TICKS = 6;
const SLUMP_DIFFERENCE = 2;
const MAX_LAPS = 64;

type Mode = 'grow' | 'melt' | 'rest';

interface GrowState extends DriftState {
  mode: Mode;
  meltedAt: number;
}

/** Flake settings for a grid and params; low densities fall slower. */
export function getFlakeConfig(grid: GridSize, params: RecipeParams): FlakeConfig {
  const density = params.density ?? 1;
  return {
    count: getFlakeCount(grid.cols, density),
    ticksPerRow: density < IDLE_DENSITY_BELOW ? IDLE_TICKS_PER_ROW : TICKS_PER_ROW,
    seed: params.seed ?? DRIFT_DEFAULT_SEED,
  };
}

/** Evens each neighbouring pair that differs by two or more by moving one unit, left to right; returns a new array. */
export function slump(heights: readonly number[]): number[] {
  return heights.slice(1).reduce<number[]>(
    (current, _, index) => {
      const gap = current[index] - current[index + 1];
      if (Math.abs(gap) < SLUMP_DIFFERENCE) return current;
      const from = gap > 0 ? index : index + 1;
      const to = gap > 0 ? index + 1 : index;
      return current.map((height, at) => (at === from ? height - 1 : at === to ? height + 1 : height));
    },
    [...heights],
  );
}

function growAdvance(grid: GridSize) {
  const meltAverage = MELT_AVERAGE_RATIO * grid.rows;
  return (state: GrowState, landings: readonly number[], tick: number): GrowState => {
    if (state.mode === 'rest') return state;
    if (state.mode === 'melt') {
      if ((tick - state.meltedAt) % MELT_EVERY_TICKS !== 0) return state;
      const heights = state.heights.map((height) => Math.max(0, height - 1));
      return { ...state, heights, mode: heights.every((height) => height === 0) ? 'rest' : 'melt' };
    }
    const landed = state.heights.map((height, x) =>
      Math.min(grid.rows - 1, height + landings.filter((column) => column === x).length),
    );
    const heights = slump(landed);
    const average = heights.reduce((total, height) => total + height, 0) / grid.cols;
    return average >= meltAverage ? { heights, mode: 'melt', meltedAt: tick } : { ...state, heights };
  };
}

function loopRun(grid: GridSize, config: FlakeConfig, laps: number, isIdle: boolean): DriftRun<GrowState> {
  const fall = getFallTicks(grid, config);
  const ticks = laps * fall;
  const advance = growAdvance(grid);
  return {
    grid,
    config,
    spawns: getSpawns(grid, config, 0, laps),
    ticks,
    ageAt: (spawn, tick) => (((tick - spawn.start) % ticks) + ticks) % ticks,
    initial: {
      heights: Array.from({ length: grid.cols }, () => 0),
      mode: isIdle ? 'rest' : 'grow',
      meltedAt: 0,
    },
    advance: isIdle ? (state) => state : advance,
  };
}

function findLoop(grid: GridSize, config: FlakeConfig, laps: number): DriftTick<GrowState>[] {
  if (laps > MAX_LAPS)
    throw new Error(`flickering-dots granular: the drift never melts on ${grid.cols}x${grid.rows}`);
  const ticks = simulateDrift(loopRun(grid, config, laps, false));
  return ticks[ticks.length - 1].state.mode === 'rest' ? ticks : findLoop(grid, config, laps + 1);
}

/** Flakes sway down and pile into a lumpy drift that slumps, grows to 40 percent and melts; below density 0.5 only a few slow flakes fall. */
export function generateDrift(grid: GridSize, params: RecipeParams): RecipeOutput {
  const config = getFlakeConfig(grid, params);
  const isIdle = (params.density ?? 1) < IDLE_DENSITY_BELOW;
  const ticks = isIdle ? simulateDrift(loopRun(grid, config, IDLE_LAPS, true)) : findLoop(grid, config, 1);
  const shots = ticks.map(({ points }) => ({ points, ms: DRIFT_TICK_MS }));
  const peak = ticks.findIndex(({ state }) => state.mode === 'melt');
  return shotsToOutput(grid, shots, peak < 0 ? undefined : peak);
}
