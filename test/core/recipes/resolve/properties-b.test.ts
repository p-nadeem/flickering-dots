import { describe, expect, it } from 'vitest';

import type { GridSize, RecipeParams } from '../../../../src/core/types';
import { VARIANTS_B } from '../../../../src/core/recipes/resolve/variants-b';

import { expectFlashSafe, expectWellFormed, gridsFrom, label, largestStep, seamStep } from './support-b';

interface Case {
  state: string;
  params: RecipeParams & { variant: string };
  grids: GridSize[];
  isLoop: boolean;
  maxSeam?: number;
}

const LOWER_HALF_CELLS = 6;
const BOARD_GRIDS = gridsFrom(15, 5);
const COUNTER_GRIDS = gridsFrom(5, 7);

const CASES: Case[] = [
  { state: 'board idle', params: { variant: 'font', glyph: '----' }, grids: BOARD_GRIDS, isLoop: true },
  {
    state: 'board thinking',
    params: { variant: 'font', glyph: 'PLAN|READ|CODE|TEST' },
    grids: BOARD_GRIDS,
    isLoop: true,
  },
  {
    state: 'board waiting',
    params: { variant: 'font-wait', glyph: 'WAIT' },
    grids: BOARD_GRIDS,
    isLoop: true,
    maxSeam: LOWER_HALF_CELLS,
  },
  {
    state: 'board success',
    params: { variant: 'font-done', glyph: 'DONE' },
    grids: BOARD_GRIDS,
    isLoop: false,
  },
  {
    state: 'board error',
    params: { variant: 'font-fail', glyph: 'FAIL' },
    grids: BOARD_GRIDS,
    isLoop: false,
  },
  {
    state: 'countdown idle',
    params: { variant: 'segments', glyph: '0', density: 0.5 },
    grids: COUNTER_GRIDS,
    isLoop: true,
  },
  {
    state: 'countdown thinking',
    params: { variant: 'segments', glyph: '0-9' },
    grids: COUNTER_GRIDS,
    isLoop: true,
  },
  {
    state: 'countdown retrying',
    params: { variant: 'segments', glyph: '5-1' },
    grids: COUNTER_GRIDS,
    isLoop: true,
  },
  {
    state: 'countdown two digits',
    params: { variant: 'segments', glyph: '10-1' },
    grids: gridsFrom(8, 7),
    isLoop: true,
  },
  {
    state: 'countdown success',
    params: { variant: 'segments-done', glyph: '0' },
    grids: COUNTER_GRIDS,
    isLoop: false,
  },
  {
    state: 'countdown error',
    params: { variant: 'segments-fail', glyph: '0' },
    grids: COUNTER_GRIDS,
    isLoop: false,
  },
];

const SMALL_GRIDS: GridSize[] = [
  { cols: 3, rows: 3 },
  { cols: 4, rows: 5 },
  { cols: 7, rows: 3 },
];

describe.each(CASES)('resolve $state', ({ params, grids, isLoop }) => {
  const generate = VARIANTS_B[params.variant];

  it('draws well-formed frames, the same on every call, on every grid from its smallest to 16x16', () => {
    grids.forEach((grid) => {
      const output = generate(grid, params);
      expectWellFormed(output, grid, label(grid));
      expect(generate(grid, params), label(grid)).toEqual(output);
    });
  });

  it('keeps big changes to at most 6 in any second', () => {
    grids.forEach((grid) => expectFlashSafe(generate(grid, params), isLoop, label(grid)));
  });

  it('still draws on grids smaller than it reads on', () => {
    SMALL_GRIDS.forEach((grid) => expectWellFormed(generate(grid, params), grid, label(grid)));
  });
});

describe.each(CASES.filter(({ isLoop }) => isLoop))('resolve $state loop', ({ params, grids, maxSeam }) => {
  it('loops without a jump bigger than its own steps, or than the landing half-flip when waiting', () => {
    grids.forEach((grid) => {
      const output = VARIANTS_B[params.variant](grid, params);
      expect(seamStep(output), label(grid)).toBeLessThanOrEqual(maxSeam ?? largestStep(output));
    });
  });
});
