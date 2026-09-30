import { describe, expect, it } from 'vitest';

import { planCornerPath } from '../../../../src/core/recipes/arcade/corner-path';
import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { allFrameTexts, countLit, gridsFrom, keyFrameTexts, litCells, summarize } from './arcade-b-checks';

const GRID: GridSize = { cols: 10, rows: 8 };
const MIN: GridSize = { cols: 8, rows: 6 };
const HOLD_MS = 1500;

function play(variant: string, params: RecipeParams = {}, grid: GridSize = GRID) {
  return VARIANTS_B[variant](grid, { variant, ...params });
}

function blockCorner(frame: Frame, grid: GridSize): readonly [number, number] {
  const cells = litCells(frame, grid.cols);
  return [Math.min(...cells.map(([x]) => x)), Math.min(...cells.map(([, y]) => y))];
}

function cornerDistance(frame: Frame, grid: GridSize): number {
  const { rangeX, rangeY } = planCornerPath(grid);
  const [x, y] = blockCorner(frame, grid);
  return Math.min(x, rangeX - x) + Math.min(y, rangeY - y);
}

function isNearMissGrid(grid: GridSize): boolean {
  const { x0, y0 } = planCornerPath(grid);
  return x0 - y0 === 1;
}

describe('corner hit at 10x8', () => {
  it('pins the thinking bounce: a 2x2 block on a 48-frame loop at 110 ms', () => {
    const output = play('corner');
    expect(summarize(output)).toEqual({ frames: 48, totalMs: 5280, fingerprint: '22bfcb54' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 24, 46, 47])).toEqual({
      0: '.##.......|.##.......|..........|..........|..........|..........|..........|..........',
      1: '..........|..##......|..##......|..........|..........|..........|..........|..........',
      24: '.......##.|.......##.|..........|..........|..........|..........|..........|..........',
      46: '..........|..........|.##.......|.##.......|..........|..........|..........|..........',
      47: '..........|##........|##........|..........|..........|..........|..........|..........',
    });
  });

  it('pins the idle drift: the same path at 250 ms a step', () => {
    const output = play('corner-drift');
    expect(summarize(output)).toEqual({ frames: 48, totalMs: 12000, fingerprint: '2697da14' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 24, 46, 47])).toEqual({
      0: '.##.......|.##.......|..........|..........|..........|..........|..........|..........',
      1: '..........|..##......|..##......|..........|..........|..........|..........|..........',
      24: '.......##.|.......##.|..........|..........|..........|..........|..........|..........',
      46: '..........|..........|.##.......|.##.......|..........|..........|..........|..........',
      47: '..........|##........|##........|..........|..........|..........|..........|..........',
    });
  });

  it('pins the waiting blink: the block in the middle, on and off every 500 ms', () => {
    const output = play('corner-wait');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '..........|..........|..........|....##....|....##....|..........|..........|..........',
      '..........|..........|..........|..........|..........|..........|..........|..........',
    ]);
    expect(output.durations).toEqual([500, 500]);
  });

  it('pins the hit: into the corner, three square rings, one full flash, then a hold', () => {
    const output = play('corner-hit');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '..........|..........|..##......|..##......|..........|..........|..........|..........',
      '..........|...##.....|...##.....|..........|..........|..........|..........|..........',
      '....##....|....##....|..........|..........|..........|..........|..........|..........',
      '..........|.....##...|.....##...|..........|..........|..........|..........|..........',
      '..........|..........|......##..|......##..|..........|..........|..........|..........',
      '..........|..........|..........|.......##.|.......##.|..........|..........|..........',
      '..........|..........|..........|..........|........##|........##|..........|..........',
      '..........|..........|..........|..........|..........|.......##.|.......##.|..........',
      '..........|..........|..........|..........|..........|..........|......##..|......##..',
      '..........|..........|..........|..........|..........|.....##...|.....##...|..........',
      '..........|..........|..........|..........|....##....|....##....|..........|..........',
      '..........|..........|..........|...##.....|...##.....|..........|..........|..........',
      '..........|..........|..##......|..##......|..........|..........|..........|..........',
      '..........|.##.......|.##.......|..........|..........|..........|..........|..........',
      '##........|##........|..........|..........|..........|..........|..........|..........',
      '##.#......|##.#......|...#......|####......|..........|..........|..........|..........',
      '##.#.#....|##.#.#....|...#.#....|####.#....|.....#....|######....|..........|..........',
      '##.#.#.#..|##.#.#.#..|...#.#.#..|####.#.#..|.....#.#..|######.#..|.......#..|########..',
      '##########|##########|##########|##########|##########|##########|##########|##########',
      '##........|##........|..........|..........|..........|..........|..........|..........',
    ]);
    expect(output.durations).toEqual([
      110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 70, 70, 70, 170, 1500,
    ]);
  });

  it('pins the near miss: one dot short of the top-right corner, then two shakes', () => {
    const output = play('corner-near');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '..........|..........|..........|......##..|......##..|..........|..........|..........',
      '..........|..........|.....##...|.....##...|..........|..........|..........|..........',
      '..........|....##....|....##....|..........|..........|..........|..........|..........',
      '...##.....|...##.....|..........|..........|..........|..........|..........|..........',
      '..........|..##......|..##......|..........|..........|..........|..........|..........',
      '..........|..........|.##.......|.##.......|..........|..........|..........|..........',
      '..........|..........|..........|##........|##........|..........|..........|..........',
      '..........|..........|..........|..........|.##.......|.##.......|..........|..........',
      '..........|..........|..........|..........|..........|..##......|..##......|..........',
      '..........|..........|..........|..........|..........|..........|...##.....|...##.....',
      '..........|..........|..........|..........|..........|....##....|....##....|..........',
      '..........|..........|..........|..........|.....##...|.....##...|..........|..........',
      '..........|..........|..........|......##..|......##..|..........|..........|..........',
      '..........|..........|.......##.|.......##.|..........|..........|..........|..........',
      '..........|.......##.|.......##.|..........|..........|..........|..........|..........',
      '..........|........##|........##|..........|..........|..........|..........|..........',
      '..........|.......##.|.......##.|..........|..........|..........|..........|..........',
      '..........|........##|........##|..........|..........|..........|..........|..........',
    ]);
    expect(output.durations).toEqual([
      110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 80, 80, 80, 1500,
    ]);
  });

  it('uses a 3x3 block on 9x7, where a 2x2 block would always hit a corner', () => {
    expect(planCornerPath({ cols: 9, rows: 7 })).toMatchObject({ w: 3, h: 3, rangeX: 6, rangeY: 4 });
  });
});

describe('corner hit on every grid from 8x6 to 16x16', () => {
  it('never reaches a corner while thinking, and misses one by a single dot where the ranges allow', () => {
    gridsFrom(MIN).forEach((grid) => {
      const distances = play('corner', {}, grid).frames.map((frame) => cornerDistance(frame, grid));
      const closest = Math.min(...distances);
      expect({ grid, closest }).toEqual({ grid, closest: isNearMissGrid(grid) ? 1 : Math.max(closest, 1) });
    });
  });

  it('lands in the top-left corner, flashes the whole grid exactly once and holds there', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames, durations } = play('corner-hit', {}, grid);
      const flashes = frames.filter((frame) => countLit(frame) === grid.cols * grid.rows);
      expect(flashes).toHaveLength(1);
      expect(blockCorner(frames[frames.length - 1], grid)).toEqual([0, 0]);
      expect(durations[durations.length - 1]).toBe(HOLD_MS);
    });
  });

  it('ends the near miss against a wall one dot short of a corner', () => {
    gridsFrom(MIN)
      .filter(isNearMissGrid)
      .forEach((grid) => {
        const { frames } = play('corner-near', {}, grid);
        expect(cornerDistance(frames[frames.length - 1], grid)).toBe(1);
      });
  });
});
