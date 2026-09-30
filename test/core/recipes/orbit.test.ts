import { describe, expect, it } from 'vitest';

import { GRID_MAX, GRID_MIN } from '../../../src/core/constants';
import { ORBIT_DEFAULTS, generateOrbit } from '../../../src/core/recipes/orbit';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toOutputText } from './frame-text';

type Cell = readonly [x: number, y: number];

const LAP_MS = 960;
const MIN_FRAME_MS = 40;
const MAX_FRAME_MS = 90;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;
const SMALLEST_THINNED_SIDE = 5;
const RING_LENGTHS: Readonly<Record<number, number>> = {
  3: 8,
  4: 12,
  5: 12,
  6: 12,
  7: 16,
  8: 20,
  9: 20,
  10: 24,
  11: 28,
  12: 32,
  13: 32,
  14: 36,
  15: 40,
  16: 40,
};
const SIDES = Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, index) => GRID_MIN + index);

function square(side: number): GridSize {
  return { cols: side, rows: side };
}

function litCells(frame: Frame, cols: number): Cell[] {
  return frame.flatMap((bit, index): Cell[] => (bit === 1 ? [[index % cols, Math.floor(index / cols)]] : []));
}

function ringPath(grid: GridSize): Cell[] {
  return generateOrbit(grid, { trail: 0 }).frames.map((frame) => litCells(frame, grid.cols)[0]);
}

function ringRows(grid: GridSize): string[] {
  const keys = new Set(ringPath(grid).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: grid.rows }, (_, y) =>
    Array.from({ length: grid.cols }, (__, x) => (keys.has(`${x},${y}`) ? '#' : '.')).join(''),
  );
}

function isTouching(a: Cell, b: Cell): boolean {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;
}

function isMirrorSymmetric(rows: readonly string[]): boolean {
  const flippedX = rows.map((row) => [...row].reverse().join(''));
  const flippedY = [...rows].reverse();
  const transposed = rows.map((_, y) => rows.map((row) => row[y]).join(''));
  return [flippedX, flippedY, transposed].every((mirror) => mirror.join('|') === rows.join('|'));
}

function expectedFrameMs(frameCount: number): number {
  return Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, Math.round(LAP_MS / frameCount)));
}

describe('generateOrbit', () => {
  it('keeps the approved 7x7 frames with the default trail of 2', () => {
    expect(toOutputText(generateOrbit(square(7), {}), 7)).toEqual({
      frames: [
        '0011000 0100000 0000000 0000000 0000000 0000000 0000000',
        '0011100 0000000 0000000 0000000 0000000 0000000 0000000',
        '0001100 0000010 0000000 0000000 0000000 0000000 0000000',
        '0000100 0000010 0000001 0000000 0000000 0000000 0000000',
        '0000000 0000010 0000001 0000001 0000000 0000000 0000000',
        '0000000 0000000 0000001 0000001 0000001 0000000 0000000',
        '0000000 0000000 0000000 0000001 0000001 0000010 0000000',
        '0000000 0000000 0000000 0000000 0000001 0000010 0000100',
        '0000000 0000000 0000000 0000000 0000000 0000010 0001100',
        '0000000 0000000 0000000 0000000 0000000 0000000 0011100',
        '0000000 0000000 0000000 0000000 0000000 0100000 0011000',
        '0000000 0000000 0000000 0000000 1000000 0100000 0010000',
        '0000000 0000000 0000000 1000000 1000000 0100000 0000000',
        '0000000 0000000 1000000 1000000 1000000 0000000 0000000',
        '0000000 0100000 1000000 1000000 0000000 0000000 0000000',
        '0010000 0100000 1000000 0000000 0000000 0000000 0000000',
      ],
      durations: Array.from({ length: 16 }, () => 60),
    });
  });

  it('keeps the approved 5x5 frames with trail 0', () => {
    expect(toOutputText(generateOrbit(square(5), { trail: 0 }), 5)).toEqual({
      frames: [
        '00100 00000 00000 00000 00000',
        '00010 00000 00000 00000 00000',
        '00000 00001 00000 00000 00000',
        '00000 00000 00001 00000 00000',
        '00000 00000 00000 00001 00000',
        '00000 00000 00000 00000 00010',
        '00000 00000 00000 00000 00100',
        '00000 00000 00000 00000 01000',
        '00000 00000 00000 10000 00000',
        '00000 00000 10000 00000 00000',
        '00000 10000 00000 00000 00000',
        '01000 00000 00000 00000 00000',
      ],
      durations: Array.from({ length: 12 }, () => 80),
    });
  });

  it('draws the approved ring shapes on 9x9 and 12x12', () => {
    expect(ringRows(square(9))).toEqual([
      '...###...',
      '..#...#..',
      '.#.....#.',
      '#.......#',
      '#.......#',
      '#.......#',
      '.#.....#.',
      '..#...#..',
      '...###...',
    ]);
    expect(ringRows(square(12))).toEqual([
      '....####....',
      '..##....##..',
      '.#........#.',
      '.#........#.',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '.#........#.',
      '.#........#.',
      '..##....##..',
      '....####....',
    ]);
  });

  it('uses the whole edge on grids of side 4 or less', () => {
    expect(ringRows(square(3))).toEqual(['###', '#.#', '###']);
    expect(ringRows(square(4))).toEqual(['####', '#..#', '#..#', '####']);
  });

  it('defaults to a trail of 2 and one frame per ring cell', () => {
    expect(ORBIT_DEFAULTS).toEqual({ trail: 2 });
    const output = generateOrbit(square(9), {});
    expect(output.frames).toHaveLength(20);
    expect(output.frames.map(countLit)).toEqual(Array.from({ length: 20 }, () => 3));
  });

  it.each(SIDES)('lays out a ring of the approved length on side %i', (side) => {
    expect(ringPath(square(side))).toHaveLength(RING_LENGTHS[side]);
  });

  it.each(SIDES)('visits each ring cell once, one touching step at a time, on side %i', (side) => {
    const path = ringPath(square(side));
    expect(new Set(path.map(([x, y]) => `${x},${y}`)).size).toBe(path.length);
    path.forEach((cell, index) => expect(isTouching(cell, path[(index + 1) % path.length])).toBe(true));
  });

  it.each(SIDES)('draws a ring that mirrors across both axes and the diagonal on side %i', (side) => {
    expect(isMirrorSymmetric(ringRows(square(side)))).toBe(true);
  });

  it.each(SIDES.filter((side) => side >= SMALLEST_THINNED_SIDE))(
    'thins the ring so each cell touches exactly two others on side %i',
    (side) => {
      const path = ringPath(square(side));
      path.forEach((cell) => expect(path.filter((other) => isTouching(cell, other))).toHaveLength(2));
    },
  );

  it.each(SIDES)('starts at twelve o clock and turns clockwise on side %i', (side) => {
    const [first, second] = ringPath(square(side));
    expect(first).toEqual([Math.floor(side / 2), 0]);
    expect(second[0]).toBeGreaterThan(first[0]);
  });

  it.each(SIDES)('times a lap at about 960 ms within 40 to 90 ms a frame on side %i', (side) => {
    const { durations } = generateOrbit(square(side), {});
    expect(durations).toEqual(durations.map(() => expectedFrameMs(RING_LENGTHS[side])));
  });

  it.each(SIDES)('turns each cell on at most 3 times a second on side %i', (side) => {
    const { durations } = generateOrbit(square(side), {});
    const lapSeconds = durations.reduce((sum, ms) => sum + ms, 0) / MS_PER_SECOND;
    expect(1 / lapSeconds).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('keeps a long trail contiguous, adding the head and dropping the tail each frame', () => {
    const grid = square(9);
    const path = ringPath(grid);
    const { frames, durations } = generateOrbit(grid, { trail: 6 });
    expect(frames).toHaveLength(20);
    expect(durations).toEqual(Array.from({ length: 20 }, () => 48));
    frames.forEach((frame, index) => {
      const expected = Array.from(
        { length: 7 },
        (_, step) => path[(index - step + path.length) % path.length],
      );
      expect(new Set(litCells(frame, grid.cols).map(String))).toEqual(new Set(expected.map(String)));
    });
  });

  it('subsamples the ring evenly when frames is given', () => {
    const grid = square(7);
    const path = ringPath(grid);
    const output = generateOrbit(grid, { frames: 8, trail: 0 });
    expect(output.frames.map((frame) => litCells(frame, grid.cols)[0])).toEqual(
      path.filter((_, index) => index % 2 === 0),
    );
    expect(output.durations).toEqual(Array.from({ length: 8 }, () => expectedFrameMs(8)));
  });

  it('keeps the trail on ring cells when frames skips cells', () => {
    const grid = square(7);
    const path = ringPath(grid);
    const [first] = generateOrbit(grid, { frames: 4, trail: 2 }).frames;
    expect(new Set(litCells(first, grid.cols).map(String))).toEqual(
      new Set([path[0], path[15], path[14]].map(String)),
    );
  });

  it('caps frames at the ring length and treats zero as the default', () => {
    const grid = square(7);
    expect(generateOrbit(grid, { frames: 40 })).toEqual(generateOrbit(grid, {}));
    expect(generateOrbit(grid, { frames: 0 })).toEqual(generateOrbit(grid, {}));
  });

  it('keeps a zero trail and caps a trail longer than the ring', () => {
    const grid = square(7);
    expect(generateOrbit(grid, { trail: 0 }).frames.map(countLit)).toEqual(
      Array.from({ length: 16 }, () => 1),
    );
    expect(generateOrbit(grid, { trail: 20 })).toEqual(generateOrbit(grid, { trail: 15 }));
  });

  it.each([
    [{ cols: 12, rows: 5 }, 3, 0],
    [{ cols: 5, rows: 12 }, 0, 3],
    [{ cols: 16, rows: 8 }, 4, 0],
    [{ cols: 8, rows: 7 }, 0, 0],
  ])('centres the ring in a square on %o', (grid, offsetX, offsetY) => {
    const side = Math.min(grid.cols, grid.rows);
    const shifted = ringPath(square(side)).map(([x, y]): Cell => [x + offsetX, y + offsetY]);
    expect(ringPath(grid)).toEqual(shifted);
  });
});
