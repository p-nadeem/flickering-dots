import type { GridSize } from '../../types';
import { createFrameFromPoints, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';

/** One frame of a network clip: the lit points and how long they show (ms). */
export interface Shot {
  points: readonly Point[];
  ms: number;
}

/** Builds a shot from its lit points and duration. */
export function shot(points: readonly Point[], ms: number): Shot {
  return { points, ms };
}

/** Turns shots into recipe output, with an optional still frame index. */
export function shotsToOutput(grid: GridSize, shots: readonly Shot[], still?: number): RecipeOutput {
  const frames = shots.map(({ points }) => createFrameFromPoints(grid, points));
  const durations = shots.map(({ ms }) => ms);
  return still === undefined ? { frames, durations } : { frames, durations, still };
}

/** Turns shots into recipe output, merging identical neighbouring frames. */
export function mergedOutput(grid: GridSize, shots: readonly Shot[]): RecipeOutput {
  return mergeRepeatedFrames(shotsToOutput(grid, shots));
}

function reachSteps(radius: number): number[] {
  return Array.from({ length: radius }, (_, index) => index + 1);
}

/** The centre plus arms of `radius` cells up, down, left and right. */
export function plusPoints([x, y]: Point, radius: number): Point[] {
  const arms = reachSteps(radius).flatMap((r): Point[] => [
    [x, y - r],
    [x - r, y],
    [x + r, y],
    [x, y + r],
  ]);
  return [[x, y], ...arms];
}

/** The centre plus diagonal arms of `radius` cells. */
export function diagonalPoints([x, y]: Point, radius: number): Point[] {
  const arms = reachSteps(radius).flatMap((r): Point[] => [
    [x - r, y - r],
    [x + r, y - r],
    [x - r, y + r],
    [x + r, y + r],
  ]);
  return [[x, y], ...arms];
}

/** True when two points are the same cell. */
export function isSamePoint(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Returns `points` without any cell listed in `removed`. */
export function withoutPoints(points: readonly Point[], removed: readonly Point[]): Point[] {
  return points.filter((point) => !removed.some((other) => isSamePoint(point, other)));
}

/** Shots of `points` dropping one row per shot until all have left the bottom edge. */
export function fallShots(
  points: readonly Point[],
  base: readonly Point[],
  rows: number,
  ms: number,
): Shot[] {
  const top = Math.min(rows, ...points.map(([, y]) => y));
  return Array.from({ length: rows - top }, (_, index) =>
    shot([...base, ...points.map(([x, y]): Point => [x, y + index + 1])], ms),
  );
}

/** A seeded whole number from 0 to `length - 1`. */
export function pickIndex(rng: () => number, length: number): number {
  return Math.min(length - 1, Math.floor(rng() * length));
}

/** A seeded reordering of `items`; the input is left untouched. */
export function shuffled<T>(rng: () => number, items: readonly T[]): T[] {
  return items
    .map((item) => ({ item, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

/** Clamps a whole number count into `[min, max]`, using `fallback` when absent. */
export function clampCount(value: number | undefined, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value ?? fallback));
}
