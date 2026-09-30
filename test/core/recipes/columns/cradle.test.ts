import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { cradleLayout } from '../../../../src/core/recipes/columns/cradle-scene';
import { VARIANTS_B } from '../../../../src/core/recipes/columns/variants-b';

import { framesText, litCounts } from './support-b';

const SET_GRID = { cols: 9, rows: 4 };
const SMALLEST = { cols: 7, rows: 3 };

const REST = '000000000 000000000 000000000 001111100';
const RIGHT_LOW = '000000000 000000000 000000010 001111000';
const RIGHT_APEX = '000000000 000000001 000000000 001111000';
const LEFT_LOW = '000000000 000000000 010000000 000111100';
const LEFT_APEX = '000000000 100000000 000000000 000111100';

function run(variant: string, grid = SET_GRID) {
  return VARIANTS_B[variant](grid, { variant });
}

describe('cradle layout', () => {
  it('centres five balls on the bottom row of 9x4 with a 2-cell swing', () => {
    expect(cradleLayout(SET_GRID)).toEqual({ row: 3, left: 2, count: 5, reach: 2 });
  });

  it('swings 1 cell on 7x3 and centres the scene on 16x16', () => {
    expect(cradleLayout(SMALLEST)).toEqual({ row: 2, left: 1, count: 5, reach: 1 });
    expect(cradleLayout({ cols: 16, rows: 16 })).toEqual({ row: 9, left: 5, count: 5, reach: 2 });
  });

  it('keeps a ball and a 1-cell swing on the narrowest grids', () => {
    expect(cradleLayout({ cols: 3, rows: 3 })).toEqual({ row: 2, left: 1, count: 1, reach: 1 });
  });
});

describe('cradle variants', () => {
  it('swings the right end out and back, clacks, then the left end, in 880 ms on 9x4', () => {
    const output = run('cradle');
    expect(framesText(output, SET_GRID.cols)).toEqual([
      RIGHT_LOW,
      RIGHT_APEX,
      RIGHT_LOW,
      REST,
      LEFT_LOW,
      LEFT_APEX,
      LEFT_LOW,
      REST,
    ]);
    expect(output.durations).toEqual([60, 280, 60, 40, 60, 280, 60, 40]);
    expect(litCounts(output).every((count) => count === 5)).toBe(true);
  });

  it('swings a single cell on 7x3', () => {
    const output = run('cradle', SMALLEST);
    expect(framesText(output, SMALLEST.cols)).toEqual([
      '0000000 0000001 0111100',
      '0000000 0000000 0111110',
      '0000000 1000000 0011110',
      '0000000 0000000 0111110',
    ]);
    expect(output.durations).toEqual([280, 40, 280, 40]);
  });

  it('doubles every duration for waiting', () => {
    const slow = run('cradle-slow');
    expect(slow.frames).toEqual(run('cradle').frames);
    expect(slow.durations).toEqual([120, 560, 120, 80, 120, 560, 120, 80]);
  });

  it('rests, lifting the right end ball 1 cell for 300 ms every 3 s', () => {
    const output = run('cradle-rest');
    expect(framesText(output, SET_GRID.cols)).toEqual([REST, RIGHT_LOW]);
    expect(output.durations).toEqual([2700, 300]);
  });

  it('damps the swing from 2 cells to 1 to rest, then shows the check', () => {
    const output = run('cradle-damp');
    expect(framesText(output, SET_GRID.cols)).toEqual([
      RIGHT_LOW,
      RIGHT_APEX,
      RIGHT_LOW,
      REST,
      LEFT_LOW,
      REST,
      '000000100 000101000 000010000 000000000',
    ]);
    expect(output.durations).toEqual([60, 280, 60, 40, 280, 440, 1500]);
    expect(output.frames[output.frames.length - 1]).toEqual(glyphMask('check', SET_GRID));
  });

  it('loses the right ball over the side after a clack and holds four balls', () => {
    const output = run('cradle-lost');
    expect(framesText(output, SET_GRID.cols)).toEqual([
      LEFT_LOW,
      LEFT_APEX,
      LEFT_LOW,
      REST,
      RIGHT_LOW,
      RIGHT_APEX,
      '000000000 000000000 000000000 001111000',
    ]);
    expect(output.durations).toEqual([60, 280, 60, 40, 70, 70, 1500]);
  });

  it('lets the lost ball fall below the row on a wide grid before it leaves', () => {
    const grid = { cols: 16, rows: 9 };
    const output = run('cradle-lost', grid);
    const flightRows = output.frames.slice(4, -1).map((frame) => {
      const index = frame.findIndex((bit, cell) => bit === 1 && cell % grid.cols > 9);
      return [index % grid.cols, Math.floor(index / grid.cols)];
    });
    expect(flightRows).toEqual([
      [10, 4],
      [11, 3],
      [12, 3],
      [13, 4],
      [14, 5],
      [15, 6],
    ]);
  });
});
