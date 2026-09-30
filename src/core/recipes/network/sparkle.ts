import { glyphMask } from '../../glyphs';
import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import { centredStart } from '../cross';
import type { Point, RecipeOutput } from '../helpers';
import { placeStars } from './constellation-layout';
import { clampCount, mergedOutput, pickIndex, shot, withoutPoints } from './shots';
import type { NetworkOptions } from './network-options';

const TICK_MS = 100;
const LOOP_TICKS = 60;
const TWINKLES_PER_STAR = 4;
const TWINKLE_SWING = 5;
const DEFAULT_STARS = 3;
const MIN_STARS = 1;
const MAX_STARS = 8;
const GLYPH_MIN_SIZE = 3;
const GROW_MS = 90;
const FULL_HOLD_MS = 700;
const SHRINK_MS = 90;
const DARK_MS = 400;
const SIZE_STEP = 2;

function twinkleGaps(rng: () => number): number[] {
  const even = LOOP_TICKS / TWINKLES_PER_STAR;
  const swings = [0, 1].map(() => pickIndex(rng, 2 * TWINKLE_SWING + 1) - TWINKLE_SWING);
  return swings.flatMap((swing) => [even + swing, even - swing]);
}

function ticksFrom(phase: number, gaps: readonly number[]): number[] {
  return gaps.map(
    (_, index) => (phase + gaps.slice(0, index).reduce((sum, gap) => sum + gap, 0)) % LOOP_TICKS,
  );
}

function freePhase(start: number, gaps: readonly number[], taken: readonly number[]): number {
  const offsets = Array.from({ length: LOOP_TICKS }, (_, offset) => (start + offset) % LOOP_TICKS);
  return offsets.find((phase) => ticksFrom(phase, gaps).every((tick) => !taken.includes(tick))) ?? start;
}

function twinkleSchedules(count: number, rng: () => number): number[][] {
  return Array.from({ length: count }).reduce<number[][]>((schedules) => {
    const start = pickIndex(rng, LOOP_TICKS);
    const gaps = twinkleGaps(rng);
    return [...schedules, ticksFrom(freePhase(start, gaps, schedules.flat()), gaps)];
  }, []);
}

/** A few stars twinkling, each dark for one 100 ms frame every 1 to 2 s, on a seamless 6 s loop. */
export function generateStars(grid: GridSize, { seed, length }: NetworkOptions): RecipeOutput {
  const rng = createRng(seed);
  const stars = placeStars(grid, clampCount(length, DEFAULT_STARS, MIN_STARS, MAX_STARS), rng);
  const schedules = twinkleSchedules(stars.length, rng);
  const shots = Array.from({ length: LOOP_TICKS }, (_, tick) => {
    const dark = stars.filter((_, index) => schedules[index].includes(tick));
    return shot(withoutPoints(stars, dark), TICK_MS);
  });
  return mergedOutput(grid, shots);
}

function fullSquareSize({ cols, rows }: GridSize): number {
  const shortSide = Math.min(cols, rows);
  const isCentred = (cols - shortSide) % 2 === 0 && (rows - shortSide) % 2 === 0;
  return shortSide % 2 === 1 || isCentred ? shortSide : shortSide - 1;
}

function squareCells(size: number): Point[] {
  return Array.from({ length: size * size }, (_, index): Point => [index % size, Math.floor(index / size)]);
}

function sparkleCells(size: number): Point[] {
  if (size < GLYPH_MIN_SIZE) return squareCells(size);
  const mask = glyphMask('sparkle', { cols: size, rows: size });
  return squareCells(size).filter(([x, y]) => mask[y * size + x] === 1);
}

function sparklePoints(grid: GridSize, size: number): Point[] {
  const left = centredStart(grid.cols, size);
  const top = centredStart(grid.rows, size);
  return sparkleCells(size).map(([x, y]): Point => [left + x, top + y]);
}

/** One four-point sparkle growing from the centre to the grid edges, holding, then shrinking away. */
export function generateSparkleGrow(grid: GridSize): RecipeOutput {
  const full = fullSquareSize(grid);
  const smallest = SIZE_STEP - (full % SIZE_STEP);
  const sizes = Array.from(
    { length: (full - smallest) / SIZE_STEP + 1 },
    (_, index) => smallest + SIZE_STEP * index,
  );
  const grow = sizes.map((size) => shot(sparklePoints(grid, size), size === full ? FULL_HOLD_MS : GROW_MS));
  const shrink = sizes
    .slice(0, -1)
    .reverse()
    .map((size) => shot(sparklePoints(grid, size), SHRINK_MS));
  return mergedOutput(grid, [...grow, ...shrink, shot([], DARK_MS)]);
}
