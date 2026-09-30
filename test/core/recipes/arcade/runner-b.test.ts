import { describe, expect, it } from 'vitest';

import { runLoopFrames, runScene } from '../../../../src/core/recipes/arcade/runner';
import { planRunner } from '../../../../src/core/recipes/arcade/runner-scene';
import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { Point } from '../../../../src/core/recipes/helpers';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import { allFrameTexts, countChanged, gridsFrom, litCells } from './arcade-b-checks';

const GRID: GridSize = { cols: 12, rows: 6 };
const MIN: GridSize = { cols: 8, rows: 5 };
const RUN_MS = 90;
const MIN_POST_SPACING = 12;

function play(variant: string, params: RecipeParams = {}, grid: GridSize = GRID) {
  return VARIANTS_B[variant](grid, { variant, ...params });
}

function isSameCell([ax, ay]: Point, [bx, by]: Point): boolean {
  return ax === bx && ay === by;
}

describe('hurdle runner at 12x6', () => {
  it('pins the idle stand: the head dot blinks off for 200 ms every 2 s', () => {
    const output = play('run-stand');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '............|............|..#.........|.###........|.#.#........|.######.####',
      '............|............|............|.###........|.#.#........|.######.####',
    ]);
    expect(output.durations).toEqual([1800, 200]);
  });

  it('pins the thinking loop: a post every 12 columns and a clean hop at 90 ms', () => {
    const output = play('run');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '............|............|..#.........|.##........#|.#.........#|.######.####',
      '............|............|..#.........|.##.......#.|.#........#.|######.####.',
      '............|............|..#.........|.##......#..|.#.......#..|#####.####.#',
      '............|............|..#.........|.##.....#...|..#.....#...|####.####.##',
      '............|............|..#.........|.##....#....|..#....#....|###.####.###',
      '............|............|..#.........|.##...#.....|..#...#.....|##.####.####',
      '............|............|..#.........|.##..#......|.#...#......|#.####.#####',
      '............|............|..#.........|.##.#.......|.#..#.......|.####.######',
      '............|..#.........|.##.........|.###........|...#........|####.######.',
      '..#.........|.##.........|.##.........|..#.........|..#.........|###.######.#',
      '..#.........|.##.........|.##.........|.#..........|.#..........|##.######.##',
      '............|..#.........|.##.........|###.........|#...........|#.######.###',
    ]);
    expect(output.durations).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]);
  });

  it('pins the offline loop with no posts', () => {
    const output = play('run-empty');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '............|............|..#.........|.##.........|.#..........|.######.####',
      '............|............|..#.........|.##.........|.#..........|######.####.',
      '............|............|..#.........|.##.........|.#..........|#####.####.#',
      '............|............|..#.........|.##.........|..#.........|####.####.##',
      '............|............|..#.........|.##.........|..#.........|###.####.###',
      '............|............|..#.........|.##.........|..#.........|##.####.####',
      '............|............|..#.........|.##.........|.#..........|#.####.#####',
      '............|............|..#.........|.##.........|.#..........|.####.######',
      '............|............|..#.........|.##.........|.#..........|####.######.',
      '............|............|..#.........|.##.........|..#.........|###.######.#',
      '............|............|..#.........|.##.........|..#.........|##.######.##',
      '............|............|..#.........|.##.........|..#.........|#.######.###',
    ]);
    expect(output.durations).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90]);
  });

  it('pins the finish: the flag scrolls in and stops beside the runner', () => {
    const output = play('run-finish');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '............|...........#|..#........#|.##........#|.#.........#|.######.####',
      '............|..........##|..#.......##|.##.......#.|.#........#.|######.####.',
      '............|.........###|..#......###|.##......#..|.#.......#..|#####.####.#',
      '............|........###.|..#.....###.|.##.....#...|..#.....#...|####.####.##',
      '............|.......###..|..#....###..|.##....#....|..#....#....|###.####.###',
      '............|......###...|..#...###...|.##...#.....|..#...#.....|##.####.####',
      '............|.....###....|..#..###....|.##..#......|.#...#......|#.####.#####',
      '............|.....###....|..#..###....|.###.#......|.#.#.#......|#.####.#####',
    ]);
    expect(output.durations).toEqual([90, 90, 90, 90, 90, 90, 90, 1500]);
  });

  it('pins the crash: the runner hits the post, blinks twice and falls flat', () => {
    const output = play('run-crash');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '............|............|..#.........|.##........#|.#.........#|.######.####',
      '............|............|..#.........|.##.......#.|.#........#.|######.####.',
      '............|............|..#.........|.##......#..|.#.......#..|#####.####.#',
      '............|............|..#.........|.##.....#...|..#.....#...|####.####.##',
      '............|............|..#.........|.##....#....|..#....#....|###.####.###',
      '............|............|..#.........|.##...#.....|..#...#.....|##.####.####',
      '............|............|..#.........|.##..#......|.#...#......|#.####.#####',
      '............|............|..#.........|.##.#.......|.#..#.......|.####.######',
      '............|............|..#.........|.###........|..##........|####.######.',
      '............|............|............|............|............|............',
      '............|............|..#.........|.###........|..##........|####.######.',
      '............|............|............|............|............|............',
      '............|............|..#.........|.###........|..##........|####.######.',
      '............|............|............|...#........|####........|####.######.',
    ]);
    expect(output.durations).toEqual([90, 90, 90, 90, 90, 90, 90, 90, 250, 250, 250, 250, 250, 1500]);
  });
});

describe('hurdle runner on every grid from 8x5 to 16x16', () => {
  it('never lets the runner overlap the post, so every hop clears it', () => {
    gridsFrom(MIN).forEach((grid) => {
      const layout = planRunner(grid);
      Array.from({ length: runLoopFrames(grid.cols, true) }, (_, step) =>
        runScene(layout, step, true),
      ).forEach(({ post, runner }) => {
        expect({
          grid,
          touching: post.some((cell) => runner.some((part) => isSameCell(cell, part))),
        }).toEqual({
          grid,
          touching: false,
        });
      });
    });
  });

  it('spaces posts at least 12 columns apart and loops at 90 ms a column', () => {
    gridsFrom(MIN).forEach((grid) => {
      const layout = planRunner(grid);
      const steps = runLoopFrames(grid.cols, true);
      const withPost = Array.from({ length: steps }, (_, step) => runScene(layout, step, true)).filter(
        ({ post }) => post.some(([x]) => x === grid.cols - 1),
      );
      expect(steps / withPost.length).toBeGreaterThanOrEqual(MIN_POST_SPACING);
      expect(new Set(play('run', {}, grid).durations.filter((ms) => ms < RUN_MS))).toEqual(new Set());
    });
  });

  it('blinks the frozen crash twice, then ends with the runner lying on the ground', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames } = play('run-crash', {}, grid);
      const [frozen, off, on, offAgain, onAgain, fallen] = frames.slice(-6);
      expect([on, onAgain]).toEqual([frozen, frozen]);
      expect([off, offAgain].map((frame) => litCells(frame, grid.cols).length)).toEqual([0, 0]);
      const feetRow = grid.rows - 2;
      const body = litCells(fallen, grid.cols).filter(([x, y]) => y < grid.rows - 1 && x < 3);
      expect(body.every(([, y]) => y === feetRow)).toBe(true);
    });
  });

  it('ends the finish standing still one column before the flag pole', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames } = play('run-finish', {}, grid);
      expect(countChanged(frames[frames.length - 2], frames[frames.length - 1])).toBeGreaterThan(0);
      const top = litCells(frames[frames.length - 1], grid.cols).filter(([, y]) => y < grid.rows - 1);
      const heights = Array.from({ length: grid.cols }, (_, x) => top.filter(([cx]) => cx === x).length);
      const poleX = heights.findIndex((count) => count >= 3);
      const runnerRight = Math.max(...top.filter(([x]) => x < poleX).map(([x]) => x));
      expect(poleX - runnerRight).toBe(2);
    });
  });
});
