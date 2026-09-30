import { describe, expect, it } from 'vitest';

import { createRng } from '../../../../src/core/rng';
import {
  insertionSteps,
  isSorted,
  oddEvenPass,
  shuffleValues,
  staircase,
} from '../../../../src/core/recipes/columns/sort-bars';
import { VARIANTS_B } from '../../../../src/core/recipes/columns/variants-b';
import type { Frame, GridSize } from '../../../../src/core/types';

import { gridsFrom, label, litCounts } from './support-b';

const SET_GRID = { cols: 8, rows: 8 };
const SMALLEST = { cols: 5, rows: 4 };
const SORTED = [1, 2, 3, 4, 5, 6, 7, 8];
const SWEEP = Array.from({ length: SET_GRID.cols }, (_, x) =>
  SORTED.map((value, column) => (column === x ? 0 : value)),
);

function heightsOf(frame: Frame, { cols, rows }: GridSize): number[] {
  return Array.from({ length: cols }, (_, x) => {
    const lit = Array.from({ length: rows }, (_, y) => frame[y * cols + x]);
    const height = lit.filter((bit) => bit === 1).length;
    expect(lit.slice(rows - height).every((bit) => bit === 1)).toBe(true);
    return height;
  });
}

function run(variant: string, grid: GridSize = SET_GRID) {
  const output = VARIANTS_B[variant](grid, { variant });
  return { ...output, heights: output.frames.map((frame) => heightsOf(frame, grid)) };
}

describe('sort bars', () => {
  it('builds a staircase of at least 1 row a bar', () => {
    expect(staircase(SET_GRID)).toEqual(SORTED);
    expect(staircase({ cols: 16, rows: 4 })).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4]);
  });

  it('swaps out-of-order pairs of the pass parity only', () => {
    expect(oddEvenPass([3, 1, 4, 2], 0)).toEqual([1, 3, 2, 4]);
    expect(oddEvenPass([3, 1, 4, 2], 1)).toEqual([3, 1, 4, 2]);
    expect(oddEvenPass([1, 4, 2, 3], 1)).toEqual([1, 2, 4, 3]);
  });

  it('never returns a sorted shuffle and leaves the input untouched', () => {
    const values = [1, 2];
    expect(shuffleValues(values, () => 0.99)).toEqual([2, 1]);
    expect(values).toEqual([1, 2]);
    expect(isSorted(shuffleValues(SORTED, createRng(1)))).toBe(false);
  });

  it('lists insertion steps that each move one bar one column left', () => {
    expect(insertionSteps([2, 3, 1])).toEqual([
      [2, 3, 1],
      [2, 1, 3],
      [1, 2, 3],
    ]);
  });
});

describe('sort variants', () => {
  it('holds a shuffle, runs 8 odd-even passes, holds, sweeps and holds on 8x8', () => {
    const output = run('sort');
    expect(output.heights).toEqual([
      [2, 8, 5, 3, 7, 1, 4, 6],
      [2, 8, 3, 5, 1, 7, 4, 6],
      [2, 3, 8, 1, 5, 4, 7, 6],
      [2, 3, 1, 8, 4, 5, 6, 7],
      [2, 1, 3, 4, 8, 5, 6, 7],
      [1, 2, 3, 4, 5, 8, 6, 7],
      [1, 2, 3, 4, 5, 6, 8, 7],
      SORTED,
      ...SWEEP,
      SORTED,
    ]);
    expect(output.durations).toEqual([
      300, 120, 120, 120, 120, 120, 120, 620, 50, 50, 50, 50, 50, 50, 50, 50, 400,
    ]);
  });

  it('keeps the lit count constant outside the verification sweep', () => {
    const counts = litCounts(run('sort'));
    expect(counts.slice(0, 8).every((count) => count === 36)).toBe(true);
    expect(counts.slice(8, 16)).toEqual([35, 34, 33, 32, 31, 30, 29, 28]);
  });

  it('sorts the smallest 5x4 grid into a staircase', () => {
    const output = run('sort', SMALLEST);
    expect(output.heights.slice(0, 4)).toEqual([
      [2, 4, 1, 2, 3],
      [2, 1, 4, 2, 3],
      [1, 2, 2, 4, 3],
      [1, 2, 2, 3, 4],
    ]);
    expect(output.durations).toEqual([420, 120, 120, 620, 50, 50, 50, 50, 50, 400]);
  });

  it.each(gridsFrom(SMALLEST).map((grid) => [label(grid), grid] as const))(
    'ends every thinking loop on the sorted staircase on %s',
    (_name, grid) => {
      const { heights } = run('sort', grid);
      expect(heights[heights.length - 1]).toEqual(staircase(grid));
      expect(isSorted(heights[0])).toBe(false);
    },
  );

  it('shows the still staircase for idle', () => {
    const output = run('sort-done');
    expect(output.heights).toEqual([SORTED]);
    expect(output.durations).toEqual([1000]);
  });

  it('slides one bar at a time into place for ranking', () => {
    const output = run('sort-insert');
    expect(output.heights[0]).toEqual([2, 8, 5, 3, 7, 1, 4, 6]);
    expect(output.heights[1]).toEqual([2, 5, 8, 3, 7, 1, 4, 6]);
    expect(output.heights[output.heights.length - 1]).toEqual(SORTED);
    expect(output.frames).toHaveLength(15);
    expect(output.durations).toEqual([300, ...Array.from({ length: 13 }, () => 120), 600]);
  });

  it('verifies the staircase column by column for success and holds it', () => {
    const output = run('sort-verify');
    expect(output.heights).toEqual([SORTED, ...SWEEP, SORTED]);
    expect(output.durations).toEqual([300, 50, 50, 50, 50, 50, 50, 50, 50, 1500]);
  });

  it('rescrambles the staircase three times at 150 ms and leaves it unsorted for error', () => {
    const output = run('sort-bogo');
    expect(output.heights).toEqual([
      SORTED,
      [2, 8, 5, 3, 7, 1, 4, 6],
      [3, 7, 5, 1, 2, 8, 4, 6],
      [1, 4, 3, 5, 6, 2, 8, 7],
    ]);
    expect(output.durations).toEqual([150, 150, 150, 1500]);
  });

  it('shuffles differently for another seed', () => {
    const other = VARIANTS_B.sort(SET_GRID, { variant: 'sort', seed: 9 });
    expect(other.frames[0]).not.toEqual(run('sort').frames[0]);
  });
});
