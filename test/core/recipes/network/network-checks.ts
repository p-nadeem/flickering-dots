import { expect } from 'vitest';

import { generateNetwork } from '../../../../src/core/recipes/network';
import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

export type Cell = readonly [x: number, y: number];

const MAX_SIDE = 16;
const BIG_CHANGE_SHARE = 0.2;
const WINDOW_MS = 1000;

export const MAX_BIG_CHANGES_PER_WINDOW = 6;

export function gridsFrom(minCols: number, minRows: number): GridSize[] {
  const cols = Array.from({ length: MAX_SIDE - minCols + 1 }, (_, index) => minCols + index);
  const rows = Array.from({ length: MAX_SIDE - minRows + 1 }, (_, index) => minRows + index);
  return cols.flatMap((c) => rows.map((r) => ({ cols: c, rows: r })));
}

export function gridLabel({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function run(variant: string, grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  return generateNetwork(grid, { ...params, variant });
}

export function changedCells(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
}

function bigChangeTimes(output: RecipeOutput, grid: GridSize, isLoop: boolean): number[] {
  const repeats = isLoop ? 2 : 1;
  const frames = Array.from({ length: repeats }, () => output.frames).flat();
  const durations = Array.from({ length: repeats }, () => output.durations).flat();
  const starts = startTimes(durations);
  const limit = BIG_CHANGE_SHARE * grid.cols * grid.rows;
  return frames
    .slice(1)
    .flatMap((frame, index) => (changedCells(frames[index], frame) >= limit ? [starts[index + 1]] : []));
}

export function maxBigChangesPerSecond(output: RecipeOutput, grid: GridSize, isLoop: boolean): number {
  const times = bigChangeTimes(output, grid, isLoop);
  const counts = times.map(
    (start) => times.filter((time) => time >= start && time < start + WINDOW_MS).length,
  );
  return Math.max(0, ...counts);
}

export function maxStepChange(frames: readonly Frame[]): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => changedCells(frames[index], frame)));
}

export function seamChange(frames: readonly Frame[]): number {
  return changedCells(frames[frames.length - 1], frames[0]);
}

export function litCells(frame: Frame, cols: number): Cell[] {
  return frame.flatMap((bit, index): Cell[] => (bit === 1 ? [[index % cols, Math.floor(index / cols)]] : []));
}

export function cellKeys(cells: readonly Cell[]): string[] {
  return cells.map(([x, y]) => `${x},${y}`).sort();
}

export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

export function expectWellFormed(output: RecipeOutput, grid: GridSize): void {
  expect(output.frames.length).toBeGreaterThan(0);
  expect(output.durations).toHaveLength(output.frames.length);
  output.frames.forEach((frame) => {
    expect(frame).toHaveLength(grid.cols * grid.rows);
    expect(frame.every((bit) => bit === 0 || bit === 1)).toBe(true);
  });
  output.durations.forEach((ms) => {
    expect(Number.isInteger(ms)).toBe(true);
    expect(ms).toBeGreaterThan(0);
  });
  if (output.still !== undefined) {
    expect(output.still).toBeGreaterThanOrEqual(0);
    expect(output.still).toBeLessThan(output.frames.length);
  }
}

export interface VariantCase {
  variant: string;
  minGrid: GridSize;
  isLoop: boolean;
}

export function expectVariantAcrossGrids({ variant, minGrid, isLoop }: VariantCase): void {
  gridsFrom(minGrid.cols, minGrid.rows).forEach((grid) => {
    const output = run(variant, grid);
    expectWellFormed(output, grid);
    expect(run(variant, grid), `${variant} ${gridLabel(grid)} determinism`).toEqual(output);
    expect(
      maxBigChangesPerSecond(output, grid, isLoop),
      `${variant} ${gridLabel(grid)} flashes`,
    ).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_WINDOW);
    if (isLoop) {
      expect(seamChange(output.frames), `${variant} ${gridLabel(grid)} seam`).toBeLessThanOrEqual(
        maxStepChange(output.frames),
      );
    }
  });
}
