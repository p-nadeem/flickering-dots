import { expect } from 'vitest';

import type { RecipeOutput } from '../../../../src/core/recipes/helpers';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, toFrameText } from '../frame-text';

const FLASH_STEP_FRACTION = 0.2;
const WINDOW_MS = 1000;
const MAX_STEPS_PER_WINDOW = 6;
const GRID_LIMIT = 16;

export function squareGrids(from: number): GridSize[] {
  return Array.from({ length: GRID_LIMIT - from + 1 }, (_, index) => ({
    cols: from + index,
    rows: from + index,
  }));
}

export function gridsFrom(from: number): GridSize[] {
  const wide = { cols: GRID_LIMIT, rows: from };
  const tall = { cols: from, rows: GRID_LIMIT };
  return [...squareGrids(from), wide, tall, { cols: from + 3, rows: from + 1 }];
}

export function label({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function countChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function stepTimes(output: RecipeOutput, isLoop: boolean): number[] {
  const { frames, durations } = output;
  const cells = frames[0].length;
  const steps = isLoop ? frames.length : frames.length - 1;
  const ends = durations.map((_, index) => durations.slice(0, index + 1).reduce((sum, ms) => sum + ms, 0));
  return Array.from({ length: Math.max(0, steps) }, (_, index) => index).flatMap((index) => {
    const next = frames[(index + 1) % frames.length];
    const step = Math.abs(countLit(next) - countLit(frames[index]));
    return frames.length > 1 && step >= FLASH_STEP_FRACTION * cells ? [ends[index]] : [];
  });
}

export function peakFlashSteps(output: RecipeOutput, isLoop: boolean): number {
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const loops = isLoop ? Math.ceil((2 * WINDOW_MS) / loopMs) + 1 : 1;
  const once = stepTimes(output, isLoop);
  const all = Array.from({ length: loops }, (_, loop) => once.map((time) => time + loop * loopMs)).flat();
  return all.reduce((most, start) => {
    const inside = all.filter((time) => time >= start && time < start + WINDOW_MS).length;
    return Math.max(most, inside);
  }, 0);
}

export function largestStep({ frames }: RecipeOutput): number {
  return frames
    .slice(1)
    .reduce((most, frame, index) => Math.max(most, countChanged(frames[index], frame)), 0);
}

export function seamChange({ frames }: RecipeOutput): number {
  return countChanged(frames[frames.length - 1], frames[0]);
}

export function lastFrame({ frames }: RecipeOutput): Frame {
  return frames[frames.length - 1];
}

export function rowsOf(frame: Frame, cols: number): string[] {
  return toFrameText(frame, cols)
    .split(' ')
    .map((row) => row.replaceAll('0', '.').replaceAll('1', '#'));
}

export function isMirroredBothWays(frame: Frame, cols: number): boolean {
  const rows = rowsOf(frame, cols);
  const isLeftRight = rows.every((row) => row === [...row].reverse().join(''));
  const isTopBottom = rows.every((row, index) => row === rows[rows.length - 1 - index]);
  return isLeftRight && isTopBottom;
}

export function expectWellFormed(output: RecipeOutput, grid: GridSize, name: string): void {
  expect(output.frames.length, name).toBeGreaterThan(0);
  expect(output.durations.length, name).toBe(output.frames.length);
  output.frames.forEach((frame) => {
    expect(frame.length, name).toBe(grid.cols * grid.rows);
    expect(
      frame.every((bit) => bit === 0 || bit === 1),
      name,
    ).toBe(true);
  });
  output.durations.forEach((ms) => expect(ms, name).toBeGreaterThan(0));
}

export function expectFlashSafe(output: RecipeOutput, isLoop: boolean, name: string): void {
  expect(peakFlashSteps(output, isLoop), name).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
}

export interface PinnedOutput {
  frames: string[];
  durations: number[];
  still?: number;
}
