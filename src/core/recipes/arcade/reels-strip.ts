import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import type { Sprite } from './shared';
import { centreStart, spritePoints } from './shared';

const SYMBOL_SIZE = 3;
const REEL_PITCH = 4;
const REEL_COUNT = 3;
const TICK_MS = 40;
const TICKS_PER_ROW = 3;
const DECEL_TICKS = [4, 5, 6, 8] as const;

/** Symbols on each reel strip, top to bottom, ordered so no dot lights more than 3 times a second. */
export const REEL_SYMBOLS = ['diamond', 'plus', 'bar', 'dot'] as const;

/** One of `REEL_SYMBOLS`. */
export type ReelSymbol = (typeof REEL_SYMBOLS)[number];

const SPRITES: Readonly<Record<ReelSymbol, Sprite>> = {
  bar: ['...', '###', '...'],
  dot: ['...', '.#.', '...'],
  diamond: ['.#.', '#.#', '.#.'],
  plus: ['.#.', '###', '.#.'],
};

/** Rows one symbol takes on the strip: the symbol plus one blank row. */
export const SYMBOL_PITCH = SYMBOL_SIZE + 1;

/** Rows in a whole strip. */
export const STRIP_ROWS = SYMBOL_PITCH * REEL_SYMBOLS.length;

/** Every reel event lands on a multiple of this many milliseconds. */
export const REEL_TICK_MS = TICK_MS;

/** Ticks between a spinning reel's row steps: 120 ms, one reel moving per tick. */
export const REEL_TICKS_PER_ROW = TICKS_PER_ROW;

/** Ticks a stop takes: two rows slowing down, the target, a one-row overshoot, then rest. */
export const STOP_TICKS = DECEL_TICKS.reduce((sum, ticks) => sum + ticks, 0);

/** Number of reels. */
export const REELS = REEL_COUNT;

/** The strip offset that puts `symbol` on the payline. */
export function offsetOf(symbol: ReelSymbol): number {
  return REEL_SYMBOLS.indexOf(symbol) * SYMBOL_PITCH;
}

/** Where a reel stands `tick` ticks after its stop began, landing on `target`; before 0 it spins. */
export function stoppingOffset(target: number, tick: number): number {
  if (tick < 0) return target + 2 + Math.ceil(-tick / TICKS_PER_ROW);
  const rows = [target + 2, target + 1, target, target - 1];
  const ends = DECEL_TICKS.map((_, index) =>
    DECEL_TICKS.slice(0, index + 1).reduce((sum, ticks) => sum + ticks, 0),
  );
  const phase = ends.findIndex((end) => tick < end);
  return phase === -1 ? target : rows[phase];
}

function reelLeft(grid: GridSize, reel: number): number {
  return centreStart(grid.cols, REEL_PITCH * (REEL_COUNT - 1) + SYMBOL_SIZE) + reel * REEL_PITCH;
}

function stripRow(offset: number, row: number): { symbol: ReelSymbol; line: number } {
  const wrapped = (((offset + row) % STRIP_ROWS) + STRIP_ROWS) % STRIP_ROWS;
  return { symbol: REEL_SYMBOLS[Math.floor(wrapped / SYMBOL_PITCH)], line: wrapped % SYMBOL_PITCH };
}

/** The cells of one reel with strip row `offset` at the top of the payline symbol. */
export function reelPoints(grid: GridSize, reel: number, offset: number): Point[] {
  const payline = centreStart(grid.rows, SYMBOL_SIZE);
  const left = reelLeft(grid, reel);
  return Array.from({ length: grid.rows }, (_, y) => y).flatMap((y) => {
    const { symbol, line } = stripRow(offset, y - payline);
    return line < SYMBOL_SIZE ? spritePoints([SPRITES[symbol][line]], left, y) : [];
  });
}

/** The payline symbol of each reel at its resting offset, moved down by that reel's `shifts` rows, with nothing of its neighbours. */
export function landedPoints(grid: GridSize, offsets: readonly number[], shifts: readonly number[]): Point[] {
  const payline = centreStart(grid.rows, SYMBOL_SIZE);
  return offsets.flatMap((offset, reel) => {
    const { symbol } = stripRow(offset, 0);
    return spritePoints(SPRITES[symbol], reelLeft(grid, reel), payline + (shifts[reel] ?? 0));
  });
}

/** True when every reel rests with a whole symbol on the payline. */
export function isAligned(offsets: readonly number[]): boolean {
  return offsets.every((offset) => ((offset % SYMBOL_PITCH) + SYMBOL_PITCH) % SYMBOL_PITCH === 0);
}

/** The cells of all reels at their offsets. */
export function reelsPoints(grid: GridSize, offsets: readonly number[]): Point[] {
  return offsets.flatMap((offset, reel) => reelPoints(grid, reel, offset));
}

/** Rows reel `reel` has stepped by `tick` when the reels take turns, one per tick. */
export function stepsTaken(reel: number, tick: number): number {
  return Math.floor((tick - reel + TICKS_PER_ROW) / TICKS_PER_ROW);
}
