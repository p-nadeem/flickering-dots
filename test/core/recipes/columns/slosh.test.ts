import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { VARIANTS_A } from '../../../../src/core/recipes/columns/variants-a';
import type { Frame, GridSize } from '../../../../src/core/types';

import { lastFrame, litRowsInColumn } from './support-a';

const SET_GRID = { cols: 9, rows: 9 };

function heights(frame: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, (_, x) => litRowsInColumn(frame, grid, x).length);
}

function meanHeight(frame: Frame): number {
  return heights(frame, SET_GRID).reduce((a, b) => a + b, 0) / SET_GRID.cols;
}

function isFilledFromBottom(frame: Frame, grid: GridSize): boolean {
  return Array.from({ length: grid.cols }, (_, x) => litRowsInColumn(frame, grid, x)).every((rows) =>
    rows.every((y, index) => y === grid.rows - rows.length + index),
  );
}

describe('slosh', () => {
  const output = VARIANTS_A.slosh(SET_GRID, { density: 0.3 });

  it('ripples a still 40 percent level by one row at the walls in a 10-frame loop', () => {
    expect(output.frames).toHaveLength(10);
    expect(output.frames.every((frame) => isFilledFromBottom(frame, SET_GRID))).toBe(true);
    const all = output.frames.map((frame) => heights(frame, SET_GRID));
    expect(new Set(all.flat())).toEqual(new Set([3, 4]));
    expect(new Set(all.map((row) => row[4]))).toEqual(new Set([4]));
  });
});

describe('slosh-cycle', () => {
  const output = VARIANTS_A['slosh-cycle'](SET_GRID, {});

  it('eases the level between 30 and 80 percent at a quarter row a frame, at 60 ms', () => {
    expect(output.frames).toHaveLength(36);
    expect(new Set(output.durations)).toEqual(new Set([60]));
    expect(meanHeight(output.frames[0])).toBeCloseTo(0.3 * 9, 0);
    expect(meanHeight(output.frames[18])).toBeCloseTo(0.8 * 9, 0);
    expect(output.frames.every((frame) => isFilledFromBottom(frame, SET_GRID))).toBe(true);
  });

  it('tilts the surface after each turn', () => {
    const tilted = heights(output.frames[3], SET_GRID);
    expect(tilted[0]).not.toBe(tilted[8]);
  });
});

describe('slosh-progress', () => {
  const output = VARIANTS_A['slosh-progress'](SET_GRID, {});

  it('steps the level up in eased stages and eases back to the start', () => {
    const means = output.frames.map(meanHeight);
    expect(means[0]).toBeCloseTo(0.25 * 9, 0);
    expect(Math.max(...means)).toBeGreaterThanOrEqual(7);
    expect(output.frames.every((frame) => isFilledFromBottom(frame, SET_GRID))).toBe(true);
  });
});

describe('slosh-full', () => {
  const output = VARIANTS_A['slosh-full'](SET_GRID, {});

  it('fills to the top, holds flat for 800 ms, then drains from the top into the check', () => {
    const full = output.frames.findIndex((frame) => frame.every((bit) => bit === 1));
    expect(full).toBeGreaterThan(0);
    expect(output.durations[full]).toBe(800);
    expect(lastFrame(output)).toEqual(glyphMask('check', SET_GRID));
    expect(output.durations[output.durations.length - 1]).toBe(1500);
  });
});

describe('slosh-drain', () => {
  const output = VARIANTS_A['slosh-drain'](SET_GRID, {});

  it('turns dots off from the centre of the bottom outward and ends empty', () => {
    const centreBottom = (SET_GRID.rows - 1) * SET_GRID.cols + 4;
    expect(output.frames[0][centreBottom]).toBe(1);
    const offFrom = output.frames.findIndex((frame) => frame[centreBottom] === 0);
    expect(output.frames.slice(offFrom).every((frame) => frame[centreBottom] === 0)).toBe(true);
    expect(lastFrame(output).every((bit) => bit === 0)).toBe(true);
  });
});
