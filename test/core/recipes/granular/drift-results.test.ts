import { describe, expect, it } from 'vitest';

import { generateGranular } from '../../../../src/core/recipes/granular';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, toFrameText } from '../frame-text';
import { gridsFrom, hashFrames, labelGrids } from './checks';

const SET_GRID: GridSize = { cols: 12, rows: 9 };
const GRIDS = gridsFrom(7, 7);
const BLIZZARD_MOTION_MS = 1500;

function solidBottom({ cols, rows }: GridSize): Frame {
  return Array.from({ length: cols * rows }, (_, index) => (index >= (rows - 1) * cols ? 1 : 0));
}

function isRowFull(frame: Frame, { cols }: GridSize, y: number): boolean {
  return frame.slice(y * cols, (y + 1) * cols).every((bit) => bit === 1);
}

describe('granular drift-progress', () => {
  it('rises with progress to all but the top two rows, then melts to nothing', () => {
    const { frames, durations } = generateGranular(SET_GRID, { variant: 'drift-progress' });
    expect(frames).toHaveLength(100);
    expect(durations.every((ms) => ms === 70)).toBe(true);
    expect(frames.some((frame) => isRowFull(frame, SET_GRID, 2))).toBe(true);
    expect(frames.some((frame) => isRowFull(frame, SET_GRID, 1))).toBe(false);
    expect(countLit(frames[0])).toBeLessThanOrEqual(6);
    expect(hashFrames(frames)).toBe('bbbed270');
  });
});

describe('granular drift-settle', () => {
  it('lets the last flakes land and levels into a solid bottom row that holds', () => {
    const { frames, durations } = generateGranular(SET_GRID, { variant: 'drift-settle' });
    expect(durations).toEqual([70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 140, 900]);
    expect(toFrameText(frames[0], SET_GRID.cols)).toBe(
      '000000000000 000000000000 000000000010 010000000000 000000000000 000000000010 101010010110 111111111111 111111111111',
    );
    expect(frames[frames.length - 1]).toEqual(solidBottom(SET_GRID));
    expect(hashFrames(frames)).toBe('10e43355');
  });

  it.each(labelGrids(GRIDS))('ends on one solid bottom row on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'drift-settle' });
    expect(frames[frames.length - 1]).toEqual(solidBottom(grid));
  });
});

describe('granular drift-blizzard', () => {
  it('blows diagonal flakes through for 1.5 s, then empties', () => {
    const { frames, durations } = generateGranular(SET_GRID, { variant: 'drift-blizzard' });
    expect(durations).toEqual([...Array.from({ length: 25 }, () => 60), 400]);
    expect(durations.slice(0, -1).reduce((a, b) => a + b, 0)).toBe(BLIZZARD_MOTION_MS);
    expect(hashFrames(frames)).toBe('2f45242d');
  });

  it.each(labelGrids(GRIDS))('settles nothing and ends empty on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'drift-blizzard' });
    expect(countLit(frames[frames.length - 1])).toBe(0);
    expect(frames.some((frame) => isRowFull(frame, grid, grid.rows - 1))).toBe(false);
  });

  it('moves every flake one row down and one column right each frame', () => {
    const { frames } = generateGranular(SET_GRID, { variant: 'drift-blizzard' });
    const heads = (frame: Frame) =>
      toFrameText(frame, SET_GRID.cols)
        .split(' ')
        .map((row) => row.indexOf('1'));
    expect(heads(frames[0])[0]).toBe(4);
    expect(heads(frames[1])[1]).toBe(5);
  });
});
