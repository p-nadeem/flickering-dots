import type { Frame, GridSize, RecipeParams } from '../../types';
import { generateCheck } from '../check';
import { createFrameFromPoints } from '../helpers';
import type { Point, RecipeFn, RecipeOutput } from '../helpers';
import { limitCellFlashes } from './cell-flashes-b';
import type { ArcadeStep } from './shared';
import { defineVariant } from './shared';

/** Keeps `value` within `min..max`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Alternates `off` and `on` steps `times` times, each for `ms`, ending on `on`. */
export function blinkSteps(
  on: readonly Point[],
  off: readonly Point[],
  ms: number,
  times: number,
): ArcadeStep[] {
  return Array.from({ length: times }, (): ArcadeStep[] => [
    { points: off, ms },
    { points: on, ms },
  ]).flat();
}

/** Gives the last step `ms`, for the hold a result state ends on. */
export function holdLast(steps: readonly ArcadeStep[], ms: number): ArcadeStep[] {
  return steps.map((step, index) => (index === steps.length - 1 ? { ...step, ms } : step));
}

/** The lit cells of a frame, for replaying another recipe's frame as a step. */
export function framePoints(frame: Frame, cols: number): Point[] {
  return frame.flatMap((bit, index): Point[] =>
    bit === 1 ? [[index % cols, Math.floor(index / cols)]] : [],
  );
}

/** States from `first`, each made by `next` from the one before, until `isDone` holds or `limit` states exist. */
export function iterateUntil<T>(
  first: T,
  next: (state: T) => T,
  isDone: (state: T) => boolean,
  limit: number,
): T[] {
  return Array.from({ length: Math.max(0, limit - 1) }).reduce<T[]>(
    (states) => {
      const last = states[states.length - 1];
      return isDone(last) ? states : [...states, next(last)];
    },
    [first],
  );
}

/** The shared check drawn stroke by stroke and held, as steps. */
export function checkSteps(grid: GridSize): ArcadeStep[] {
  const { frames, durations } = generateCheck(grid);
  return frames.map((frame, index) => ({ points: framePoints(frame, grid.cols), ms: durations[index] }));
}

/** Draws each step as a frame. */
export function stepsOutput(grid: GridSize, steps: readonly ArcadeStep[]): RecipeOutput {
  return {
    frames: steps.map((step) => createFrameFromPoints(grid, step.points)),
    durations: steps.map((step) => step.ms),
  };
}

/** A drawing that reads the params, and whether its clip loops. */
export interface VariantDrawing {
  min: GridSize;
  draw: (grid: GridSize, params: RecipeParams) => RecipeOutput;
  isLoop: (params: RecipeParams) => boolean;
}

/** Wraps a drawing like `defineVariant`, then keeps every cell to at most 3 flashes a second. */
export function defineVariantB(variant: string, { min, draw, isLoop }: VariantDrawing): RecipeFn {
  return (grid, params) => {
    const recipe = defineVariant(variant, min, (checked) => draw(checked, params), isLoop(params));
    return limitCellFlashes(recipe(grid, params));
  };
}
