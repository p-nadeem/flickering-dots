import { describe, expect, it } from 'vitest';

import { generateGrow } from '../../../../src/core/recipes/grow';
import { buildDla, crystalAt, fillTarget } from '../../../../src/core/recipes/grow/dla-model';
import type { Frame, GridSize } from '../../../../src/core/types';

import {
  changedCells,
  digest,
  framesText,
  gridName,
  isBlank,
  isFourConnected,
  litCount,
  squareGrids,
} from './grow-checks';

const SET_GRID = { cols: 11, rows: 11 };
const GRIDS: GridSize[] = [
  ...squareGrids(9),
  { cols: 13, rows: 9 },
  { cols: 9, rows: 12 },
  { cols: 16, rows: 11 },
];
const SHATTER_CAP = 0.15;

function isMirrored(frame: Frame, { cols, rows }: GridSize): boolean {
  return frame.every((bit, cell) => {
    const [x, y] = [cell % cols, Math.floor(cell / cols)];
    return bit === frame[y * cols + cols - 1 - x] && bit === frame[(rows - 1 - y) * cols + x];
  });
}

function isSubset(inner: Frame, outer: Frame): boolean {
  return inner.every((bit, cell) => bit === 0 || outer[cell] === 1);
}

describe('grow dla', () => {
  it('pins the frost thinking loop and its moments on 11x11', () => {
    expect(digest(generateGrow(SET_GRID, { variant: 'dla' }))).toBe('375 frames, 17320 ms, 263f0801');
    expect(digest(generateGrow(SET_GRID, { variant: 'dla-progress' }))).toBe('40 frames, 3640 ms, 2e5f153');
    expect(digest(generateGrow(SET_GRID, { variant: 'dla-tips' }))).toBe('29 frames, 3440 ms, 39699879');
    expect(digest(generateGrow(SET_GRID, { variant: 'dla-shatter' }))).toBe('29 frames, 3220 ms, 4378fe1');
    expect(framesText(generateGrow(SET_GRID, { variant: 'dla-rest' }), 11)).toEqual([
      [
        '..##...##..',
        '..#.#.#.#..',
        '.####.####.',
        '....#.#....',
        '....###....',
        '.....#.....',
        '....###....',
        '....#.#....',
        '.####.####.',
        '..#.#.#.#..',
        '..##...##..',
      ],
    ]);
  });

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'grows a connected crystal mirrored four ways up to the fill target on %s',
    (_name, grid) => {
      [1, 2, 3, 4].forEach((seed) => {
        const model = buildDla(grid, seed, 0.35);
        const [frame] = generateGrow(grid, { variant: 'dla-rest', seed }).frames;
        expect(isMirrored(frame, grid)).toBe(true);
        expect(isFourConnected(frame, grid.cols)).toBe(true);
        expect(litCount(frame)).toBeGreaterThanOrEqual(fillTarget(grid, 0.35));
        expect(crystalAt(grid, model, model.walks.length).size).toBe(litCount(frame));
      });
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'moves the walkers one cell per 30 ms frame and shows at most twelve steps of each walk on %s',
    (_name, grid) => {
      const model = buildDla(grid, 1, 0.35);
      const { frames, durations } = generateGrow(grid, { variant: 'dla' });
      const shown = model.walks.map(({ steps }) => (steps > 12 ? 6 : steps));
      const walking = 1 + shown.reduce((sum, count) => sum + count, 0);
      expect(durations.slice(0, walking - 1).every((ms) => ms === 30)).toBe(true);
      frames.slice(1, walking).forEach((frame, index) => {
        expect(changedCells(frames[index], frame)).toBeLessThanOrEqual(8);
      });
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'shatters the crystal downward at 60 ms, changing at most 15 percent of the grid a frame, and ends dark on %s',
    (_name, grid) => {
      const { frames, durations } = generateGrow(grid, { variant: 'dla-shatter' });
      const cap = Math.max(2, Math.floor(SHATTER_CAP * grid.cols * grid.rows)) + 2;
      frames
        .slice(1)
        .forEach((frame, index) => expect(changedCells(frames[index], frame)).toBeLessThanOrEqual(cap));
      expect(durations.slice(1, -1).every((ms) => ms === 60)).toBe(true);
      expect(isBlank(frames[frames.length - 1])).toBe(true);
      expect(frames.every((frame) => litCount(frame) <= litCount(frames[0]))).toBe(true);
    },
  );

  it('counts the stuck dots toward the target with the walker hidden', () => {
    const { frames } = generateGrow(SET_GRID, { variant: 'dla-progress' });
    const peak = frames.findIndex((frame) => litCount(frame) === Math.max(...frames.map(litCount)));
    frames.slice(1, peak + 1).forEach((frame, index) => expect(isSubset(frames[index], frame)).toBe(true));
    frames.slice(0, peak + 1).forEach((frame) => expect(isMirrored(frame, SET_GRID)).toBe(true));
    expect(isBlank(frames[frames.length - 1])).toBe(true);
  });

  it('blinks the branch tips off one at a time on success and ends on the whole crystal', () => {
    const { frames, durations } = generateGrow(SET_GRID, { variant: 'dla-tips' });
    const [crystal] = generateGrow(SET_GRID, { variant: 'dla-rest' }).frames;
    expect(frames[frames.length - 1]).toEqual(crystal);
    frames
      .slice(1)
      .forEach((frame, index) => expect(changedCells(frames[index], frame)).toBeLessThanOrEqual(4));
    expect(durations.slice(0, -1).every((ms) => ms === 80)).toBe(true);
  });

  it('fills to the density it is given', () => {
    expect(fillTarget(SET_GRID, 0)).toBe(2);
    expect(litCount(generateGrow(SET_GRID, { variant: 'dla-rest', density: 0.2 }).frames[0])).toBeLessThan(
      litCount(generateGrow(SET_GRID, { variant: 'dla-rest' }).frames[0]),
    );
  });
});
