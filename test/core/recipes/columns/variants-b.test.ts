import { describe, expect, it } from 'vitest';

import { VARIANTS_B } from '../../../../src/core/recipes/columns/variants-b';

import {
  expectFlashSafe,
  expectWellFormed,
  gridsFrom,
  label,
  maxInnerChange,
  runCase,
  seamChange,
} from './support-b';
import type { CaseB } from './support-b';

const ANY_GRID = { cols: 3, rows: 3 };
const RIDGE_MIN = { cols: 10, rows: 7 };
const AURORA_MIN = { cols: 9, rows: 6 };
const SORT_MIN = { cols: 5, rows: 4 };
const CRADLE_MIN = { cols: 7, rows: 3 };

const CASES: readonly CaseB[] = [
  { variant: 'ridge', params: {}, smallest: RIDGE_MIN, isLoop: true },
  { variant: 'ridge', params: { density: 0 }, smallest: RIDGE_MIN, isLoop: true },
  { variant: 'ridge-level', params: {}, smallest: RIDGE_MIN, isLoop: true },
  { variant: 'ridge-settle', params: {}, smallest: RIDGE_MIN, isLoop: false },
  { variant: 'ridge-spike', params: {}, smallest: RIDGE_MIN, isLoop: false },
  { variant: 'aurora', params: {}, smallest: AURORA_MIN, isLoop: true },
  { variant: 'aurora', params: { density: 0.3 }, smallest: AURORA_MIN, isLoop: true },
  { variant: 'aurora-level', params: {}, smallest: AURORA_MIN, isLoop: true },
  { variant: 'aurora-full', params: {}, smallest: AURORA_MIN, isLoop: false },
  { variant: 'aurora-fade', params: {}, smallest: AURORA_MIN, isLoop: false },
  { variant: 'sort', params: {}, smallest: SORT_MIN, isLoop: true },
  { variant: 'sort-done', params: {}, smallest: SORT_MIN, isLoop: true },
  { variant: 'sort-insert', params: {}, smallest: SORT_MIN, isLoop: true },
  { variant: 'sort-verify', params: {}, smallest: SORT_MIN, isLoop: false },
  { variant: 'sort-bogo', params: {}, smallest: SORT_MIN, isLoop: false },
  { variant: 'cradle', params: {}, smallest: CRADLE_MIN, isLoop: true },
  { variant: 'cradle-rest', params: {}, smallest: CRADLE_MIN, isLoop: true },
  { variant: 'cradle-slow', params: {}, smallest: CRADLE_MIN, isLoop: true },
  { variant: 'cradle-damp', params: {}, smallest: CRADLE_MIN, isLoop: false },
  { variant: 'cradle-lost', params: {}, smallest: CRADLE_MIN, isLoop: false },
];

const SWEEP = CASES.flatMap((test) =>
  gridsFrom(test.smallest).map(
    (grid) => [`${test.variant} ${JSON.stringify(test.params)} ${label(grid)}`, test, grid] as const,
  ),
);

const RESHUFFLING_LOOPS = new Set(['sort', 'sort-insert']);
const SEAM_SLACK = 1.5;

describe('columns variants b', () => {
  it('exports exactly the ridge, aurora, sort and cradle variants', () => {
    expect(Object.keys(VARIANTS_B).sort()).toEqual([...new Set(CASES.map((test) => test.variant))].sort());
  });

  it.each(Object.keys(VARIANTS_B))('renders %s on every grid down to 3x3 without throwing', (variant) => {
    gridsFrom(ANY_GRID).forEach((grid) => {
      expectWellFormed(VARIANTS_B[variant](grid, { variant }), grid, false);
    });
  });

  it.each(SWEEP)('gives clean, deterministic, flash-safe frames for %s', (_name, test, grid) => {
    const output = runCase(VARIANTS_B, test, grid);
    expect(runCase(VARIANTS_B, test, grid)).toEqual(output);
    expectWellFormed(output, grid, test.isLoop);
    expectFlashSafe(output, grid, test.isLoop);
    if (test.isLoop && !RESHUFFLING_LOOPS.has(test.variant)) {
      expect(seamChange(output)).toBeLessThanOrEqual(Math.max(1, SEAM_SLACK * maxInnerChange(output)));
    }
  });
});
