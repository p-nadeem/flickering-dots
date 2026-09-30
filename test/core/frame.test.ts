import { describe, expect, it } from 'vitest';

import { cellIndex, countLit, createFrame, framesEqual, isGridSide } from '../../src/core/frame';

import { CENTRE_3, FULL_3, PLUS_3, toFrame } from './fixtures';

describe('createFrame', () => {
  it('returns a blank frame of cols times rows cells when no test is given', () => {
    expect(createFrame({ cols: 4, rows: 3 })).toEqual(Array.from({ length: 12 }, () => 0));
  });

  it('asks isLit about every cell in row-major order', () => {
    const frame = createFrame({ cols: 3, rows: 3 }, (x, y) => x === 1 || y === 1);

    expect(frame).toEqual(PLUS_3);
  });

  it('passes x and y so a diagonal lights one cell per row', () => {
    expect(createFrame({ cols: 3, rows: 2 }, (x, y) => x === y)).toEqual(toFrame('100 010'));
  });
});

describe('cellIndex', () => {
  it('returns y times cols plus x', () => {
    expect(cellIndex(7, 0, 0)).toBe(0);
    expect(cellIndex(7, 3, 3)).toBe(24);
    expect(cellIndex(9, 8, 2)).toBe(26);
  });
});

describe('countLit', () => {
  it('counts the lit cells of a frame', () => {
    expect(countLit(CENTRE_3)).toBe(1);
    expect(countLit(PLUS_3)).toBe(5);
    expect(countLit(FULL_3)).toBe(9);
    expect(countLit([])).toBe(0);
  });
});

describe('framesEqual', () => {
  it('is true for frames with the same cells', () => {
    expect(framesEqual(PLUS_3, toFrame('010 111 010'))).toBe(true);
  });

  it('is false when one cell differs', () => {
    expect(framesEqual(PLUS_3, toFrame('010 111 011'))).toBe(false);
  });

  it('is false when the lengths differ', () => {
    expect(framesEqual(PLUS_3, PLUS_3.slice(0, 8))).toBe(false);
  });
});

describe('isGridSide', () => {
  it('accepts whole numbers from 3 to 16', () => {
    expect([3, 7, 16].map(isGridSide)).toEqual([true, true, true]);
  });

  it('rejects numbers outside the range, fractions and non-numbers', () => {
    expect([2, 17, 3.5, Number.NaN, '7', null, undefined].map(isGridSide)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
