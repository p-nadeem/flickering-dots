import { describe, expect, it } from 'vitest';

import { generateHop } from '../../../src/core/recipes/hop';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toFrameText, toOutputText } from './frame-text';

const MIN_SIDE = 3;
const MAX_SIDE = 16;
const DOT_COUNT = 3;
const MS_PER_SECOND = 1000;
const MAX_FLASHES_PER_SECOND = 3;

const SIDES = Array.from({ length: MAX_SIDE - MIN_SIDE + 1 }, (_, index) => MIN_SIDE + index);
const GRIDS: GridSize[] = SIDES.flatMap((cols) => SIDES.map((rows) => ({ cols, rows })));

function dotSizeOf({ cols, rows }: GridSize): number {
  return cols >= 13 && rows >= 6 ? 2 : 1;
}

function heightOf(grid: GridSize): number {
  return Math.max(1, Math.min(2, grid.rows - dotSizeOf(grid) - 1));
}

function isLit(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  return frame[y * grid.cols + x] === 1;
}

function litPoints(frame: Frame, grid: GridSize): [number, number][] {
  return frame.flatMap((bit, index) =>
    bit === 1 ? [[index % grid.cols, Math.floor(index / grid.cols)] as [number, number]] : [],
  );
}

function litRowsInColumns(frame: Frame, grid: GridSize, from: number, size: number): number[] {
  const rows = Array.from({ length: grid.rows }, (_, y) => y);
  return rows.filter((y) =>
    Array.from({ length: size }, (_, dx) => from + dx).every((x) => isLit(frame, grid, x, y)),
  );
}

function dotLefts(frame: Frame, grid: GridSize): number[] {
  const size = dotSizeOf(grid);
  const xs = litPoints(frame, grid).map(([x]) => x);
  const first = Math.min(...xs);
  const span = Math.max(...xs) - first + 1;
  const step = (span - size) / (DOT_COUNT - 1);
  return Array.from({ length: DOT_COUNT }, (_, dot) => first + dot * step);
}

function dotTops(frame: Frame, grid: GridSize, lefts: number[]): number[] {
  return lefts.map((left) => Math.min(...litRowsInColumns(frame, grid, left, dotSizeOf(grid))));
}

function toKeys(points: number[][]): string[] {
  return points.map(([x, y]) => `${x},${y}`).sort();
}

function countCellFlashes(frames: Frame[], cell: number): number {
  return frames.filter((frame, index) => {
    const previous = frames[(index + frames.length - 1) % frames.length];
    return frame[cell] === 1 && previous[cell] === 0;
  }).length;
}

function maxCellFlashes(frames: Frame[]): number {
  const cells = Array.from({ length: frames[0].length }, (_, cell) => cell);
  return Math.max(...cells.map((cell) => countCellFlashes(frames, cell)));
}

describe('generateHop', () => {
  it('hops three single dots one row on 7x3', () => {
    expect(toOutputText(generateHop({ cols: 7, rows: 3 }), 7)).toEqual({
      frames: [
        '0000000 0101010 0000000',
        '0100000 0001010 0000000',
        '0001000 0100010 0000000',
        '0000010 0101000 0000000',
      ],
      durations: [420, 150, 150, 150],
    });
  });

  it('hops two rows over six frames on 9x5', () => {
    expect(toOutputText(generateHop({ cols: 9, rows: 5 }), 9)).toEqual({
      frames: [
        '000000000 000000000 000000000 001010100 000000000',
        '000000000 000000000 001000000 000010100 000000000',
        '000000000 001000000 000010000 000000100 000000000',
        '000000000 000010000 001000100 000000000 000000000',
        '000000000 000000100 000010000 001000000 000000000',
        '000000000 000000000 000000100 001010000 000000000',
      ],
      durations: [420, 150, 150, 150, 150, 150],
    });
  });

  it('turns touching dots into a travelling bump on 3x3', () => {
    expect(toOutputText(generateHop({ cols: 3, rows: 3 }), 3)).toEqual({
      frames: ['000 111 000', '100 011 000', '010 101 000', '001 110 000'],
      durations: [420, 150, 150, 150],
    });
  });

  it('draws two by two dots on 16x16', () => {
    const grid = { cols: 16, rows: 16 };
    const [rest] = generateHop(grid).frames;
    expect(toFrameText(rest, grid.cols).split(' ').slice(6, 10)).toEqual([
      '0000000000000000',
      '0000000000000000',
      '0001100110011000',
      '0001100110011000',
    ]);
  });

  it.each([
    { cols: 8, rows: 3, lefts: [1, 3, 5] },
    { cols: 13, rows: 6, lefts: [1, 5, 9] },
  ])(
    'keeps a gap of one dot size and a left margin when the spare width is odd on $cols x $rows',
    (case_) => {
      const grid = { cols: case_.cols, rows: case_.rows };
      expect(dotLefts(generateHop(grid).frames[0], grid)).toEqual(case_.lefts);
    },
  );

  it('loops in 870 ms for a one row hop and 1170 ms for a two row hop', () => {
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    expect(sum(generateHop({ cols: 7, rows: 3 }).durations)).toBe(870);
    expect(sum(generateHop({ cols: 9, rows: 5 }).durations)).toBe(1170);
  });

  it.each(GRIDS)('reads cleanly on $cols x $rows', (grid) => {
    const { frames, durations } = generateHop(grid);
    const size = dotSizeOf(grid);
    const height = heightOf(grid);
    expect(frames).toHaveLength(2 * height + 2);
    expect(durations).toHaveLength(frames.length);
    frames.forEach((frame) => {
      expect(frame).toHaveLength(grid.cols * grid.rows);
      expect(countLit(frame)).toBe(DOT_COUNT * size * size);
    });
    const lefts = dotLefts(frames[0], grid);
    expect(lefts.every(Number.isInteger)).toBe(true);
    const rightMargin = grid.cols - (lefts[DOT_COUNT - 1] + size);
    expect(Math.abs(lefts[0] - rightMargin)).toBeLessThanOrEqual(1);
    const restTops = dotTops(frames[0], grid, lefts);
    expect(new Set(restTops).size).toBe(1);
    const peak = restTops[0] - height;
    const bottomMargin = grid.rows - (restTops[0] + size);
    expect(peak).toBeGreaterThanOrEqual(0);
    expect(Math.abs(peak - bottomMargin)).toBeLessThanOrEqual(1);
  });

  it.each(GRIDS)('moves each dot as a whole square, one row at a time, on $cols x $rows', (grid) => {
    const { frames } = generateHop(grid);
    const size = dotSizeOf(grid);
    const lefts = dotLefts(frames[0], grid);
    const tops = frames.map((frame) => dotTops(frame, grid, lefts));
    frames.forEach((frame, index) => {
      const expected = lefts.flatMap((left, dot) =>
        Array.from({ length: size * size }, (_, cell) => [
          left + (cell % size),
          tops[index][dot] + Math.floor(cell / size),
        ]),
      );
      expect(toKeys(litPoints(frame, grid))).toEqual(toKeys(expected));
    });
    tops.forEach((frameTops, index) => {
      const next = tops[(index + 1) % tops.length];
      frameTops.forEach((top, dot) => expect(Math.abs(top - next[dot])).toBeLessThanOrEqual(1));
    });
  });

  it.each(GRIDS)('stays under three flashes per second per cell on $cols x $rows', (grid) => {
    const { frames, durations } = generateHop(grid);
    const loopSeconds = durations.reduce((total, value) => total + value, 0) / MS_PER_SECOND;
    expect(maxCellFlashes(frames) / loopSeconds).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('ignores params', () => {
    const grid = { cols: 9, rows: 5 };
    expect(generateHop(grid, { frames: 3, trail: 4, seed: 7 })).toEqual(generateHop(grid));
  });
});
