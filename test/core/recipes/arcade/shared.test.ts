import { describe, expect, it } from 'vitest';

import {
  assertArcadeGrid,
  centreStart,
  defineVariant,
  gcd,
  lcm,
  limitFlashes,
  shiftPoints,
  spritePoints,
  stepsToOutput,
  triangle,
  wrapColumns,
} from '../../../../src/core/recipes/arcade/shared';
import type { Frame } from '../../../../src/core/types';

const ON: Frame = [1, 1, 1, 1, 1];
const OFF: Frame = [0, 0, 0, 0, 0];
const DARK_ROW: Frame = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const ONE_DOT_ROW: Frame = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];

describe('arcade shared helpers', () => {
  it('reads a sprite row by row into lit points', () => {
    expect(spritePoints(['#.#', '.#.'], 2, 1)).toEqual([
      [2, 1],
      [4, 1],
      [3, 2],
    ]);
  });

  it('shifts points and wraps columns round the grid', () => {
    expect(shiftPoints([[0, 0]], 2, -1)).toEqual([[2, -1]]);
    expect(
      wrapColumns(
        [
          [-1, 0],
          [5, 1],
          [2, 2],
        ],
        5,
      ),
    ).toEqual([
      [4, 0],
      [0, 1],
      [2, 2],
    ]);
  });

  it('bounces a triangle wave between 0 and its span', () => {
    expect(Array.from({ length: 9 }, (_, step) => triangle(step, 3))).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2]);
    expect(triangle(-1, 3)).toBe(1);
    expect(triangle(4, 0)).toBe(0);
  });

  it('finds common divisors and multiples', () => {
    expect(gcd(12, 8)).toBe(4);
    expect(lcm(12, 8)).toBe(24);
    expect(centreStart(9, 4)).toBe(2);
  });

  it('turns scenes into frames and durations', () => {
    expect(stepsToOutput({ cols: 2, rows: 2 }, [{ points: [[1, 1]], ms: 90 }])).toEqual({
      frames: [[0, 0, 0, 1]],
      durations: [90],
    });
  });

  it('explains a grid below the smallest one a variant draws', () => {
    expect(() => assertArcadeGrid('march', { cols: 8, rows: 8 }, { cols: 9, rows: 6 })).toThrow(
      'flickering-dots build: arcade variant "march" needs a grid of at least 9×6, got 8×8',
    );
    expect(() => assertArcadeGrid('march', { cols: 9, rows: 6 }, { cols: 9, rows: 6 })).not.toThrow();
  });
});

describe('limitFlashes', () => {
  it('spaces changes of 20 percent of the grid at least 167 ms apart', () => {
    const output = { frames: [ON, OFF, ON, OFF], durations: [50, 50, 50, 50] };
    expect(limitFlashes(output, false).durations).toEqual([50, 167, 167, 50]);
  });

  it('leaves small changes and slow blinks alone', () => {
    const small = { frames: [DARK_ROW, ONE_DOT_ROW, DARK_ROW], durations: [40, 40, 40] };
    const slow = { frames: [ON, OFF, ON], durations: [200, 200, 200] };
    expect(limitFlashes(small, true)).toEqual(small);
    expect(limitFlashes(slow, false)).toEqual(slow);
  });

  it('counts the jump from the last frame back to the first in a loop', () => {
    const loop = { frames: [ON, OFF], durations: [100, 100] };
    const once = { frames: [ON, OFF, ON], durations: [100, 100, 100] };
    expect(limitFlashes(loop, true).durations).toEqual([167, 167]);
    expect(limitFlashes(once, false).durations).toEqual([100, 167, 100]);
  });

  it('returns new arrays and keeps the input untouched', () => {
    const durations = [50, 50];
    const output = { frames: [ON, OFF], durations };
    const paced = limitFlashes(output, true);
    expect(durations).toEqual([50, 50]);
    expect(paced.durations).not.toBe(durations);
  });
});

describe('defineVariant', () => {
  it('checks the grid, merges repeated frames and paces flashes', () => {
    const blink = defineVariant(
      'blink',
      { cols: 5, rows: 1 },
      () => ({ frames: [ON, ON, OFF], durations: [40, 40, 40] }),
      true,
    );
    expect(blink({ cols: 5, rows: 1 }, {})).toEqual({ frames: [ON, OFF], durations: [167, 167] });
    expect(() => blink({ cols: 4, rows: 1 }, {})).toThrow('needs a grid of at least 5×1, got 4×1');
  });
});
