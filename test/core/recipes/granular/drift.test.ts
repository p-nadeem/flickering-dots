import { describe, expect, it } from 'vitest';

import { generateGranular } from '../../../../src/core/recipes/granular';
import { slump } from '../../../../src/core/recipes/granular/drift';
import { getDriftProfile } from '../../../../src/core/recipes/granular/drift-profile';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, toFrameText } from '../frame-text';
import { gridsFrom, hashFrames, labelGrids } from './checks';

const SET_GRID: GridSize = { cols: 12, rows: 9 };
const GRIDS = gridsFrom(7, 7);
const TICK_MS = 70;
const MELT_RATIO = 0.4;

function bottomRow(frame: Frame, { cols, rows }: GridSize): string {
  return toFrameText(frame.slice((rows - 1) * cols), cols);
}

function flakeCount(grid: GridSize, density = 1): number {
  return Math.max(1, Math.round((density * grid.cols) / 2));
}

describe('slump', () => {
  it('moves one unit from a column two or more above its neighbour', () => {
    expect(slump([3, 1])).toEqual([2, 2]);
    expect(slump([0, 2])).toEqual([1, 1]);
    expect(slump([0, 0, 4])).toEqual([0, 1, 3]);
    expect(slump([1, 2, 1])).toEqual([1, 2, 1]);
  });

  it('returns a new array and leaves the input alone', () => {
    const heights = [4, 0];
    expect(slump(heights)).not.toBe(heights);
    expect(heights).toEqual([4, 0]);
  });
});

describe('granular drift', () => {
  it('bakes one grow-and-melt cycle at the set grid at 70 ms a tick', () => {
    const { frames, durations, still } = generateGranular(SET_GRID, { variant: 'drift' });
    expect(frames).toHaveLength(180);
    expect(durations.every((ms) => ms === TICK_MS)).toBe(true);
    expect(still).toBe(136);
    expect(toFrameText(frames[136], SET_GRID.cols)).toBe(
      '000100000000 001000000000 000000000000 000000010000 000000000000 111110010110 111111111111 111111111111 111111111111',
    );
    expect(hashFrames(frames)).toBe('1b47ea16');
  });

  it.each(labelGrids(GRIDS))('grows to 40 percent before melting on %s', (_, grid) => {
    const { frames, still } = generateGranular(grid, { variant: 'drift' });
    expect(still).toBeDefined();
    const peak = countLit(frames[still ?? 0]) - flakeCount(grid);
    expect(peak).toBeGreaterThanOrEqual(Math.floor(MELT_RATIO * grid.rows * grid.cols) - grid.cols);
  });

  it.each(labelGrids(GRIDS))('melts away to bare flakes by the end of the loop on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'drift' });
    expect(countLit(frames[frames.length - 1])).toBeLessThanOrEqual(flakeCount(grid));
  });

  it('builds a lumpy drift, not only whole rows', () => {
    const { frames } = generateGranular(SET_GRID, { variant: 'drift' });
    const rows = frames.map((frame) => bottomRow(frame, SET_GRID));
    expect(
      rows.some((row) => row !== '000000000000' && row !== '111111111111' && row.split('1').length > 3),
    ).toBe(true);
  });

  it.each(labelGrids(GRIDS))('keeps idle to a few slow flakes with no drift on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'drift', density: 0.2 });
    expect(frames.every((frame) => countLit(frame) <= flakeCount(grid, 0.2))).toBe(true);
  });

  it('pins the idle loop at the set grid', () => {
    const { frames } = generateGranular(SET_GRID, { variant: 'drift', density: 0.2 });
    expect(frames).toHaveLength(90);
    expect(hashFrames(frames)).toBe('1ca62e74');
  });

  it('changes the flakes with the seed', () => {
    const one = generateGranular(SET_GRID, { variant: 'drift', seed: 1 });
    const two = generateGranular(SET_GRID, { variant: 'drift', seed: 2 });
    expect(hashFrames(one.frames)).not.toBe(hashFrames(two.frames));
  });
});

describe('getDriftProfile', () => {
  it('is empty at 0, flat at the ceiling at 1 and within bounds between', () => {
    expect(getDriftProfile(SET_GRID, 11, 0)).toEqual(Array.from({ length: 12 }, () => 0));
    expect(getDriftProfile(SET_GRID, 11, 1)).toEqual(Array.from({ length: 12 }, () => 7));
    expect(getDriftProfile(SET_GRID, 11, 0.5).every((height) => height >= 2 && height <= 5)).toBe(true);
  });
});
