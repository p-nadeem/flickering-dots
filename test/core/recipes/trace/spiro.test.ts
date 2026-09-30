import { describe, expect, it } from 'vitest';

import { generateTrace } from '../../../../src/core/recipes/trace';
import { rosette } from '../../../../src/core/recipes/trace/spiro';
import type { Frame, GridSize } from '../../../../src/core/types';

import {
  RECTANGLES,
  countChanges,
  countLit,
  gridName,
  isMirrored,
  isTransposeSymmetric,
  squaresFrom,
  toRows,
} from './checks';

const SPIRO: GridSize = { cols: 9, rows: 9 };
const ROSETTE_9 = '....#.... ...#.#... ...#.#... .##.#.##. #..#.#..# .##.#.##. ...#.#... ...#.#... ....#....';
const DRAW_MS = 45;
const FULL_HOLD_MS = 400;
const REST_MS = 120;
const HOLD_MS = 1500;
const PULSE_MS = 120;
const CRUMBLE_MS = 30;

function text(frame: Frame, grid: GridSize): string {
  return toRows(frame, grid.cols).join(' ');
}

function framesAsText(variant: string, grid: GridSize, extra: Record<string, number> = {}): string[] {
  return generateTrace(grid, { variant, ...extra }).frames.map((frame) => text(frame, grid));
}

function rosetteRows(grid: GridSize): string[] {
  const { frames, still } = generateTrace(grid, { variant: 'spiro' });
  return toRows(frames[still ?? 0], grid.cols);
}

describe('trace spirograph rosette', () => {
  it('keeps the approved 9x9 four-petal rosette', () => {
    expect(rosetteRows(SPIRO).join(' ')).toBe(ROSETTE_9);
  });

  it('keeps the approved 7x7 star', () => {
    expect(rosetteRows({ cols: 7, rows: 7 }).join(' ')).toBe(
      '...#... ...#... ..#.#.. ##...## ..#.#.. ...#... ...#...',
    );
  });

  it.each(squaresFrom(7).map((grid) => [gridName(grid), grid] as const))(
    'draws a centred rosette with mirror and diagonal symmetry on %s',
    (_name, grid) => {
      const rows = rosetteRows(grid);

      expect(isMirrored(rows)).toBe(true);
      expect(isTransposeSymmetric(rows)).toBe(true);
    },
  );

  it.each(squaresFrom(9).map((grid) => [gridName(grid), grid] as const))(
    'reaches every edge of the grid on %s',
    (_name, grid) => {
      const rows = rosetteRows(grid);

      expect(rows[0]).toContain('#');
      expect(rows.map((row) => row[0]).join('')).toContain('#');
    },
  );

  it('visits each rosette cell once in the drawing order', () => {
    const { order } = rosette(SPIRO);

    expect(new Set(order.map(([x, y]) => `${x},${y}`)).size).toBe(order.length);
    expect(order).toHaveLength(24);
  });
});

describe('trace spirograph states', () => {
  it('keeps the approved 9x9 drawing, one dot per 45 ms', () => {
    expect(framesAsText('spiro', SPIRO).slice(0, 24)).toEqual([
      '....#.... ......... ......... ......... ......... ......... ......... ......... .........',
      '....#.... ...#..... ......... ......... ......... ......... ......... ......... .........',
      '....#.... ...#..... ...#..... ......... ......... ......... ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.... ......... ......... ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.... .....#... ......... ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.... .....#... ......#.. ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.... .....#... ......##. ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.... .....#..# ......##. ......... ......... .........',
      '....#.... ...#..... ...#..... ....#..#. .....#..# ......##. ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ......##. ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ......... ......... .........',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#..... ......... .........',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#..... ...#..... .........',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#..... ...#..... ....#....',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#..... ...#.#... ....#....',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... ....#.##. ...#.#..# ....#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... ..#.#.##. ...#.#..# ....#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... .##.#.##. ...#.#..# ....#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... .##.#.##. #..#.#..# ....#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... .##.#.##. #..#.#..# .#..#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... .##.#.##. #..#.#..# .##.#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#.#... .##.#.##. #..#.#..# .##.#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#.#... ...#.#... .##.#.##. #..#.#..# .##.#.##. ...#.#... ...#.#... ....#....',
    ]);
  });

  it('holds the full rosette 400 ms and erases in the same order', () => {
    const { frames, durations, still } = generateTrace(SPIRO, { variant: 'spiro' });
    const counts = frames.map(countLit);

    expect(frames).toHaveLength(48);
    expect(still).toBe(23);
    expect(durations).toEqual(frames.map((_, index) => (index === 23 ? FULL_HOLD_MS : DRAW_MS)));
    expect(counts).toEqual([
      ...Array.from({ length: 24 }, (_, index) => index + 1),
      ...Array.from({ length: 24 }, (_, index) => 23 - index),
    ]);
    expect(text(frames[24], SPIRO)).toBe(ROSETTE_9.replace('....#....', '.........'));
  });

  it.each([...squaresFrom(7), ...RECTANGLES].map((grid) => [gridName(grid), grid] as const))(
    'adds or removes exactly one dot per frame of the loop on %s',
    (_name, grid) => {
      const { frames } = generateTrace(grid, { variant: 'spiro' });

      frames.forEach((frame, index) => {
        expect(countChanges(frames[index === 0 ? frames.length - 1 : index - 1], frame)).toBe(1);
      });
    },
  );

  it('keeps the approved 9x9 rest with one pen gap at 120 ms', () => {
    const output = generateTrace(SPIRO, { variant: 'spiro-rest' });

    expect(framesAsText('spiro-rest', SPIRO).slice(0, 3)).toEqual([
      '......... ...#.#... ...#.#... .##.#.##. #..#.#..# .##.#.##. ...#.#... ...#.#... ....#....',
      '....#.... .....#... ...#.#... .##.#.##. #..#.#..# .##.#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#.#... .....#... .##.#.##. #..#.#..# .##.#.##. ...#.#... ...#.#... ....#....',
    ]);
    expect(output.frames).toHaveLength(28);
    expect(new Set(output.frames.map(countLit))).toEqual(new Set([23]));
    expect(output.durations).toEqual(output.frames.map(() => REST_MS));
  });

  it('lights the given share of the curve for a progress value', () => {
    expect(framesAsText('spiro-progress', SPIRO, { density: 0.5 })).toEqual([
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#..... ......... .........',
    ]);
    expect(generateTrace(SPIRO, { variant: 'spiro-progress', density: 0 }).frames.map(countLit)).toEqual([0]);
    expect(generateTrace(SPIRO, { variant: 'spiro-progress', density: 1 }).frames.map(countLit)).toEqual([
      24,
    ]);
  });

  it('fills in seeded bursts, holds full, then clears when no progress is given', () => {
    const output = generateTrace(SPIRO, { variant: 'spiro-progress' });

    expect(output.frames.map(countLit)).toEqual([...Array.from({ length: 24 }, (_, index) => index + 1), 0]);
    expect(output.durations).toEqual([
      60, 60, 60, 360, 60, 360, 60, 60, 60, 60, 60, 360, 60, 60, 60, 60, 60, 60, 60, 60, 360, 60, 60, 800,
      300,
    ]);
    expect(generateTrace(SPIRO, { variant: 'spiro-progress', seed: 9 }).durations).not.toEqual(
      output.durations,
    );
  });

  it('completes, pulses off for one 120 ms frame and holds the rosette', () => {
    const { frames, durations } = generateTrace(SPIRO, { variant: 'spiro-complete' });
    const last = frames.length - 1;

    expect(text(frames[last], SPIRO)).toBe(ROSETTE_9);
    expect(text(frames[last - 2], SPIRO)).toBe(ROSETTE_9);
    expect(countLit(frames[last - 1])).toBe(0);
    expect(durations.slice(-3)).toEqual([240, PULSE_MS, HOLD_MS]);
    expect(durations.slice(0, -3)).toEqual(Array.from({ length: 23 }, () => 25));
  });

  it('keeps the approved 9x9 crumble opening: the pen skips off the curve', () => {
    expect(framesAsText('spiro-crumble', SPIRO).slice(0, 6)).toEqual([
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#.##.. ...#.#... ....#....',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#.#.#. ...#.#... ....#....',
      '....#.... ...#..... ...#..... ....#.##. .....#..# ....#.##. ...#.#..# ...#.#... ....#....',
      '....#.... ...#..... ...#..... ......##. .....#..# ....#.##. ...#.#... ...#.#... ....#....',
      '....#.... ...#..... ...#..... ......##. .....#..# ....#..#. ...#.#... ...#.#... ....#....',
    ]);
  });

  it('drops the drawn dots one at a time in seeded order and holds empty', () => {
    const { frames, durations } = generateTrace(SPIRO, { variant: 'spiro-crumble' });
    const crumbling = frames.slice(4).map(countLit);

    expect(crumbling).toEqual(Array.from({ length: 16 }, (_, index) => 15 - index));
    expect(durations).toEqual([200, 45, 45, 45, ...Array.from({ length: 15 }, () => CRUMBLE_MS), HOLD_MS]);
    expect(generateTrace(SPIRO, { variant: 'spiro-crumble', seed: 8 }).frames).not.toEqual(frames);
  });
});
