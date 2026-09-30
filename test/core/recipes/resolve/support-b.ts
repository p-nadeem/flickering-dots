import { expect } from 'vitest';

import type { RecipeOutput } from '../../../../src/core/recipes/helpers';
import type { Frame, GridSize } from '../../../../src/core/types';

const FLASH_CHANGE_FRACTION = 0.2;
const WINDOW_MS = 1000;
const MAX_BIG_CHANGES_PER_WINDOW = 6;
const GRID_LIMIT = 16;
const HASH_OFFSET = 2166136261;
const HASH_PRIME = 16777619;
const HEX = 16;

export function gridsFrom(minCols: number, minRows: number): GridSize[] {
  const sides = (min: number) => Array.from({ length: GRID_LIMIT - min + 1 }, (_, index) => min + index);
  return sides(minCols).flatMap((cols) => sides(minRows).map((rows) => ({ cols, rows })));
}

export function label({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function changedCells(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function bigChangeTimes({ frames, durations }: RecipeOutput, isLoop: boolean): number[] {
  const cells = frames[0].length;
  const ends = durations.map((_, index) => durations.slice(0, index + 1).reduce((sum, ms) => sum + ms, 0));
  const steps = isLoop ? frames.length : frames.length - 1;
  return ends.slice(0, Math.max(0, steps)).flatMap((end, index) => {
    const next = frames[(index + 1) % frames.length];
    return changedCells(frames[index], next) >= FLASH_CHANGE_FRACTION * cells ? [end] : [];
  });
}

export function peakBigChanges(output: RecipeOutput, isLoop: boolean): number {
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const loops = isLoop ? Math.ceil((2 * WINDOW_MS) / loopMs) + 1 : 1;
  const once = bigChangeTimes(output, isLoop);
  const all = Array.from({ length: loops }, (_, loop) => once.map((time) => time + loop * loopMs)).flat();
  return all.reduce(
    (most, start) => Math.max(most, all.filter((time) => time >= start && time < start + WINDOW_MS).length),
    0,
  );
}

export function largestStep({ frames }: RecipeOutput): number {
  return frames
    .slice(1)
    .reduce((most, frame, index) => Math.max(most, changedCells(frames[index], frame)), 0);
}

export function seamStep({ frames }: RecipeOutput): number {
  return changedCells(frames[frames.length - 1], frames[0]);
}

export function lastFrame({ frames }: RecipeOutput): Frame {
  return frames[frames.length - 1];
}

export function rowsOf(frame: Frame, cols: number): string[] {
  return Array.from({ length: frame.length / cols }, (_, y) =>
    frame
      .slice(y * cols, (y + 1) * cols)
      .map((bit) => (bit === 1 ? '#' : '.'))
      .join(''),
  );
}

export function hashFrames(frames: readonly Frame[]): string {
  const hash = frames
    .flat()
    .reduce<number>((value, bit) => Math.imul(value ^ (bit + 1), HASH_PRIME) >>> 0, HASH_OFFSET);
  return hash.toString(HEX);
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
  output.durations.forEach((ms) => expect(Number.isInteger(ms) && ms > 0, name).toBe(true));
}

export function expectFlashSafe(output: RecipeOutput, isLoop: boolean, name: string): void {
  expect(peakBigChanges(output, isLoop), name).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_WINDOW);
}
