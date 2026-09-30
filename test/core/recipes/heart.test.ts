import { describe, expect, it } from 'vitest';

import { generateHeart } from '../../../src/core/recipes/heart';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toOutputText } from './frame-text';

const BEAT_DURATIONS = [140, 100, 140, 700];
const FASTEST_SAFE_SPEED = 1.25;
const CHANGES_PER_FLASH = 2;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;
const LARGE_INDEXES = [0, 2];
const SMALL_INDEXES = [1, 3];

const GRID_MIN = 3;
const GRID_MAX = 16;
const ALL_GRIDS: readonly GridSize[] = Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, colIndex) =>
  Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (__, rowIndex) => ({
    cols: GRID_MIN + colIndex,
    rows: GRID_MIN + rowIndex,
  })),
).flat();

const CENTRED_GRIDS: readonly GridSize[] = [
  { cols: 7, rows: 6 },
  { cols: 5, rows: 4 },
  { cols: 9, rows: 8 },
  { cols: 8, rows: 6 },
  { cols: 6, rows: 4 },
  { cols: 12, rows: 12 },
  { cols: 16, rows: 16 },
];

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function rowOf(frame: Frame, cols: number, y: number): Frame {
  return frame.slice(y * cols, (y + 1) * cols);
}

function litRows(frame: Frame, cols: number): number[] {
  const rows = Math.ceil(frame.length / cols);
  return Array.from({ length: rows }, (_, y) => y).filter((y) => rowOf(frame, cols, y).includes(1));
}

function litColumns(frame: Frame, cols: number): number[] {
  return Array.from({ length: cols }, (_, x) => x).filter((x) =>
    frame.some((bit, index) => bit === 1 && index % cols === x),
  );
}

function boundsOf(frame: Frame, grid: GridSize): Bounds {
  const rows = litRows(frame, grid.cols);
  const columns = litColumns(frame, grid.cols);
  return {
    left: columns[0],
    right: grid.cols - 1 - columns[columns.length - 1],
    top: rows[0],
    bottom: grid.rows - 1 - rows[rows.length - 1],
  };
}

function runsOf(row: Frame): number {
  return row.filter((bit, x) => bit === 1 && row[x - 1] !== 1).length;
}

function spanOf(row: Frame): number {
  return row.lastIndexOf(1) - row.indexOf(1) + 1;
}

function mirror(frame: Frame, cols: number): Frame {
  return frame.map((_, index) => frame[index - (index % cols) + cols - 1 - (index % cols)]);
}

function label({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

describe('generateHeart', () => {
  it('beats twice on the native 7x6 grid, filling it', () => {
    const large = '0110110 1111111 1111111 0111110 0011100 0001000';
    const small = '0000000 0010100 0111110 0011100 0001000 0000000';
    expect(toOutputText(generateHeart({ cols: 7, rows: 6 }), 7)).toEqual({
      frames: [large, small, large, small],
      durations: BEAT_DURATIONS,
    });
  });

  it('keeps the 6-row heart at the top of a 7x7 grid, leaving one spare row', () => {
    const large = '0110110 1111111 1111111 0111110 0011100 0001000 0000000';
    const small = '0000000 0010100 0111110 0011100 0001000 0000000 0000000';
    expect(toOutputText(generateHeart({ cols: 7, rows: 7 }), 7).frames).toEqual([large, small, large, small]);
  });

  it('draws a 5-wide heart on 5x5 with a 3-wide heart inside it', () => {
    const large = '01010 11111 01110 00100 00000';
    const small = '00000 01010 00100 00000 00000';
    expect(toOutputText(generateHeart({ cols: 5, rows: 5 }), 5).frames).toEqual([large, small, large, small]);
  });

  it('draws an even-width heart with a two-cell point on 8x6', () => {
    const large = '01100110 11111111 11111111 01111110 00111100 00011000';
    const small = '00000000 00100100 01111110 00111100 00011000 00000000';
    expect(toOutputText(generateHeart({ cols: 8, rows: 6 }), 8).frames).toEqual([large, small, large, small]);
  });

  it('draws a 9-wide heart on 9x9', () => {
    const large = [
      '011101110',
      '111111111',
      '111111111',
      '111111111',
      '011111110',
      '001111100',
      '000111000',
      '000010000',
      '000000000',
    ].join(' ');
    const small = [
      '000000000',
      '001101100',
      '011111110',
      '011111110',
      '001111100',
      '000111000',
      '000010000',
      '000000000',
      '000000000',
    ].join(' ');
    expect(toOutputText(generateHeart({ cols: 9, rows: 9 }), 9).frames).toEqual([large, small, large, small]);
  });

  it('shrinks to the point of the heart on a 3x3 grid', () => {
    expect(toOutputText(generateHeart({ cols: 3, rows: 3 }), 3).frames).toEqual([
      '101 010 000',
      '000 010 000',
      '101 010 000',
      '000 010 000',
    ]);
  });

  it('shrinks a 6-wide heart to its centred lower half on 6x4', () => {
    expect(toOutputText(generateHeart({ cols: 6, rows: 4 }), 6).frames).toEqual([
      '010010 111111 011110 001100',
      '000000 011110 001100 000000',
      '010010 111111 011110 001100',
      '000000 011110 001100 000000',
    ]);
  });

  it('beats a centre dot when no heart fits', () => {
    expect(toOutputText(generateHeart({ cols: 2, rows: 1 }), 2).frames).toEqual(['10', '00', '10', '00']);
  });

  it('makes at most four changes a second at normal speed and stays at or under three flashes up to 1.25x', () => {
    const { frames, durations } = generateHeart({ cols: 7, rows: 6 });
    const busiest = (speed: number) => {
      const scaled = durations.map((ms) => ms / speed);
      const loop = scaled.reduce((sum, ms) => sum + ms, 0);
      const starts = scaled.map((_, index) => scaled.slice(0, index).reduce((sum, ms) => sum + ms, 0));
      const once = starts.filter((_, index) => frames[index].join() !== frames.at(index - 1)?.join());
      const times = [0, 1, 2].flatMap((lap) => once.map((time) => time + lap * loop));
      return Math.max(
        ...times.map((start) => times.filter((t) => t >= start && t < start + MS_PER_SECOND).length),
      );
    };
    expect(busiest(1)).toBeLessThanOrEqual(4);
    expect(busiest(FASTEST_SAFE_SPEED) / CHANGES_PER_FLASH).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('keeps flashes at or under three per second', () => {
    const { durations } = generateHeart({ cols: 7, rows: 6 });
    const cycleSeconds = durations.reduce((total, duration) => total + duration, 0) / MS_PER_SECOND;
    expect(LARGE_INDEXES.length / cycleSeconds).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it.each(CENTRED_GRIDS.map((grid) => [label(grid), grid] as const))(
    'centres both hearts exactly and mirror-symmetric on %s',
    (_, grid) => {
      generateHeart(grid).frames.forEach((frame) => {
        const bounds = boundsOf(frame, grid);
        expect(bounds.left).toBe(bounds.right);
        expect(bounds.top).toBe(bounds.bottom);
        expect(mirror(frame, grid.cols)).toEqual(frame);
      });
    },
  );

  it.each(ALL_GRIDS.map((grid) => [label(grid), grid] as const))(
    'centres the heart within half a cell and nests the small one on %s',
    (_, grid) => {
      const { frames, durations } = generateHeart(grid);
      const large = boundsOf(frames[0], grid);
      const small = boundsOf(frames[1], grid);
      expect(durations).toEqual(BEAT_DURATIONS);
      expect(large.right - large.left).toBeGreaterThanOrEqual(0);
      expect(large.right - large.left).toBeLessThanOrEqual(1);
      expect(large.bottom - large.top).toBeGreaterThanOrEqual(0);
      expect(large.bottom - large.top).toBeLessThanOrEqual(1);
      expect(small.left).toBeGreaterThan(large.left);
      expect(small.right).toBeGreaterThan(large.right);
      expect(small.top).toBeGreaterThan(large.top);
      expect(countLit(frames[1])).toBeLessThan(countLit(frames[0]));
    },
  );

  it.each(ALL_GRIDS.map((grid) => [label(grid), grid] as const))(
    'draws two bumps on the top row and solid runs below it on %s',
    (_, grid) => {
      const { frames } = generateHeart(grid);
      const rows = litRows(frames[0], grid.cols);
      expect(runsOf(rowOf(frames[0], grid.cols, rows[0]))).toBe(2);
      rows.slice(1).forEach((y) => expect(runsOf(rowOf(frames[0], grid.cols, y))).toBe(1));
    },
  );

  it.each(ALL_GRIDS.map((grid) => [label(grid), grid] as const))(
    'narrows the heart below its widest rows by one cell each side per row on %s',
    (_, grid) => {
      const frame = generateHeart(grid).frames[0];
      const widths = litRows(frame, grid.cols).map((y) => spanOf(rowOf(frame, grid.cols, y)));
      const widest = Math.max(...widths);
      const lastWide = widths.lastIndexOf(widest);
      widths.slice(lastWide + 1).forEach((width, index) => expect(width).toBe(widest - 2 * (index + 1)));
    },
  );

  it('repeats the same large and small frames in both beats', () => {
    ALL_GRIDS.forEach((grid) => {
      const { frames } = generateHeart(grid);
      expect(frames[LARGE_INDEXES[1]]).toEqual(frames[LARGE_INDEXES[0]]);
      expect(frames[SMALL_INDEXES[1]]).toEqual(frames[SMALL_INDEXES[0]]);
    });
  });
});
