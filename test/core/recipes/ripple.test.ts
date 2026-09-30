import { describe, expect, it } from 'vitest';

import { RIPPLE_DEFAULTS, generateRipple } from '../../../src/core/recipes/ripple';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toFrameText, toOutputText } from './frame-text';

const RING_MS = 120;
const BLANK_MS = 240;
const MIN_CYCLE_MS = 340;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;

const SQUARE_SIDES = Array.from({ length: 16 }, (_, index) => index + 1);
const RECTANGLES: GridSize[] = [
  { cols: 9, rows: 7 },
  { cols: 16, rows: 4 },
  { cols: 12, rows: 5 },
  { cols: 7, rows: 5 },
  { cols: 10, rows: 3 },
  { cols: 16, rows: 8 },
];
const ALL_GRIDS: GridSize[] = [...SQUARE_SIDES.map((side) => ({ cols: side, rows: side })), ...RECTANGLES];

function toRows(frame: Frame, cols: number): string[] {
  return toFrameText(frame, cols).split(' ');
}

function isMirrored(rows: readonly string[]): boolean {
  const isMirroredLeftRight = rows.every((row) => row === [...row].reverse().join(''));
  const isMirroredTopBottom = rows.every((row, index) => row === rows[rows.length - 1 - index]);
  return isMirroredLeftRight && isMirroredTopBottom;
}

function isLitAt(rows: readonly string[], x: number, y: number): boolean {
  return rows[y]?.[x] === '1';
}

function countLitNeighbours(rows: readonly string[], x: number, y: number): number {
  const offsets = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const));
  return offsets.filter(([dx, dy]) => (dx !== 0 || dy !== 0) && isLitAt(rows, x + dx, y + dy)).length;
}

function getLitCells(rows: readonly string[]): (readonly [number, number])[] {
  return rows.flatMap((row, y) => [...row].flatMap((bit, x) => (bit === '1' ? [[x, y] as const] : [])));
}

function hasLCorner(rows: readonly string[], x: number, y: number): boolean {
  const hasHorizontal = isLitAt(rows, x - 1, y) || isLitAt(rows, x + 1, y);
  const hasVertical = isLitAt(rows, x, y - 1) || isLitAt(rows, x, y + 1);
  return hasHorizontal && hasVertical;
}

function getBounds(rows: readonly string[]): { left: number; top: number; right: number; bottom: number } {
  const cells = getLitCells(rows);
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

function getRingFrames(grid: GridSize): Frame[] {
  return generateRipple(grid).frames.slice(0, -1);
}

describe('generateRipple', () => {
  it('draws five full rings then a blank frame on 9x9', () => {
    expect(toOutputText(generateRipple({ cols: 9, rows: 9 }), 9)).toEqual({
      frames: [
        '000000000 000000000 000000000 000000000 000010000 000000000 000000000 000000000 000000000',
        '000000000 000000000 000000000 000010000 000101000 000010000 000000000 000000000 000000000',
        '000000000 000000000 000111000 001000100 001000100 001000100 000111000 000000000 000000000',
        '000000000 000111000 001000100 010000010 010000010 010000010 001000100 000111000 000000000',
        '000111000 001000100 010000010 100000001 100000001 100000001 010000010 001000100 000111000',
        '000000000 000000000 000000000 000000000 000000000 000000000 000000000 000000000 000000000',
      ],
      durations: [RING_MS, RING_MS, RING_MS, RING_MS, RING_MS, BLANK_MS],
    });
  });

  it('draws three rings then a blank frame on 5x5', () => {
    expect(toOutputText(generateRipple({ cols: 5, rows: 5 }), 5)).toEqual({
      frames: [
        '00000 00000 00100 00000 00000',
        '00000 00100 01010 00100 00000',
        '01110 10001 10001 10001 01110',
        '00000 00000 00000 00000 00000',
      ],
      durations: [RING_MS, RING_MS, RING_MS, BLANK_MS],
    });
  });

  it('starts from the 2x2 centre on even grids', () => {
    expect(toOutputText(generateRipple({ cols: 6, rows: 6 }), 6)).toEqual({
      frames: [
        '000000 000000 001100 001100 000000 000000',
        '000000 001100 010010 010010 001100 000000',
        '001100 010010 100001 100001 010010 001100',
        '000000 000000 000000 000000 000000 000000',
      ],
      durations: [RING_MS, RING_MS, RING_MS, BLANK_MS],
    });
  });

  it('starts from the two centre cells when only one side is even', () => {
    expect(toOutputText(generateRipple({ cols: 10, rows: 3 }), 10)).toEqual({
      frames: [
        '0000000000 0000110000 0000000000',
        '0000110000 0001001000 0000110000',
        '0000000000 0000000000 0000000000',
      ],
      durations: [RING_MS, RING_MS, BLANK_MS],
    });
  });

  it('never draws an echo ring, whatever the trail', () => {
    expect(RIPPLE_DEFAULTS).toEqual({});
    expect(generateRipple({ cols: 7, rows: 7 }, { trail: 1 })).toEqual(generateRipple({ cols: 7, rows: 7 }));
  });

  it.each(ALL_GRIDS)('ends on one blank frame on $cols x $rows', (grid) => {
    const { frames, durations } = generateRipple(grid);

    expect(countLit(frames[frames.length - 1])).toBe(0);
    expect(durations[durations.length - 1]).toBeGreaterThanOrEqual(BLANK_MS);
    expect(getRingFrames(grid).every((frame) => countLit(frame) > 0)).toBe(true);
  });

  it.each(ALL_GRIDS)('draws every ring mirror-symmetric on $cols x $rows', (grid) => {
    const rings = getRingFrames(grid).map((frame) => toRows(frame, grid.cols));

    expect(rings.every(isMirrored)).toBe(true);
  });

  it.each(ALL_GRIDS)('draws closed one-dot-wide rings with no stray cells on $cols x $rows', (grid) => {
    const rings = getRingFrames(grid)
      .slice(1)
      .map((frame) => toRows(frame, grid.cols));

    rings.forEach((rows) => {
      const cells = getLitCells(rows);
      expect(cells.every(([x, y]) => countLitNeighbours(rows, x, y) === 2)).toBe(true);
      expect(cells.some(([x, y]) => hasLCorner(rows, x, y))).toBe(false);
    });
  });

  it.each(ALL_GRIDS)('grows each ring by one cell on every side on $cols x $rows', (grid) => {
    const bounds = getRingFrames(grid).map((frame) => getBounds(toRows(frame, grid.cols)));

    bounds.slice(1).forEach((current, index) => {
      const previous = bounds[index];
      expect(current).toEqual({
        left: previous.left - 1,
        top: previous.top - 1,
        right: previous.right + 1,
        bottom: previous.bottom + 1,
      });
    });
  });

  it.each(ALL_GRIDS)('stops at the last ring that fits unclipped on $cols x $rows', (grid) => {
    const rings = getRingFrames(grid).map((frame) => toRows(frame, grid.cols));
    const last = getBounds(rings[rings.length - 1]);
    const touchesSides = last.left === 0 && last.right === grid.cols - 1;
    const touchesEnds = last.top === 0 && last.bottom === grid.rows - 1;

    expect(touchesSides || touchesEnds).toBe(true);
    expect(last.left + last.right).toBe(grid.cols - 1);
    expect(last.top + last.bottom).toBe(grid.rows - 1);
  });

  it.each(ALL_GRIDS)('keeps the loop at or under three flashes a second on $cols x $rows', (grid) => {
    const cycleMs = generateRipple(grid).durations.reduce((sum, duration) => sum + duration, 0);

    expect(MS_PER_SECOND / cycleMs).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('keeps a tiny grid with a single ring at or above the shortest cycle', () => {
    expect(toOutputText(generateRipple({ cols: 1, rows: 1 }), 1)).toEqual({
      frames: ['1', '0'],
      durations: [RING_MS, Math.max(BLANK_MS, MIN_CYCLE_MS - RING_MS)],
    });
  });

  it('samples rings evenly when frames is set', () => {
    const all = generateRipple({ cols: 9, rows: 9 }).frames;
    const sampled = generateRipple({ cols: 9, rows: 9 }, { frames: 4 });

    expect(sampled.frames).toEqual([all[0], all[2], all[4], all[5]]);
    expect(sampled.durations).toEqual([RING_MS, RING_MS, RING_MS, BLANK_MS]);
  });

  it('never repeats a ring when frames asks for more than fit', () => {
    expect(generateRipple({ cols: 5, rows: 5 }, { frames: 12 })).toEqual(
      generateRipple({ cols: 5, rows: 5 }),
    );
  });

  it('renders one dark frame when frames is 1', () => {
    expect(toOutputText(generateRipple({ cols: 5, rows: 5 }, { frames: 1 }), 5)).toEqual({
      frames: ['00000 00000 00000 00000 00000'],
      durations: [BLANK_MS],
    });
  });
});
