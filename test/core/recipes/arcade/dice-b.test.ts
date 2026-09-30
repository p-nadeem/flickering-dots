import { describe, expect, it } from 'vitest';

import { DICE_FACES, isDiceFace } from '../../../../src/core/recipes/arcade/dice-faces';
import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { allFrameTexts, frameText, gridsFrom, litCells } from './arcade-b-checks';

const GRID: GridSize = { cols: 7, rows: 7 };
const MIN: GridSize = { cols: 3, rows: 3 };
const LANDING_MS = [60, 60, 80, 100, 140, 200, 300, 1500];
const ROLLING_MIN_COLS = 9;

function play(variant: string, params: RecipeParams = {}, grid: GridSize = GRID) {
  return VARIANTS_B[variant](grid, { variant, ...params });
}

function centreX(frame: Frame, cols: number): number {
  const xs = litCells(frame, cols).map(([x]) => x);
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}

describe('dice at 7x7', () => {
  it('pins the idle rest: face five, its centre pip off for 200 ms every 1.5 s', () => {
    const output = play('dice-rest');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '.......|.#...#.|.......|...#...|.......|.#...#.|.......',
      '.......|.#...#.|.......|.......|.......|.#...#.|.......',
    ]);
    expect(output.durations).toEqual([1300, 200]);
  });

  it('pins the thinking spin: the die squashes 5, 3, 1, 3 wide, hopping a row on its edge', () => {
    const output = play('dice');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '.......|.#...#.|.......|.#...#.|.......|.#...#.|.......',
      '.......|..#.#..|.......|..#.#..|.......|..#.#..|.......',
      '...#...|...#...|...#...|...#...|...#...|.......|.......',
      '.......|..#.#..|.......|.......|.......|..#.#..|.......',
      '.......|.#...#.|.......|.......|.......|.#...#.|.......',
      '.......|..#.#..|.......|.......|.......|..#.#..|.......',
      '...#...|...#...|...#...|...#...|...#...|.......|.......',
      '.......|....#..|.......|.......|.......|..#....|.......',
      '.......|.....#.|.......|.......|.......|.#.....|.......',
      '.......|....#..|.......|.......|.......|..#....|.......',
      '...#...|...#...|...#...|...#...|...#...|.......|.......',
      '.......|....#..|.......|...#...|.......|..#....|.......',
      '.......|.....#.|.......|...#...|.......|.#.....|.......',
      '.......|....#..|.......|...#...|.......|..#....|.......',
      '...#...|...#...|...#...|...#...|...#...|.......|.......',
      '.......|..#.#..|.......|..#.#..|.......|..#.#..|.......',
    ]);
    expect(output.durations).toEqual([
      170, 170, 210, 110, 170, 110, 390, 110, 170, 110, 110, 110, 390, 110, 170, 170,
    ]);
  });

  it('pins the success landing on six', () => {
    const output = play('dice', { glyph: 'six' });
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '.......|.#...#.|.......|...#...|.......|.#...#.|.......',
      '.......|.......|.......|...#...|.......|.......|.......',
      '.......|.#...#.|.......|.......|.......|.#...#.|.......',
      '.......|.....#.|.......|...#...|.......|.#.....|.......',
      '.......|.#...#.|.......|...#...|.......|.#...#.|.......',
      '.......|.......|.......|...#...|.......|.......|.......',
      '.......|.....#.|.......|.......|.......|.#.....|.......',
      '.......|.#...#.|.......|.#...#.|.......|.#...#.|.......',
    ]);
    expect(output.durations).toEqual([60, 60, 80, 100, 140, 200, 300, 1500]);
  });

  it('pins the error landing on one, held 250 ms, then the pip shaking a column twice', () => {
    const output = play('dice', { glyph: 'one' });
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '.......|.#...#.|.......|.#...#.|.......|.#...#.|.......',
      '.......|.....#.|.......|.......|.......|.#.....|.......',
      '.......|.#...#.|.......|...#...|.......|.#...#.|.......',
      '.......|.#...#.|.......|.......|.......|.#...#.|.......',
      '.......|.#...#.|.......|.#...#.|.......|.#...#.|.......',
      '.......|.....#.|.......|.......|.......|.#.....|.......',
      '.......|.....#.|.......|...#...|.......|.#.....|.......',
      '.......|.......|.......|...#...|.......|.......|.......',
      '.......|.......|.......|..#....|.......|.......|.......',
      '.......|.......|.......|....#..|.......|.......|.......',
      '.......|.......|.......|..#....|.......|.......|.......',
      '.......|.......|.......|....#..|.......|.......|.......',
      '.......|.......|.......|...#...|.......|.......|.......',
    ]);
    expect(output.durations).toEqual([60, 60, 80, 100, 140, 200, 300, 250, 80, 80, 80, 80, 1500]);
  });

  it('pins the sampling loop: a tumble that lands on the seeded face and holds', () => {
    const output = play('dice-sample');
    expect(allFrameTexts(output, GRID.cols)).toEqual([
      '.......|.#...#.|.......|.#...#.|.......|.#...#.|.......',
      '.......|..#.#..|.......|..#.#..|.......|..#.#..|.......',
      '...#...|...#...|...#...|...#...|...#...|.......|.......',
      '.......|..#.#..|.......|...#...|.......|..#.#..|.......',
      '.......|.#...#.|.......|...#...|.......|.#...#.|.......',
      '.......|..#.#..|.......|...#...|.......|..#.#..|.......',
      '...#...|...#...|...#...|...#...|...#...|.......|.......',
      '.......|..#.#..|.......|..#.#..|.......|..#.#..|.......',
    ]);
    expect(output.durations).toEqual([1200, 170, 110, 110, 110, 110, 390, 170]);
  });
});

describe('dice on every grid from 3x3 to 16x16', () => {
  it('names the six faces it takes as a glyph', () => {
    expect(DICE_FACES).toEqual(['one', 'two', 'three', 'four', 'five', 'six']);
    expect([isDiceFace('six'), isDiceFace('check')]).toEqual([true, false]);
  });

  it('rejects a glyph that is not a dice face with a readable error', () => {
    expect(() => play('dice', { glyph: 'seven' })).toThrow(
      'flickering-dots arcade: glyph "seven" is not a dice face; use one of one, two, three, four, five, six',
    );
  });

  it('slows through seven faces and holds the landed face for 1.5 s', () => {
    gridsFrom(MIN).forEach((grid) => {
      const { frames, durations } = play('dice', { glyph: 'four' }, grid);
      expect(durations).toHaveLength(LANDING_MS.length);
      expect(durations.every((ms, index) => index === 0 || ms >= durations[index - 1])).toBe(true);
      expect(durations[durations.length - 1]).toBe(LANDING_MS[LANDING_MS.length - 1]);
      expect(frames[frames.length - 1]).not.toEqual(frames[frames.length - 2]);
    });
    expect(play('dice', { glyph: 'four' }).durations).toEqual(LANDING_MS);
  });

  it('uses the whole grid as the face on 3x3', () => {
    const six = play('dice', { glyph: 'six' }, MIN);
    expect(frameText(six.frames[six.frames.length - 1], MIN.cols)).toBe('#.#|#.#|#.#');
  });

  it('rolls edge over edge one column per frame once the grid is 9 or more wide', () => {
    gridsFrom({ cols: ROLLING_MIN_COLS, rows: 7 }).forEach((grid) => {
      const { frames } = play('dice', {}, grid);
      frames.forEach((frame, index) => {
        const next = frames[(index + 1) % frames.length];
        expect(Math.abs(centreX(next, grid.cols) - centreX(frame, grid.cols))).toBe(1);
      });
    });
  });
});
