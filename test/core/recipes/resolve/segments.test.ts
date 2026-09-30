import { describe, expect, it } from 'vitest';

import { isSegmentsGlyph } from '../../../../src/core/recipes/resolve/segments-layout';
import { generateSegments } from '../../../../src/core/recipes/resolve/segments';
import type { RecipeOutput } from '../../../../src/core/recipes/helpers';
import type { Frame } from '../../../../src/core/types';

import { rowsOf } from './support-b';

const COUNTER = { cols: 5, rows: 7 };
const SPIN_MS = 400;
const SPIN_HOLD_MS = 220;
const COUNT_MS = 1000;
const STEP_MS = 60;
const REST_MS = 1000;
const FRAMES_PER_DIGIT = 4;

const DIGITS: readonly string[][] = [
  ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'],
  ['....#', '....#', '....#', '....#', '....#', '....#', '....#'],
  ['#####', '....#', '....#', '#####', '#....', '#....', '#####'],
  ['#####', '....#', '....#', '#####', '....#', '....#', '#####'],
  ['#...#', '#...#', '#...#', '#####', '....#', '....#', '....#'],
  ['#####', '#....', '#....', '#####', '....#', '....#', '#####'],
  ['#####', '#....', '#....', '#####', '#...#', '#...#', '#####'],
  ['#####', '....#', '....#', '....#', '....#', '....#', '....#'],
  ['#####', '#...#', '#...#', '#####', '#...#', '#...#', '#####'],
  ['#####', '#...#', '#...#', '#####', '....#', '....#', '#####'],
];

function rows(frame: Frame, cols = COUNTER.cols): string[] {
  return rowsOf(frame, cols);
}

function frameAt({ frames, durations }: RecipeOutput, ms: number): Frame {
  const ends = durations.map((_, index) =>
    durations.slice(0, index + 1).reduce((sum, value) => sum + value, 0),
  );
  return frames[ends.findIndex((end) => end > ms)];
}

function litSet(frame: Frame): Set<number> {
  return new Set(frame.flatMap((bit, index) => (bit === 1 ? [index] : [])));
}

describe('resolve segments', () => {
  it.each(DIGITS.map((digit, index) => [index, digit] as const))(
    'draws %i on the 5x7 cell',
    (digit, expected) => {
      const output = generateSegments(COUNTER, { variant: 'segments', glyph: String(digit) });
      expect(output.frames.map((frame) => rows(frame))).toEqual([expected]);
      expect(output.durations).toEqual([REST_MS]);
    },
  );

  it('dims the idle 0 to every other dot along its strokes', () => {
    const output = generateSegments(COUNTER, { variant: 'segments', glyph: '0', density: 0.5 });
    expect(rows(output.frames[0])).toEqual(['#.#.#', '.....', '#...#', '.....', '#...#', '.....', '#.#.#']);
  });

  it('spins 0 to 9 at 400 ms a digit, each change taking 4 frames of 60 ms', () => {
    const output = generateSegments(COUNTER, { variant: 'segments', glyph: '0-9' });
    DIGITS.forEach((digit, index) => {
      expect(rows(frameAt(output, index * SPIN_MS))).toEqual(digit);
      expect(rows(frameAt(output, (index + 1) * SPIN_MS - FRAMES_PER_DIGIT * STEP_MS))).toEqual(digit);
      expect(rows(frameAt(output, (index + 1) * SPIN_MS - STEP_MS))).not.toEqual(digit);
    });
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(DIGITS.length * SPIN_MS);
    expect(output.durations.every((ms) => ms % STEP_MS === 0 || (ms - SPIN_HOLD_MS) % STEP_MS === 0)).toBe(
      true,
    );
    expect(output.still).toBe(0);
  });

  it('counts 5 down to 1 at 1000 ms a digit', () => {
    const output = generateSegments(COUNTER, { variant: 'segments', glyph: '5-1' });
    [5, 4, 3, 2, 1].forEach((digit, index) => {
      expect(rows(frameAt(output, index * COUNT_MS))).toEqual(DIGITS[digit]);
      expect(rows(frameAt(output, (index + 1) * COUNT_MS - FRAMES_PER_DIGIT * STEP_MS))).toEqual(
        DIGITS[digit],
      );
    });
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(5 * COUNT_MS);
  });

  it('shrinks and grows segments along their own strokes and never drops a kept one', () => {
    const output = generateSegments(COUNTER, { variant: 'segments', glyph: '0-9' });
    DIGITS.forEach((_, index) => {
      const from = litSet(frameAt(output, index * SPIN_MS));
      const to = litSet(frameAt(output, ((index + 1) % DIGITS.length) * SPIN_MS));
      [3, 2, 1].forEach((stepsLeft) => {
        const lit = litSet(frameAt(output, (index + 1) * SPIN_MS - stepsLeft * STEP_MS));
        [...lit].forEach((cell) => expect(from.has(cell) || to.has(cell)).toBe(true));
        [...from].filter((cell) => to.has(cell)).forEach((cell) => expect(lit.has(cell)).toBe(true));
      });
    });
  });

  it('pins the 1 to 2 change: the top and middle grow out of the right side, the lower left grows down and across', () => {
    const output = generateSegments(COUNTER, { variant: 'segments', glyph: '1-2' });
    expect(output.frames.slice(0, 4).map((frame) => rows(frame))).toEqual([
      DIGITS[1],
      ['...##', '....#', '....#', '#..##', '....#', '....#', '#...#'],
      ['..###', '....#', '....#', '#.###', '#...#', '.....', '##..#'],
      ['.####', '....#', '....#', '#####', '#...#', '#....', '###.#'],
    ]);
  });

  it('runs two digits side by side on 3x5 cells at 8x7, right aligned', () => {
    const grid = { cols: 8, rows: 7 };
    const output = generateSegments(grid, { variant: 'segments', glyph: '10-1' });
    const blank = '........';
    expect(rows(output.frames[0], grid.cols)).toEqual([
      blank,
      '..#.###.',
      '..#.#.#.',
      '..#.#.#.',
      '..#.#.#.',
      '..#.###.',
      blank,
    ]);
    expect(rows(output.frames[FRAMES_PER_DIGIT], grid.cols)).toEqual([
      blank,
      '....###.',
      '....#.#.',
      '....###.',
      '......#.',
      '....###.',
      blank,
    ]);
  });

  it('grows the digit with the grid, up to a 9x15 cell on 16x16', () => {
    const grid = { cols: 16, rows: 16 };
    const eight = rows(generateSegments(grid, { variant: 'segments', glyph: '8' }).frames[0], grid.cols);
    const full = '...#########....';
    const sides = '...#.......#....';
    expect(eight).toEqual([
      full,
      ...Array(6).fill(sides),
      full,
      ...Array(6).fill(sides),
      full,
      '.'.repeat(16),
    ]);
  });

  it('keeps the same frames on every call', () => {
    const params = { variant: 'segments', glyph: '0-9' };
    expect(generateSegments(COUNTER, params)).toEqual(generateSegments(COUNTER, params));
  });

  it('rejects glyphs that are not a number or a range of numbers', () => {
    expect(() => generateSegments(COUNTER, { glyph: 'abc' })).toThrow(
      'flickering-dots resolve: glyph "abc" is not a segments glyph; use a number from 0 to 99 or a range such as 5-1',
    );
    expect(isSegmentsGlyph('0-9')).toBe(true);
    expect(isSegmentsGlyph('10-1')).toBe(true);
    expect(isSegmentsGlyph('7')).toBe(true);
    expect(isSegmentsGlyph('100')).toBe(false);
    expect(isSegmentsGlyph('1-')).toBe(false);
    expect(isSegmentsGlyph('-3')).toBe(false);
  });
});
