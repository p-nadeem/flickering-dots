import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';

const KEY_STRIDE = 7919;
const DRAW_STRIDE = 104729;

/** One frame of a particle scene: the continuous positions it lights and how long it shows. */
export interface Step {
  points: readonly Point[];
  ms: number;
}

/** Builds one particle variant from the grid, the params and the resolved seed. */
export type ParticlesBuilder = (grid: GridSize, params: RecipeParams, seed: number) => RecipeOutput;

/** Rounds a continuous position to its cell. */
export function toCell([x, y]: Point): Point {
  return [Math.round(x), Math.round(y)];
}

/** Turns steps into frames, merging identical neighbours into one longer frame. */
export function stepsToOutput(grid: GridSize, steps: readonly Step[]): RecipeOutput {
  return mergeRepeatedFrames({
    frames: steps.map(({ points }) => createFrameFromPoints(grid, points.map(toCell))),
    durations: steps.map(({ ms }) => ms),
  });
}

/** Plays outputs one after another. */
export function joinOutputs(outputs: readonly RecipeOutput[]): RecipeOutput {
  return {
    frames: outputs.flatMap(({ frames }) => frames),
    durations: outputs.flatMap(({ durations }) => durations),
  };
}

/** The column particle scenes grow from: the middle, or right of the middle on even widths. */
export function getMiddleColumn({ cols }: GridSize): number {
  return Math.floor(cols / 2);
}

/** Every cell of row `y` from `from` to `to`, both included. */
export function getRowPoints(y: number, from: number, to: number): Point[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index): Point => [from + index, y]);
}

/** A seeded random value in [0, 1) that depends only on `seed`, `key` and `draw`, so emission `key` always looks the same. */
export function keyedRandom(seed: number, key: number, draw: number): number {
  return createRng(Math.imul(seed | 0, KEY_STRIDE) + key * DRAW_STRIDE + draw)();
}
