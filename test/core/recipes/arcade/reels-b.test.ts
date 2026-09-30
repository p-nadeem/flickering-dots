import { describe, expect, it } from 'vitest';

import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { allFrameTexts, gridsFrom, keyFrameTexts, summarize, toRows } from './arcade-b-checks';

const GRID: GridSize = { cols: 11, rows: 5 };
const MIN: GridSize = { cols: 11, rows: 3 };
const REEL_WIDTH = 3;
const REEL_PITCH = 4;
const REELS = 3;
const BLINK_MS = 250;

function play(variant: string, params: RecipeParams = {}, grid: GridSize = GRID) {
  return VARIANTS_B[variant](grid, { variant, ...params });
}

function reelLeft(grid: GridSize, reel: number): number {
  return Math.floor((grid.cols - (REEL_PITCH * (REELS - 1) + REEL_WIDTH)) / 2) + reel * REEL_PITCH;
}

function reelText(frame: Frame, grid: GridSize, reel: number): string {
  const left = reelLeft(grid, reel);
  return toRows(frame, grid.cols)
    .map((row) => row.slice(left, left + REEL_WIDTH))
    .join('|');
}

function reelTexts(frame: Frame, grid: GridSize): string[] {
  return Array.from({ length: REELS }, (_, reel) => reelText(frame, grid, reel));
}

function isRowLit(frame: Frame, grid: GridSize, y: number): boolean {
  return !toRows(frame, grid.cols)[y].includes('.');
}

describe('reels at 11x5', () => {
  it('pins the idle rest: three bars, the middle reel nudging a row for 200 ms every 2 s', () => {
    const output = play('reels-rest');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '...........|...........|###.###.###|...........|...........',
      '...........|...........|###.....###|....###....|...........',
    ]);
    expect(output.durations).toEqual([1800, 200]);
  });

  it('pins the thinking spin: 48 ticks of 40 ms, one reel stepping per tick', () => {
    const output = play('reels');
    expect(summarize(output)).toEqual({ frames: 48, totalMs: 1920, fingerprint: 'ee594b81' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 24, 46, 47])).toEqual({
      0: '...........|.....#.....|.#..###.###|#.#..#.....|.#.........',
      1: '.....#.....|...........|.#...#..###|#.#.###....|.#...#.....',
      24: '.#.........|.........#.|.....#..#.#|###......#.|...........',
      46: '...........|.#...#..###|#.#.###....|.#...#.....|...........',
      47: '...........|.#...#.....|#.#.###.###|.#...#.....|...........',
    });
  });

  it('pins the generating loop: a staggered start, a staggered stop and a pause', () => {
    const output = play('reels-stagger');
    expect(summarize(output)).toEqual({ frames: 51, totalMs: 3720, fingerprint: '37f54a7d' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 25, 49, 50])).toEqual({
      0: '...........|.#.........|###.###..#.|.#.........|...........',
      1: '.#.........|...........|.#..###..#.|###........|.#.........',
      25: '........###|###..#...#.|....#.#....|.....#.....|........###',
      49: '.....#.....|.#.........|###........|.#..###..#.|...........',
      50: '...........|.#.........|###.###....|.#.......#.|...........',
    });
  });

  it('pins the win: stops left to right on three pluses, then the payline lights twice', () => {
    const output = play('reels-win');
    expect(summarize(output)).toEqual({ frames: 34, totalMs: 4460, fingerprint: '089ad4d4' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 17, 32, 33])).toEqual({
      0: '###........|.....#.....|.........#.|........#.#|.#...#...#.',
      1: '###........|...........|.....#...#.|........#.#|.#.......#.',
      17: '.#..###....|###..#..###|.#.........|...........|....###....',
      32: '###########|.#...#...#.|###.###.###|.#...#...#.|###########',
      33: '...........|.#...#...#.|###.###.###|.#...#...#.|...........',
    });
  });

  it('pins the loss: two pluses and a dot, then all three droop a row', () => {
    const output = play('reels-lose');
    expect(summarize(output)).toEqual({ frames: 31, totalMs: 3960, fingerprint: 'f8daca4c' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 15, 29, 30])).toEqual({
      0: '###......#.|.....#.....|...........|........###|.#...#.....',
      1: '###......#.|...........|.....#.....|........###|.#.........',
      15: '.#...#..#.#|###......#.|.#.........|....###..#.|........###',
      29: '...........|.#...#.....|###.###..#.|.#...#.....|...........',
      30: '...........|...........|.#...#.....|###.###..#.|.#...#.....',
    });
  });
});

describe('reels on every grid from 11x3 to 16x16', () => {
  it('moves at most one reel from one spinning frame to the next', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames } = play('reels', {}, grid);
      frames.forEach((frame, index) => {
        const next = frames[(index + 1) % frames.length];
        const moved = reelTexts(frame, grid).filter((text, reel) => text !== reelText(next, grid, reel));
        expect(moved.length).toBeLessThanOrEqual(1);
      });
    });
  });

  it('lands the win on three matching reels and lights the top and bottom rows twice', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames, durations } = play('reels-win', {}, grid);
      const [first, ...rest] = reelTexts(frames[frames.length - 1], grid);
      expect(rest).toEqual([first, first]);
      const lit = frames.map((frame) => isRowLit(frame, grid, 0) && isRowLit(frame, grid, grid.rows - 1));
      expect(lit.filter(Boolean)).toHaveLength(2);
      expect(durations.filter((_, index) => lit[index])).toEqual([BLINK_MS, BLINK_MS]);
    });
  });

  it('lands the loss with the third reel off, then droops only the landed symbols one row', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames } = play('reels-lose', {}, grid);
      const settled = frames[frames.length - 2];
      const [first, second, third] = reelTexts(settled, grid);
      expect(second).toBe(first);
      expect(third).not.toBe(first);
      const drooped = toRows(frames[frames.length - 1], grid.cols);
      const payline = Math.floor((grid.rows - 3) / 2);
      const symbols = toRows(settled, grid.cols).slice(payline, payline + 3);
      const blank = '.'.repeat(grid.cols);
      expect(drooped).toEqual(Array.from({ length: grid.rows }, (_, y) => symbols[y - payline - 1] ?? blank));
    });
  });
});
