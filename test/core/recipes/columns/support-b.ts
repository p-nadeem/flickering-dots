import { expect } from 'vitest';

import type { RecipeFn, RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { countPeakFlashesPerSecond } from '../../../presets/flashes';
import { toFrameText } from '../frame-text';

const GRID_MAX = 16;
const WINDOW_MS = 1000;
const BIG_CHANGE_SHARE = 0.2;
const MAX_CELL_FLASHES_PER_SECOND = 3;

export const MAX_BIG_CHANGES_PER_SECOND = 6;

export interface CaseB {
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

export function label({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function countChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
}

function bigChangeTimes({ frames, durations }: RecipeOutput, isLoop: boolean): number[] {
  const threshold = BIG_CHANGE_SHARE * frames[0].length;
  const starts = startTimes(durations);
  const last = isLoop ? frames.length : frames.length - 1;
  return starts.slice(0, last).flatMap((start, index) => {
    const next = frames[(index + 1) % frames.length];
    return countChanged(frames[index], next) >= threshold ? [start + durations[index]] : [];
  });
}

export function maxBigChangesPerSecond(output: RecipeOutput, isLoop: boolean): number {
  const once = bigChangeTimes(output, isLoop);
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

export function litCounts({ frames }: RecipeOutput): number[] {
  return frames.map((frame) => frame.reduce<number>((total, bit) => total + bit, 0));
}

export function runCase(
  recipes: Readonly<Record<string, RecipeFn>>,
  test: CaseB,
  grid: GridSize,
): RecipeOutput {
  return recipes[test.variant](grid, { ...test.params, variant: test.variant });
}

function repeatedNeighbours({ frames }: RecipeOutput, isLoop: boolean): number {
  const pairs = frames.slice(1).map((frame, index) => countChanged(frames[index], frame));
  const seam = isLoop && frames.length > 1 ? [seamChange({ frames, durations: [] })] : [];
  return [...pairs, ...seam].filter((changed) => changed === 0).length;
}

export function expectWellFormed(output: RecipeOutput, grid: GridSize, isLoop: boolean): void {
  expect(output.frames.length).toBeGreaterThan(0);
  expect(output.durations).toHaveLength(output.frames.length);
  output.frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
  output.durations.forEach((ms) => expect(Number.isInteger(ms) && ms > 0).toBe(true));
  expect(repeatedNeighbours(output, isLoop)).toBe(0);
}

export function expectFlashSafe(output: RecipeOutput, grid: GridSize, isLoop: boolean): void {
  expect(maxBigChangesPerSecond(output, isLoop)).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_SECOND);
  const clip = { ...grid, frames: output.frames, durations: output.durations };
  expect(countPeakFlashesPerSecond(clip)).toBeLessThanOrEqual(MAX_CELL_FLASHES_PER_SECOND);
}
