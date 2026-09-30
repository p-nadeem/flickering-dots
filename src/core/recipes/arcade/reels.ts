import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { stepsOutput } from './kit-b';
import {
  REEL_SYMBOLS,
  REEL_TICK_MS,
  REEL_TICKS_PER_ROW,
  REELS,
  STOP_TICKS,
  STRIP_ROWS,
  isAligned,
  landedPoints,
  offsetOf,
  reelsPoints,
  stepsTaken,
  stoppingOffset,
} from './reels-strip';

const REST_MS = 1800;
const NUDGE_MS = 200;
const PAUSE_MS = 600;
const PHASE_ROWS = 4;
const STAGGER_TICKS = 7;
const SPIN_ROWS_TO_STOP = STRIP_ROWS - 2;
const MIDDLE_REEL = 1;
const DEFAULT_SEED = 1;

function reelIndexes(): number[] {
  return Array.from({ length: REELS }, (_, reel) => reel);
}

function spinOffsets(tick: number): number[] {
  return reelIndexes().map((reel) => reel * PHASE_ROWS - stepsTaken(reel, tick));
}

/** All three reels spinning one row per 120 ms, taking turns so one reel moves every 40 ms; the still is a tick where all three show whole symbols. */
export function generateReels(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const ticks = Array.from({ length: STRIP_ROWS * REEL_TICKS_PER_ROW }, (_, tick) => tick);
  const steps = ticks.map((tick) => ({ points: reelsPoints(grid, spinOffsets(tick)), ms: REEL_TICK_MS }));
  const aligned = ticks.find((tick) => isAligned(spinOffsets(tick)));
  return { ...stepsOutput(grid, steps), ...(aligned === undefined ? {} : { still: aligned }) };
}

/** Three bars at rest, with the middle reel nudging one row every 2 s. */
export function generateReelsRest(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const bars = reelIndexes().map(() => offsetOf('bar'));
  const nudge = reelIndexes().map((reel) => (reel === MIDDLE_REEL ? 1 : 0));
  return {
    ...stepsOutput(grid, [
      { points: landedPoints(grid, bars, []), ms: REST_MS },
      { points: landedPoints(grid, bars, nudge), ms: NUDGE_MS },
    ]),
    still: 0,
  };
}

function restingOffsets(seed: number): number[] {
  const count = REEL_SYMBOLS.length;
  return reelIndexes().map((reel) => offsetOf(REEL_SYMBOLS[(((seed + reel) % count) + count) % count]));
}

function staggerOffset(target: number, reel: number, tick: number): number {
  const start = reel * STAGGER_TICKS;
  if (tick <= start) return target;
  return stoppingOffset(target, tick - start - SPIN_ROWS_TO_STOP * REEL_TICKS_PER_ROW);
}

/** The reels start one by one, spin, and stop one by one on seeded symbols, then pause. */
export function generateReelsStagger(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const targets = restingOffsets(params.seed ?? DEFAULT_SEED);
  const lastTick = (REELS - 1) * STAGGER_TICKS + SPIN_ROWS_TO_STOP * REEL_TICKS_PER_ROW + STOP_TICKS;
  const moving = Array.from({ length: lastTick - 1 }, (_, index) => ({
    points: reelsPoints(
      grid,
      targets.map((target, reel) => staggerOffset(target, reel, index + 1)),
    ),
    ms: REEL_TICK_MS,
  }));
  return {
    ...stepsOutput(grid, [{ points: reelsPoints(grid, targets), ms: PAUSE_MS }, ...moving]),
    still: 0,
  };
}
