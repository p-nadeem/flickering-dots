import type { RecipeFn, RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { toFrameText } from '../frame-text';

const GRID_MAX = 16;
const GRID_MIN = 3;
const WINDOW_MS = 1000;
const STEP_SHARE = 0.2;

export const MAX_LIT_STEPS_PER_SECOND = 6;

export interface VariantCase {
  variant: string;
  params: RecipeParams;
  smallest: GridSize;
  isLoop: boolean;
}

function sidesFrom(min: number): number[] {
  return Array.from({ length: GRID_MAX - min + 1 }, (_, index) => min + index);
}

export function gridsFrom(smallest: GridSize): GridSize[] {
  return sidesFrom(smallest.cols).flatMap((cols) => sidesFrom(smallest.rows).map((rows) => ({ cols, rows })));
}

export const EVERY_GRID: readonly GridSize[] = gridsFrom({ cols: GRID_MIN, rows: GRID_MIN });

export function label({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

function countLit(frame: Frame): number {
  return frame.reduce<number>((total, bit) => total + bit, 0);
}

export function countChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
}

function stepTimes({ frames, durations }: RecipeOutput, isLoop: boolean): number[] {
  const cells = frames[0].length;
  const starts = startTimes(durations);
  const pairs = frames.map((frame, index) => [index, frames[(index + 1) % frames.length], frame] as const);
  const counted = isLoop ? pairs : pairs.slice(0, -1);
  return counted.flatMap(([index, next, frame]) =>
    Math.abs(countLit(next) - countLit(frame)) >= STEP_SHARE * cells
      ? [starts[index] + durations[index]]
      : [],
  );
}

export function maxLitStepsPerSecond(output: RecipeOutput, isLoop: boolean): number {
  const once = stepTimes(output, isLoop);
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const repeats = isLoop ? Math.ceil(WINDOW_MS / loopMs) + 1 : 1;
  const times = Array.from({ length: repeats }, (_, loop) => once.map((time) => time + loop * loopMs)).flat();
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

export function maxInnerChange({ frames }: RecipeOutput): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => countChanged(frames[index], frame)));
}

export function seamChange({ frames }: RecipeOutput): number {
  return countChanged(frames[frames.length - 1], frames[0]);
}

export function framesText(output: RecipeOutput, cols: number, indexes?: readonly number[]): string[] {
  const picked = indexes ?? output.frames.map((_, index) => index);
  return picked.map((index) => toFrameText(output.frames[index], cols));
}

export function lastFrame({ frames }: RecipeOutput): Frame {
  return frames[frames.length - 1];
}

export function litRowsInColumn(frame: Frame, grid: GridSize, x: number): number[] {
  return Array.from({ length: grid.rows }, (_, y) => y).filter((y) => frame[y * grid.cols + x] === 1);
}

export function runCase(recipes: Readonly<Record<string, RecipeFn>>, test: VariantCase, grid: GridSize) {
  return recipes[test.variant](grid, { ...test.params, variant: test.variant });
}

export function runLengths(durations: readonly number[]): [ms: number, count: number][] {
  return durations.reduce<[number, number][]>((runs, ms) => {
    const last = runs[runs.length - 1];
    return last !== undefined && last[0] === ms
      ? [...runs.slice(0, -1), [ms, last[1] + 1]]
      : [...runs, [ms, 1]];
  }, []);
}

export interface FramePin {
  variant: string;
  params: RecipeParams;
  grid: GridSize;
  count: number;
  indexes?: readonly number[];
  frames: readonly string[];
  durations: readonly (readonly [number, number])[];
}

export function pinName({ variant, params, grid }: FramePin): string {
  return `${variant} ${JSON.stringify(params)} at ${label(grid)}`;
}

export function renderPin(recipes: Readonly<Record<string, RecipeFn>>, pin: FramePin) {
  const output = recipes[pin.variant](pin.grid, { ...pin.params, variant: pin.variant });
  return {
    count: output.frames.length,
    frames: framesText(output, pin.grid.cols, pin.indexes),
    durations: runLengths(output.durations),
  };
}
