import { describe, expect, it } from 'vitest';

import { AURORA_FRAMES, isRayColumn } from '../../../../src/core/recipes/columns/aurora-sky';
import { VARIANTS_B } from '../../../../src/core/recipes/columns/variants-b';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import { framesText, gridsFrom, label, litCounts } from './support-b';

const SET_GRID = { cols: 16, rows: 9 };
const DARK_COLUMNS = [0, 3, 6, 9, 12, 15];

const THINKING = [
  [
    '0110100010110000',
    '0110100010110000',
    '0110100010110000',
    '0110100000010000',
    '0110100000100000',
    '0110000000010000',
    '0000000000000000',
    '0100000000000000',
    '0000000000000000',
  ],
  [
    '0000110110000110',
    '0000110110000110',
    '0000110110000100',
    '0000100110000100',
    '0000000110000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
];

const FULL = [
  [
    '0110100010110000',
    '0110100010110000',
    '0110100010110000',
    '0110100000010000',
    '0110100000100000',
    '0110000000010000',
    '0000000000000000',
    '0100000000000000',
    '0000000000000000',
  ],
  [
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110100010110000',
    '0110100010110000',
    '0110100010110000',
    '0110100000010000',
    '0110000000000000',
    '0000000000000000',
  ],
  [
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110100010110000',
    '0110100000110000',
    '0110000000000000',
  ],
  [
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
  ],
  [
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0000000000000000',
  ],
  [
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0110110110110110',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
];

const FADE = [
  [
    '0110100010110000',
    '0110100010110000',
    '0110100010110000',
    '0110100000010000',
    '0110100000100000',
    '0110000000010000',
    '0000000000000000',
    '0100000000000000',
    '0000000000000000',
  ],
  [
    '0110100010110000',
    '0110100010110000',
    '0110100010010000',
    '0110100000100000',
    '0110100000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0110100000110000',
    '0110100010110000',
    '0110100000010000',
    '0110000000000000',
    '0100000000000000',
    '0010000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0110100010110000',
    '0110100000110000',
    '0110000000000000',
    '0110000000000000',
    '0100000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0110000000100000',
    '0110000000010000',
    '0100000000000000',
    '0110000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0110000000000000',
    '0100000000000000',
    '0100000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0010000000000000',
    '0100000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0010000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
];

function run(variant: string, params: RecipeParams = {}, grid: GridSize = SET_GRID) {
  return VARIANTS_B[variant](grid, { ...params, variant });
}

function asRows(texts: readonly string[]): string[][] {
  return texts.map((text) => text.split(' '));
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe('aurora rays', () => {
  it('keeps every third column dark, placed symmetrically', () => {
    const dark = Array.from({ length: 16 }, (_, x) => x).filter((x) => !isRayColumn(x, 16));
    expect(dark).toEqual(DARK_COLUMNS);
    [9, 10, 11, 12, 13, 14, 15, 16].forEach((cols) => {
      const isRay = Array.from({ length: cols }, (_, x) => isRayColumn(x, cols));
      expect(isRay).toEqual([...isRay].reverse());
    });
  });

  it.each(gridsFrom({ cols: 9, rows: 6 }).map((grid) => [label(grid), grid] as const))(
    'hangs rays from the top in ray columns only on %s',
    (_name, grid) => {
      run('aurora', {}, grid).frames.forEach((frame) => {
        Array.from({ length: grid.cols }, (_, x) => x).forEach((x) => {
          const column = Array.from({ length: grid.rows }, (_, y) => frame[y * grid.cols + x]);
          const lastLit = column.lastIndexOf(1);
          if (!isRayColumn(x, grid.cols)) expect(lastLit).toBe(-1);
          expect(column.slice(0, Math.max(0, lastLit - 1)).every((bit) => bit === 1)).toBe(true);
        });
      });
    },
  );
});

describe('aurora variants', () => {
  it('sways over 60 frames at 90 ms on 16x9', () => {
    const output = run('aurora');
    expect(output.frames).toHaveLength(AURORA_FRAMES);
    expect(output.durations).toEqual(output.frames.map(() => 90));
    expect(asRows(framesText(output, SET_GRID.cols, [0, 30]))).toEqual(THINKING);
  });

  it('shows fewer rays at half speed for density 0.3', () => {
    const calm = run('aurora', { density: 0.3 });
    expect(calm.durations.reduce((sum, ms) => sum + ms, 0)).toBe(AURORA_FRAMES * 180);
    expect(mean(litCounts(calm))).toBeLessThan(mean(litCounts(run('aurora'))) * 0.7);
  });

  it('deepens and lifts the curtain with a seeded voice envelope for listening', () => {
    const counts = litCounts(run('aurora-level'));
    expect(Math.max(...counts) - Math.min(...counts)).toBeGreaterThan(20);
    expect(run('aurora-level', { seed: 8 }).frames).not.toEqual(run('aurora-level').frames);
  });

  it('drops every ray to full length over 3 frames, holds 600 ms and settles', () => {
    const output = run('aurora-full');
    expect(asRows(framesText(output, SET_GRID.cols))).toEqual(FULL);
    expect(output.durations).toEqual([90, 90, 90, 600, 90, 90, 1500]);
  });

  it('retracts the rays upward 1 row per 90 ms until the sky is dark', () => {
    const output = run('aurora-fade');
    expect(asRows(framesText(output, SET_GRID.cols))).toEqual(FADE);
    expect(output.durations).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 1500]);
    expect(litCounts(output)[output.frames.length - 1]).toBe(0);
  });
});
