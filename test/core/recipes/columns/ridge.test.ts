import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { RIDGE_FRAMES, ridgePhase } from '../../../../src/core/recipes/columns/ridge';
import {
  RIDGE_FULL_AMPLITUDE,
  ridgeLayout,
  surfaceFrame,
} from '../../../../src/core/recipes/columns/ridge-surface';
import { VARIANTS_B } from '../../../../src/core/recipes/columns/variants-b';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import { framesText, litCounts } from './support-b';

const SET_GRID = { cols: 16, rows: 10 };

const THINKING_FIRST = [
  '0000001111000000',
  '0000110000100000',
  '0001000000010000',
  '1110000111101111',
  '0000001000010000',
  '0000010000001100',
  '1111100000000011',
  '0000000001110000',
  '0000000110001100',
  '1111111000000011',
];

const THINKING_HALF = [
  '0000000000000000',
  '0000000000000000',
  '0000000001111100',
  '1111111110000011',
  '0000010000000000',
  '0011101100000000',
  '1100011111111111',
  '0000100011000000',
  '0011000000100000',
  '1100000000011111',
];

const IDLE_FIRST = [
  '0000000000000000',
  '0000000000000000',
  '0000111111100000',
  '1111000000011111',
  '0000000000000000',
  '0000001111110000',
  '1111110000001111',
  '0000000000000000',
  '0000000001110000',
  '1111111110001111',
];

const SETTLE = [
  [
    '0000001111000000',
    '0000110000100000',
    '0001000000010000',
    '1110000111101111',
    '0000001000010000',
    '0000010000001100',
    '1111100000000011',
    '0000000001110000',
    '0000000110001100',
    '1111111000000011',
  ],
  [
    '0000000110000000',
    '0000011001100000',
    '0001100000010000',
    '1110000000001111',
    '0000000111100000',
    '0000011000011100',
    '1111100000000011',
    '0000000000000000',
    '0000000011111100',
    '1111111100000011',
  ],
  [
    '0000000000000000',
    '0000000111000000',
    '0000111000110000',
    '1111000000001111',
    '0000000000000000',
    '0000001111111000',
    '1111110000000111',
    '0000000000000000',
    '0000000000110000',
    '1111111111001111',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000001111100000',
    '1111110000011111',
    '0000000000000000',
    '0000000001100000',
    '1111111110011111',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
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
    '1111111111111111',
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
    '0000111111110000',
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
    '0000111111110000',
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
    '0000110111110000',
    '0000001000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000100011110000',
    '0000010100000000',
    '0000001000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000001110000',
    '0000100010000000',
    '0000010100000000',
    '0000001000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000110000',
    '0000000001000000',
    '0000100010000000',
    '0000010100000000',
    '0000001000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000010000',
    '0000000000100000',
    '0000000001000000',
    '0000100010000000',
    '0000010100000000',
    '0000001000000000',
    '0000000000000000',
    '0000000000000000',
  ],
];

const SPIKE = [
  [
    '0000001111000000',
    '0000110110100000',
    '0001000110010000',
    '1110000111101111',
    '0000001110010000',
    '0000011001001100',
    '1111101001000011',
    '0000001000110000',
    '0000001000001100',
    '1111110000000011',
  ],
  [
    '0000000110000000',
    '0000000110000000',
    '0000111111110000',
    '1111000110001111',
    '0000000110000000',
    '0000001001111000',
    '1111111001000111',
    '0000001001000000',
    '0000001000111000',
    '1111110000000111',
  ],
  [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
    '0000000000000000',
    '0000000000000000',
    '1111111111111111',
  ],
];

function run(variant: string, params: RecipeParams = {}, grid: GridSize = SET_GRID) {
  return VARIANTS_B[variant](grid, { ...params, variant });
}

function asRows(texts: readonly string[]): string[][] {
  return texts.map((text) => text.split(' '));
}

describe('ridge layout', () => {
  it('stacks three lines 3 rows apart on 16x10', () => {
    expect(ridgeLayout(SET_GRID)).toEqual({ bases: [9, 6, 3], sigma: 3.2, centre: 7.5 });
  });

  it('centres the lines with an odd spare row above', () => {
    expect(ridgeLayout({ cols: 12, rows: 9 }).bases).toEqual([7, 4]);
    expect(ridgeLayout({ cols: 10, rows: 7 }).bases).toEqual([6, 3]);
    expect(ridgeLayout({ cols: 16, rows: 16 }).bases).toEqual([15, 12, 9, 6, 3]);
  });

  it('keeps one line on grids too short for two', () => {
    expect(ridgeLayout({ cols: 3, rows: 3 }).bases).toEqual([2]);
  });
});

describe('ridge variants', () => {
  it('rolls a full swell over 24 frames at 90 ms on 16x10', () => {
    const output = run('ridge');
    expect(output.frames).toHaveLength(RIDGE_FRAMES);
    expect(output.durations).toEqual(output.frames.map(() => 90));
    expect(asRows(framesText(output, SET_GRID.cols, [0, 12]))).toEqual([THINKING_FIRST, THINKING_HALF]);
  });

  it('closes the loop exactly: the frame after the last is the first', () => {
    const layout = ridgeLayout(SET_GRID);
    const next = surfaceFrame(SET_GRID, layout, RIDGE_FULL_AMPLITUDE, ridgePhase(RIDGE_FRAMES));
    expect(next).toEqual(run('ridge').frames[0]);
  });

  it('hides the lines behind the nearer ones so every column shows three cells', () => {
    expect(litCounts(run('ridge')).every((count) => count === 48)).toBe(true);
  });

  it('leaves flat lines with a 1-row ripple at 150 ms for density 0', () => {
    const output = run('ridge', { density: 0 });
    expect(asRows(framesText(output, SET_GRID.cols, [0]))).toEqual([IDLE_FIRST]);
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(RIDGE_FRAMES * 150);
    output.frames.forEach((frame) => {
      const rows = Array.from({ length: SET_GRID.rows }, (_, y) => frame.slice(y * 16, y * 16 + 16));
      expect(
        rows
          .filter((_, y) => ![2, 3, 5, 6, 8, 9].includes(y))
          .flat()
          .every((bit) => bit === 0),
      ).toBe(true);
    });
  });

  it('follows a seeded voice envelope for listening', () => {
    const output = run('ridge-level');
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(RIDGE_FRAMES * 90);
    expect(run('ridge-level', { seed: 3 }).frames).not.toEqual(output.frames);
    expect(run('ridge-level')).toEqual(output);
  });

  it('flattens, drops the back lines and lifts the front line into the check', () => {
    const output = run('ridge-settle');
    expect(asRows(framesText(output, SET_GRID.cols))).toEqual(SETTLE);
    expect(output.durations).toEqual([90, 90, 90, 90, 90, 90, 90, 60, 60, 60, 60, 60, 60, 1500]);
    expect(output.frames[output.frames.length - 1]).toEqual(glyphMask('check', SET_GRID));
  });

  it('spikes the front line for 2 frames, then goes flat', () => {
    const output = run('ridge-spike');
    expect(asRows(framesText(output, SET_GRID.cols))).toEqual(SPIKE);
    expect(output.durations).toEqual([90, 90, 1500]);
  });
});
