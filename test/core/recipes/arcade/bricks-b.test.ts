import { describe, expect, it } from 'vitest';

import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import { generateCheck } from '../../../../src/core/recipes/check';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { allFrameTexts, countLit, gridsFrom, keyFrameTexts, summarize, toRows } from './arcade-b-checks';

const GRID: GridSize = { cols: 9, rows: 9 };
const MIN: GridSize = { cols: 7, rows: 7 };
const TALL_WALL_ROWS = 8;
const PADDLE = '###';

function play(variant: string, params: RecipeParams = {}, grid: GridSize = GRID) {
  return VARIANTS_B[variant](grid, { variant, ...params });
}

function wallRows(grid: GridSize): number {
  return grid.rows >= TALL_WALL_ROWS ? 2 : 1;
}

function wallLit(frame: Frame, grid: GridSize): number {
  return countLit(frame.slice(0, wallRows(grid) * grid.cols));
}

function bottomRow(frame: Frame, grid: GridSize): string {
  return toRows(frame, grid.cols)[grid.rows - 1];
}

describe('brick wall at 9x9', () => {
  it('pins the idle drift: the ball rides the paddle one column every 700 ms', () => {
    const output = play('bricks-rest');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '#########|#########|.........|.........|.........|.........|.........|....#....|...###...',
      '#########|#########|.........|.........|.........|.........|.........|.....#...|....###..',
      '#########|#########|.........|.........|.........|.........|.........|....#....|...###...',
      '#########|#########|.........|.........|.........|.........|.........|...#.....|..###....',
    ]);
    expect(output.durations).toEqual([700, 700, 700, 700]);
  });

  it('pins the thinking rally: 72 frames at 70 ms, wall cleared, caught, carried and rebuilt', () => {
    const output = play('bricks');
    expect(summarize(output)).toEqual({ frames: 72, totalMs: 5040, fingerprint: 'd1318a25' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 36, 70, 71])).toEqual({
      0: '#########|#########|.........|.........|.........|.........|.........|....#....|...###...',
      1: '#########|#########|.........|.........|.........|.........|.....#...|.........|....###..',
      36: '#########|........#|.........|.........|.........|.........|.........|.........|......###',
      70: '.........|#########|.........|.........|.........|.........|.........|....#....|...###...',
      71: '######...|#########|.........|.........|.........|.........|.........|....#....|...###...',
    });
  });

  it('pins the progress sweep, one brick every 560 ms from the left', () => {
    const output = play('bricks-progress');
    expect(summarize(output)).toEqual({ frames: 64, totalMs: 4480, fingerprint: '08556f00' });
    expect(keyFrameTexts(output, GRID.cols, [0, 1, 32, 62, 63])).toEqual({
      0: '#########|#########|.........|.........|.........|.........|.........|....#....|...###...',
      1: '#########|#########|.........|.........|.........|.........|.....#...|.........|....###..',
      32: '......###|......###|.........|.........|.........|.........|.........|....#....|...###...',
      62: '.........|#########|.........|.........|.........|..#......|.........|.........|.###.....',
      63: '######...|#########|.........|.........|.........|.........|...#.....|.........|..###....',
    });
  });

  it('pins the progress fixed at half by density', () => {
    const output = play('bricks-progress', { density: 0.5 });
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '...######|......###|.........|.........|.........|.........|.........|....#....|...###...',
      '...######|......###|.........|.........|.........|.........|.....#...|.........|....###..',
      '...######|......###|.........|.........|.........|......#..|.........|.........|.....###.',
      '...######|......###|.........|.........|.......#.|.........|.........|.........|......###',
      '...######|......###|.........|........#|.........|.........|.........|.........|......###',
      '...######|......###|.........|.........|.......#.|.........|.........|.........|......###',
      '...######|......###|.........|.........|.........|......#..|.........|.........|.....###.',
      '...######|......###|.........|.........|.........|.........|.....#...|.........|....###..',
      '...######|......###|.........|.........|.........|.........|.........|....#....|...###...',
      '...######|......###|.........|.........|.........|.........|...#.....|.........|..###....',
      '...######|......###|.........|.........|.........|..#......|.........|.........|.###.....',
      '...######|......###|.........|.........|.#.......|.........|.........|.........|###......',
      '...######|......###|.........|#........|.........|.........|.........|.........|###......',
      '...######|......###|.........|.........|.#.......|.........|.........|.........|###......',
      '...######|......###|.........|.........|.........|..#......|.........|.........|.###.....',
      '...######|......###|.........|.........|.........|.........|...#.....|.........|..###....',
    ]);
    expect(output.durations).toEqual([70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70]);
  });

  it('pins the clear: the last brick pops, the ball flies off, the paddle holds, then the tick', () => {
    const output = play('bricks-clear');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '.........|......###|.........|.........|.........|.........|.........|....#....|...###...',
      '.........|......###|.........|.........|.........|.........|.....#...|.........|....###..',
      '.........|......###|.........|.........|.........|......#..|.........|.........|.....###.',
      '.........|......###|.........|.........|.......#.|.........|.........|.........|......###',
      '.........|......###|.........|........#|.........|.........|.........|.........|......###',
      '.........|......###|.......#.|.........|.........|.........|.........|.........|......###',
      '.........|......#..|.........|.........|.........|.........|.........|.........|.....###.',
      '.....#...|.........|.........|.........|.........|.........|.........|.........|....###..',
      '.........|.........|.........|.........|.........|.........|.........|.........|....###..',
      '.........|.........|.........|.........|.........|.........|.........|.........|.........',
      '.........|.........|.........|.........|.#.......|.........|.........|.........|.........',
      '.........|.........|.........|.........|.#.......|..#......|.........|.........|.........',
      '.........|.........|.........|.........|.#.......|..#......|...#.....|.........|.........',
      '.........|.........|.........|.........|.#.......|..#.#....|...#.....|.........|.........',
      '.........|.........|.........|.........|.#...#...|..#.#....|...#.....|.........|.........',
      '.........|.........|.........|......#..|.#...#...|..#.#....|...#.....|.........|.........',
      '.........|.........|.......#.|......#..|.#...#...|..#.#....|...#.....|.........|.........',
    ]);
    expect(output.durations).toEqual([70, 70, 70, 70, 70, 70, 70, 70, 500, 80, 45, 45, 45, 45, 45, 45, 1500]);
  });

  it('pins the miss: the ball drops past a late paddle, which blinks twice under the wall', () => {
    const output = play('bricks-miss');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '#########|#########|..#......|.........|.........|.........|.........|.........|###......',
      '#########|#########|.........|...#.....|.........|.........|.........|.........|###......',
      '#########|#########|.........|.........|....#....|.........|.........|.........|.###.....',
      '#########|#########|.........|.........|.........|.....#...|.........|.........|.###.....',
      '#########|#########|.........|.........|.........|.........|......#..|.........|..###....',
      '#########|#########|.........|.........|.........|.........|.........|.......#.|..###....',
      '#########|#########|.........|.........|.........|.........|.........|.........|...###..#',
      '#########|#########|.........|.........|.........|.........|.........|.........|...###...',
      '#########|#########|.........|.........|.........|.........|.........|.........|.........',
      '#########|#########|.........|.........|.........|.........|.........|.........|...###...',
      '#########|#########|.........|.........|.........|.........|.........|.........|.........',
      '#########|#########|.........|.........|.........|.........|.........|.........|...###...',
    ]);
    expect(output.durations).toEqual([70, 70, 70, 70, 70, 70, 70, 70, 250, 250, 250, 1500]);
  });
});

describe('brick wall on every grid from 7x7 to 16x16', () => {
  it('clears the whole wall and rebuilds it in rising steps before the next serve', () => {
    gridsFrom(MIN).forEach((grid) => {
      const walls = play('bricks', {}, grid).frames.map((frame) => wallLit(frame, grid));
      const full = wallRows(grid) * grid.cols;
      const rebuild = walls.slice(-3);
      expect({ grid, first: walls[0], hasEmpty: walls.includes(0) }).toEqual({
        grid,
        first: full,
        hasEmpty: true,
      });
      expect(rebuild.every((lit, index) => lit < full && (index === 0 || lit > rebuild[index - 1]))).toBe(
        true,
      );
    });
  });

  it('keeps a 3-dot paddle alone on the bottom row in the rally, idle and progress loops', () => {
    gridsFrom(MIN).forEach((grid) => {
      ['bricks', 'bricks-rest', 'bricks-progress'].forEach((variant) => {
        play(variant, {}, grid).frames.forEach((frame) => {
          expect(bottomRow(frame, grid).replace(/\./g, '')).toBe(PADDLE);
          expect(bottomRow(frame, grid)).toContain(PADDLE);
        });
      });
    });
  });

  it('stands round((1 - p) * N) bricks when density fixes the progress', () => {
    const cellsPerBrick = 3;
    const bricks = 6;
    [0, 0.25, 0.5, 1].forEach((density) => {
      const expected = Math.round((1 - density) * bricks) * cellsPerBrick;
      play('bricks-progress', { density }).frames.forEach((frame) =>
        expect(wallLit(frame, GRID)).toBe(expected),
      );
    });
  });

  it('ends the clear on the tick after the paddle holds alone', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames } = play('bricks-clear', {}, grid);
      const tick = generateCheck(grid).frames;
      expect(frames[frames.length - 1]).toEqual(tick[tick.length - 1]);
      const paddleOnly = frames.find((frame) => countLit(frame) === PADDLE.length);
      expect(paddleOnly && bottomRow(paddleOnly, grid)).toContain(PADDLE);
    });
  });

  it('keeps the whole wall through the miss and ends on the paddle after two blinks', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames, durations } = play('bricks-miss', {}, grid);
      const full = wallRows(grid) * grid.cols;
      frames.forEach((frame) => expect(wallLit(frame, grid)).toBe(full));
      const last = frames.slice(-4).map((frame) => bottomRow(frame, grid).includes(PADDLE));
      expect(last).toEqual([false, true, false, true]);
      expect(durations.slice(-4, -1)).toEqual([250, 250, 250]);
    });
  });
});
