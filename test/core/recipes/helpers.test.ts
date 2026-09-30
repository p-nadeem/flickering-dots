import { describe, expect, it } from 'vitest';

import {
  createBlankFrame,
  createFrame,
  createFrameFromPattern,
  createFrameFromPoints,
  getCentre,
  getLinePoints,
  getPerimeterPoints,
  mergeRepeatedFrames,
  wrapIndex,
} from '../../../src/core/recipes/helpers';

import { toFrameText } from './frame-text';

const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000', '0000000'];

describe('createBlankFrame', () => {
  it('returns cols times rows dark cells', () => {
    expect(createBlankFrame({ cols: 4, rows: 3 })).toEqual(Array.from({ length: 12 }, () => 0));
  });
});

describe('getCentre', () => {
  it('returns the middle of the grid, halfway between cells on even sides', () => {
    expect(getCentre({ cols: 7, rows: 4 })).toEqual({ cx: 3, cy: 1.5 });
  });
});

describe('createFrame', () => {
  it('asks for every cell in row-major order', () => {
    const visited: string[] = [];
    const frame = createFrame({ cols: 3, rows: 2 }, (x, y) => {
      visited.push(`${x},${y}`);
      return x === y;
    });
    expect(visited).toEqual(['0,0', '1,0', '2,0', '0,1', '1,1', '2,1']);
    expect(toFrameText(frame, 3)).toBe('100 010');
  });
});

describe('createFrameFromPoints', () => {
  it('lights the given points and ignores points outside the grid', () => {
    const frame = createFrameFromPoints({ cols: 3, rows: 3 }, [
      [0, 0],
      [2, 1],
      [3, 1],
      [-1, 2],
      [1, 3],
    ]);
    expect(toFrameText(frame, 3)).toBe('100 001 000');
  });
});

describe('createFrameFromPattern', () => {
  it('copies a pattern that matches the grid', () => {
    expect(toFrameText(createFrameFromPattern(HEART, { cols: 7, rows: 7 }), 7)).toBe(HEART.join(' '));
  });

  it('samples the pattern at cell centres when the grid is smaller or wider', () => {
    expect(toFrameText(createFrameFromPattern(HEART, { cols: 3, rows: 3 }), 3)).toBe('111 111 010');
    expect(toFrameText(createFrameFromPattern(['01', '10'], { cols: 4, rows: 2 }), 4)).toBe('0011 1100');
  });
});

describe('getLinePoints', () => {
  it('walks a shallow line in both directions', () => {
    expect(getLinePoints([0, 0], [3, 1])).toEqual([
      [0, 0],
      [1, 0],
      [2, 1],
      [3, 1],
    ]);
    expect(getLinePoints([3, 1], [0, 0])).toEqual([
      [3, 1],
      [2, 1],
      [1, 0],
      [0, 0],
    ]);
  });

  it('walks vertical and steep lines and returns one point for a zero-length line', () => {
    expect(getLinePoints([1, 1], [1, 4])).toEqual([
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ]);
    expect(getLinePoints([0, 4], [2, 0])).toEqual([
      [0, 4],
      [1, 3],
      [1, 2],
      [2, 1],
      [2, 0],
    ]);
    expect(getLinePoints([2, 2], [2, 2])).toEqual([[2, 2]]);
  });
});

describe('getPerimeterPoints', () => {
  it('walks the edge clockwise from the top-left corner', () => {
    expect(getPerimeterPoints({ cols: 4, rows: 3 })).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
      [3, 2],
      [2, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ]);
  });
});

describe('wrapIndex', () => {
  it('wraps indexes into the range, including far negative ones', () => {
    expect(wrapIndex(5, 4)).toBe(1);
    expect(wrapIndex(-1, 4)).toBe(3);
    expect(wrapIndex(-17, 4)).toBe(3);
    expect(wrapIndex(0, 4)).toBe(0);
  });
});

describe('mergeRepeatedFrames', () => {
  it('joins runs of equal neighbours and adds their durations', () => {
    const on = [1, 0] as const;
    const off = [0, 0] as const;
    expect(
      mergeRepeatedFrames({ frames: [on, on, off, off, off, on], durations: [10, 20, 30, 40, 50, 60] }),
    ).toEqual({
      frames: [on, off, on],
      durations: [30, 120, 60],
    });
  });

  it('returns an empty output unchanged', () => {
    expect(mergeRepeatedFrames({ frames: [], durations: [] })).toEqual({ frames: [], durations: [] });
  });
});
