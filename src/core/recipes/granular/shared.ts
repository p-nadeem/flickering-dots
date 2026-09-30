import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import { createFrameFromPoints, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';

/** One picture of a granular clip: its lit cells and how long it shows. */
export interface Shot {
  points: readonly Point[];
  ms: number;
}

const PROGRESS_STEP_MIN = 0.1;
const PROGRESS_STEP_SPREAD = 0.2;
const EASE_HALF = 0.5;

/** Turns shots into recipe output, merging repeated pictures into one longer frame. */
export function shotsToOutput(grid: GridSize, shots: readonly Shot[], still?: number): RecipeOutput {
  const output = {
    frames: shots.map(({ points }) => createFrameFromPoints(grid, points)),
    durations: shots.map(({ ms }) => ms),
  };
  return still === undefined ? output : { ...output, still };
}

/** Like `shotsToOutput`, then merges runs of identical frames. */
export function mergedShotsToOutput(grid: GridSize, shots: readonly Shot[]): RecipeOutput {
  return mergeRepeatedFrames(shotsToOutput(grid, shots));
}

function appendMarks(random: () => number, marks: readonly number[]): number[] {
  const last = marks.length === 0 ? 0 : marks[marks.length - 1];
  if (last >= 1) return [...marks];
  const next = Math.min(1, last + PROGRESS_STEP_MIN + random() * PROGRESS_STEP_SPREAD);
  return appendMarks(random, [...marks, next]);
}

/** Seeded progress marks that rise from above 0 to exactly 1 in uneven steps. */
export function getProgressMarks(seed: number): number[] {
  return appendMarks(createRng(seed), []);
}

/** Eases a value in `[0, 1]` in and out. */
export function easeInOut(t: number): number {
  return t < EASE_HALF ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Whole numbers from `start` up to but not including `end`. */
export function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
}
