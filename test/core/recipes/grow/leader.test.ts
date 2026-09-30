import { describe, expect, it } from 'vitest';

import { generateGrow } from '../../../../src/core/recipes/grow';
import { buildLeader } from '../../../../src/core/recipes/grow/leader-model';
import type { GridSize } from '../../../../src/core/types';

import {
  cellsOf,
  changedCells,
  digest,
  framesText,
  gridName,
  isBlank,
  isEightConnected,
  litCount,
} from './grow-checks';

const SET_GRID = { cols: 9, rows: 13 };
const GRIDS: GridSize[] = [
  { cols: 5, rows: 7 },
  { cols: 7, rows: 9 },
  SET_GRID,
  { cols: 11, rows: 11 },
  { cols: 16, rows: 9 },
  { cols: 16, rows: 16 },
];
const SEEDS = [1, 2, 3, 4, 5, 6];
const PATH_SHARE = 0.2;

describe('grow leader', () => {
  it('pins the lightning thinking loop and its moments on 9x13', () => {
    expect(digest(generateGrow(SET_GRID, { variant: 'leader' }))).toBe('44 frames, 2720 ms, e3bcde1c');
    expect(digest(generateGrow(SET_GRID, { variant: 'leader-crackle' }))).toBe(
      '12 frames, 8000 ms, 92f4520d',
    );
    expect(digest(generateGrow(SET_GRID, { variant: 'leader-strike-out' }))).toBe(
      '17 frames, 1560 ms, e4ce6c88',
    );
    const strike = generateGrow(SET_GRID, { variant: 'leader-strike' });
    expect(digest(strike)).toBe('15 frames, 1880 ms, bc050232');
    expect(framesText(strike, 9).at(-1)).toEqual([
      '...#.....',
      '....#....',
      '...#.....',
      '..#......',
      '..#......',
      '.#.......',
      '..#......',
      '..#......',
      '.#.......',
      '#........',
      '#........',
      '#........',
      '#########',
    ]);
  });

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'steps the main channel down one row at a time from the middle third, with diagonal side forks, on %s',
    (_name, grid) => {
      SEEDS.forEach((seed) => {
        const { main, branches } = buildLeader(grid, seed);
        expect(main.map(([, y]) => y)).toEqual(Array.from({ length: grid.rows }, (_, y) => y));
        expect(main[0][0]).toBeGreaterThanOrEqual(Math.floor(grid.cols / 3));
        expect(main[0][0]).toBeLessThanOrEqual(grid.cols - 1 - Math.floor(grid.cols / 3));
        main.slice(1).forEach(([x], index) => expect(Math.abs(x - main[index][0])).toBeLessThanOrEqual(1));
        branches.forEach((branch) => {
          const [bx, by] = branch[0];
          const [fx] = main[by - 1];
          expect(Math.abs(bx - fx)).toBe(1);
          expect(branch.length).toBeLessThanOrEqual(4);
          branch.slice(1).forEach(([x, y], index) => {
            expect(y - branch[index][1]).toBe(1);
            expect(x - branch[index][0]).toBe(bx - fx);
          });
        });
      });
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'reveals a row per 40 ms, stops at 60 percent height and fades out over three frames on %s',
    (_name, grid) => {
      const { frames, durations } = generateGrow(grid, { variant: 'leader' });
      const lastRow = Math.round(0.6 * grid.rows) - 1;
      frames.forEach((frame) => expect(cellsOf(frame, grid.cols).every(([, y]) => y <= lastRow)).toBe(true));
      const episode = lastRow + 1 + 3;
      expect(durations.slice(0, episode)).toEqual([
        ...Array.from({ length: lastRow + 1 }, () => 40),
        60,
        60,
        240,
      ]);
      frames.slice(0, lastRow + 1).forEach((frame) => expect(isEightConnected(frame, grid.cols)).toBe(true));
      frames
        .slice(lastRow + 1, episode)
        .forEach((frame, index) =>
          expect(litCount(frame)).toBeLessThanOrEqual(litCount(frames[lastRow + index])),
        );
      expect(isBlank(frames[episode - 1])).toBe(true);
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'strikes the ground and lights the ground row on success on %s',
    (_name, grid) => {
      const { main } = buildLeader(grid, 1);
      const { frames, durations } = generateGrow(grid, { variant: 'leader-strike' });
      const channel = new Set(main.map(([x, y]) => y * grid.cols + x));
      const returnStroke = frames[frames.length - 2];
      expect(returnStroke.every((bit, cell) => (bit === 1) === channel.has(cell))).toBe(true);
      expect(framesText({ frames, durations }, grid.cols).at(-1)?.at(-1)).toBe('#'.repeat(grid.cols));
      expect(durations.slice(-2)).toEqual([160, 1200]);
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'flickers the strike on, off and on, then goes dark on error on %s',
    (_name, grid) => {
      const { frames, durations } = generateGrow(grid, { variant: 'leader-strike-out' });
      expect(durations.slice(-4)).toEqual([80, 80, 80, 800]);
      expect(isBlank(frames[frames.length - 3])).toBe(true);
      expect(isBlank(frames[frames.length - 1])).toBe(true);
      expect(frames[frames.length - 4]).toEqual(frames[frames.length - 2]);
    },
  );

  it('changes only path cells on the 9x13 strike, under 20 percent of the grid a frame', () => {
    ['leader', 'leader-strike', 'leader-strike-out'].forEach((variant) => {
      const { frames } = generateGrow(SET_GRID, { variant });
      frames
        .slice(1)
        .forEach((frame, index) =>
          expect(changedCells(frames[index], frame)).toBeLessThan(PATH_SHARE * SET_GRID.cols * SET_GRID.rows),
        );
    });
  });

  it('crackles one or two two-dot sparks at the top every 2 s', () => {
    const { frames, durations } = generateGrow(SET_GRID, { variant: 'leader-crackle' });
    expect(durations.reduce((sum, ms) => sum + ms, 0)).toBe(8000);
    frames
      .filter((frame) => !isBlank(frame))
      .forEach((frame) => {
        const cells = cellsOf(frame, SET_GRID.cols);
        expect(cells).toHaveLength(2);
        expect(cells.map(([, y]) => y)).toEqual([0, 1]);
        expect(isEightConnected(frame, SET_GRID.cols)).toBe(true);
      });
  });
});
