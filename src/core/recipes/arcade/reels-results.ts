import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import type { ArcadeStep } from './shared';
import { blinkSteps, holdLast, stepsOutput } from './kit-b';
import {
  REEL_SYMBOLS,
  REEL_TICK_MS,
  REELS,
  STOP_TICKS,
  landedPoints,
  offsetOf,
  reelsPoints,
  stoppingOffset,
} from './reels-strip';

const SPIN_TICKS = 12;
const STAGGER_TICKS = 7;
const BLINK_MS = 250;
const BLINK_TIMES = 2;
const DROOP_PAUSE_MS = 500;
const HOLD_MS = 1500;
const DEFAULT_SEED = 1;
const LAST_REEL = REELS - 1;

function pickSymbol(seed: number): number {
  const count = REEL_SYMBOLS.length;
  return offsetOf(REEL_SYMBOLS[((seed % count) + count) % count]);
}

function stopSteps(grid: GridSize, targets: readonly number[]): ArcadeStep[] {
  const settleTick = SPIN_TICKS + LAST_REEL * STAGGER_TICKS + STOP_TICKS;
  return Array.from({ length: settleTick }, (_, tick) => ({
    points: reelsPoints(
      grid,
      targets.map((target, reel) => stoppingOffset(target, tick - SPIN_TICKS - reel * STAGGER_TICKS)),
    ),
    ms: REEL_TICK_MS,
  }));
}

function restPoints(grid: GridSize, offsets: readonly number[]): Point[] {
  return landedPoints(grid, offsets, []);
}

function paylinePoints(grid: GridSize): Point[] {
  return [0, grid.rows - 1].flatMap((y) => Array.from({ length: grid.cols }, (_, x): Point => [x, y]));
}

/** The reels stop left to right 300 ms apart with a one-row overshoot on three matching symbols, then the payline lights twice. */
export function generateReelsWin(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const targets = Array.from({ length: REELS }, () => pickSymbol(params.seed ?? DEFAULT_SEED));
  const settled = restPoints(grid, targets);
  const blinks = blinkSteps(settled, [...settled, ...paylinePoints(grid)], BLINK_MS, BLINK_TIMES);
  return stepsOutput(grid, [
    ...stopSteps(grid, targets),
    { points: settled, ms: BLINK_MS },
    ...holdLast(blinks, HOLD_MS),
  ]);
}

/** Two reels match, the third lands on another symbol, then all three droop a row and hold. */
export function generateReelsLose(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const seed = params.seed ?? DEFAULT_SEED;
  const targets = Array.from({ length: REELS }, (_, reel) =>
    pickSymbol(reel === LAST_REEL ? seed + 2 : seed),
  );
  return stepsOutput(grid, [
    ...stopSteps(grid, targets),
    { points: restPoints(grid, targets), ms: DROOP_PAUSE_MS },
    {
      points: landedPoints(
        grid,
        targets,
        targets.map(() => 1),
      ),
      ms: HOLD_MS,
    },
  ]);
}
