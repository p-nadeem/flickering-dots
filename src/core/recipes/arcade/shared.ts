import { framesEqual } from '../../frame';
import type { Frame, GridSize } from '../../types';
import { createFrameFromPoints, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeFn, RecipeOutput } from '../helpers';

/** A sprite as rows of `#` (lit) and `.` (off). */
export type Sprite = readonly string[];

/** One scene of an arcade clip: the lit points and how long they show, in ms. */
export interface ArcadeStep {
  points: readonly Point[];
  ms: number;
}

const LIT = '#';

/** Returns the lit cells of a sprite placed with its top-left corner at `left`, `top`. */
export function spritePoints(sprite: Sprite, left: number, top: number): Point[] {
  return sprite.flatMap((row, y) =>
    [...row].flatMap((cell, x): Point[] => (cell === LIT ? [[left + x, top + y]] : [])),
  );
}

/** Moves every point by `dx`, `dy`. */
export function shiftPoints(points: readonly Point[], dx: number, dy: number): Point[] {
  return points.map(([x, y]): Point => [x + dx, y + dy]);
}

/** Wraps every point's column around the grid width, like a maze tunnel. */
export function wrapColumns(points: readonly Point[], cols: number): Point[] {
  return points.map(([x, y]): Point => [((x % cols) + cols) % cols, y]);
}

/** A triangle wave over `0..span`: 0, 1, ... span, span - 1, ... 1, then 0 again. */
export function triangle(step: number, span: number): number {
  if (span <= 0) return 0;
  const phase = ((step % (2 * span)) + 2 * span) % (2 * span);
  return phase <= span ? phase : 2 * span - phase;
}

/** Greatest common divisor of two whole numbers. */
export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** Least common multiple of two positive whole numbers. */
export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/** Start of a span of `extent` centred in `space`, leaning up or left when the spare is odd. */
export function centreStart(space: number, extent: number): number {
  return Math.floor((space - extent) / 2);
}

/** Turns scenes into frames and durations. */
export function stepsToOutput(grid: GridSize, steps: readonly ArcadeStep[]): RecipeOutput {
  return {
    frames: steps.map(({ points }): Frame => createFrameFromPoints(grid, points)),
    durations: steps.map(({ ms }) => ms),
  };
}

/** Throws a readable `Error` when the grid is smaller than the variant can draw. */
export function assertArcadeGrid(variant: string, grid: GridSize, min: GridSize): void {
  if (grid.cols >= min.cols && grid.rows >= min.rows) return;
  throw new Error(
    `flickering-dots build: arcade variant "${variant}" needs a grid of at least ${min.cols}×${min.rows}, got ${grid.cols}×${grid.rows}`,
  );
}

const FLASH_SHARE = 0.2;
const FLASH_WINDOW_MS = 1000;
const MAX_BIG_CHANGES = 6;
const MIN_BIG_CHANGE_GAP_MS = Math.ceil(FLASH_WINDOW_MS / MAX_BIG_CHANGES);

interface Pace {
  durations: readonly number[];
  time: number;
  lastBig: number | null;
}

function cellsChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function bigChangeFlags(frames: readonly Frame[], isLoop: boolean): boolean[] {
  const threshold = FLASH_SHARE * frames[0].length;
  return frames.map((frame, index) => {
    if (index === 0) return isLoop && cellsChanged(frames[frames.length - 1], frame) >= threshold;
    return cellsChanged(frames[index - 1], frame) >= threshold;
  });
}

function paceFrame(pace: Pace, isBig: boolean, index: number): Pace {
  const count = pace.durations.length;
  const gap = pace.lastBig === null ? Infinity : pace.time - pace.lastBig;
  const extra = isBig && gap < MIN_BIG_CHANGE_GAP_MS ? MIN_BIG_CHANGE_GAP_MS - gap : 0;
  const previous = (index - 1 + count) % count;
  const durations =
    extra > 0 ? pace.durations.map((ms, at) => (at === previous ? ms + extra : ms)) : pace.durations;
  const start = pace.time + extra;
  return { durations, time: start + durations[index], lastBig: isBig ? start : pace.lastBig };
}

/** Lengthens frames so changes of 20 percent of the grid come at least 167 ms apart: at most 6 a second (WCAG 2.3.1). */
export function limitFlashes(output: RecipeOutput, isLoop: boolean): RecipeOutput {
  const flags = bigChangeFlags(output.frames, isLoop);
  const passes = isLoop ? 2 : 1;
  const timeline = Array.from({ length: passes }, () =>
    flags.map((isBig, index) => ({ isBig, index })),
  ).flat();
  const paced = timeline.reduce<Pace>((pace, { isBig, index }) => paceFrame(pace, isBig, index), {
    durations: output.durations,
    time: 0,
    lastBig: null,
  });
  return { ...output, durations: [...paced.durations] };
}

function mergedIndex(frames: readonly Frame[], index: number): number {
  return frames.slice(1, index + 1).filter((frame, at) => !framesEqual(frame, frames[at])).length;
}

/** Merges repeated neighbouring frames, moving a named still to the frame it merged into. */
export function mergeKeepingStill(output: RecipeOutput): RecipeOutput {
  const merged = mergeRepeatedFrames(output);
  if (output.still === undefined) return merged;
  return { ...merged, still: mergedIndex(output.frames, output.still) };
}

/** Wraps a drawing as a recipe that checks the grid, merges repeated frames and keeps the flash limit. */
export function defineVariant(
  variant: string,
  min: GridSize,
  draw: (grid: GridSize) => RecipeOutput,
  isLoop: boolean,
): RecipeFn {
  return (grid: GridSize) => {
    assertArcadeGrid(variant, grid, min);
    return limitFlashes(mergeKeepingStill(draw(grid)), isLoop);
  };
}
