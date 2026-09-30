import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { digitsLayout, numberSegments, parseNumbers } from './segments-layout';
import type { DigitsLayout } from './segments-layout';
import { morphPlace } from './segments-morph';
import { range } from './shared';

const STEP_MS = 60;
const MORPH_STEPS = 4;
const SPIN_MS = 400;
const COUNT_MS = 1000;
const REST_MS = 1000;
const SPIN_GLYPH = '0-9';
const FULL_DENSITY = 1;

/** A counter: where its digits sit, how many places it shows and how sparsely it draws them. */
export interface Counter {
  grid: GridSize;
  layout: DigitsLayout;
  places: number;
  stride: number;
}

/** Reads a segments glyph as numbers, fitting their digit cells to the grid. */
export function readCounter(grid: GridSize, params: RecipeParams, fallback: string): [Counter, number[]] {
  const numbers = parseNumbers(params.glyph ?? fallback);
  const places = Math.max(...numbers.map((value) => String(value).length));
  const density = Math.min(FULL_DENSITY, params.density ?? FULL_DENSITY);
  const stride = Math.max(1, Math.round(FULL_DENSITY / density));
  return [{ grid, layout: digitsLayout(grid, places), places, stride }, numbers];
}

function isDrawn(stride: number, [x, y]: Point): boolean {
  return (x + y) % stride === 0;
}

/** Draws the counter `fraction` of the way from `from` to `to`; a fraction of 0 is `from` itself. */
export function counterFrame(counter: Counter, from: number, to: number, fraction: number): Frame {
  const { grid, layout, places, stride } = counter;
  const before = numberSegments(from, places);
  const after = numberSegments(to, places);
  const points = layout.origins.flatMap(([left, top], place) =>
    morphPlace(layout.cell, before[place], after[place], fraction)
      .filter((point) => isDrawn(stride, point))
      .map(([x, y]): Point => [left + x, top + y]),
  );
  return createFrameFromPoints(grid, points);
}

function periodFor(numbers: readonly number[]): number {
  return numbers[numbers.length - 1] < numbers[0] ? COUNT_MS : SPIN_MS;
}

function digitSpan(counter: Counter, from: number, to: number, periodMs: number): RecipeOutput {
  const changing = range(1, MORPH_STEPS).map((step) => counterFrame(counter, from, to, step / MORPH_STEPS));
  return {
    frames: [counterFrame(counter, from, from, 0), ...changing],
    durations: [periodMs - changing.length * STEP_MS, ...changing.map(() => STEP_MS)],
  };
}

/** Seven-segment digits: one number stands still; a range such as 0-9 or 5-1 loops, each change growing and shrinking segments in 4 frames of 60 ms. */
export function generateSegments(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const [counter, numbers] = readCounter(grid, params, SPIN_GLYPH);
  if (numbers.length === 1) {
    return { frames: [counterFrame(counter, numbers[0], numbers[0], 0)], durations: [REST_MS] };
  }
  const periodMs = periodFor(numbers);
  const spans = numbers.map((value, index) =>
    digitSpan(counter, value, numbers[(index + 1) % numbers.length], periodMs),
  );
  const merged = mergeRepeatedFrames({
    frames: spans.flatMap((span) => span.frames),
    durations: spans.flatMap((span) => span.durations),
  });
  return { ...merged, still: 0 };
}
