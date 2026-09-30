import { describe, expect, it } from 'vitest';

import { generateCross } from '../../../src/core/recipes/cross';
import type { Frame, GridSize } from '../../../src/core/types';

import { toOutputText } from './frame-text';
import {
  ALL_GRIDS,
  MAX_FLASHES_PER_WINDOW,
  boundingBox,
  centredStart,
  countBlinks,
  expectedInset,
  expectedSide,
  labelled,
  litCells,
  maxFlashesPerSecond,
} from './result-geometry';
import type { Cell } from './result-geometry';

const HOLD_MS = 1500;
const SHAKE_MS = 60;
const MAX_BLINKS = 2;
const SHAKE_OFFSETS = [-1, 0, 1] as const;

function hasShakeRoom(grid: GridSize): boolean {
  const side = expectedSide(grid);
  const left = centredStart(grid.cols, side);
  return left >= 1 && grid.cols - side - left >= 1;
}

const SHAKE_GRIDS = ALL_GRIDS.filter(hasShakeRoom);
const BLINK_GRIDS = ALL_GRIDS.filter((grid) => !hasShakeRoom(grid));

function finalCells(grid: GridSize): Cell[] {
  return litCells(generateCross(grid).frames.at(-1) ?? [], grid.cols);
}

function isOnDiagonal([x, y]: Cell, left: number, top: number, side: number): boolean {
  return x - left === y - top || x - left + (y - top) === side - 1;
}

function shiftedKeys(cells: readonly Cell[], dx: number): string[] {
  return cells.map(([x, y]) => `${x + dx},${y}`).sort();
}

function frameKeys(frame: Frame, cols: number): string[] {
  return shiftedKeys(litCells(frame, cols), 0);
}

describe('generateCross', () => {
  it('draws one diagonal and then the other, shakes one column at a time and holds on 7x7', () => {
    const full = '0000000 0100010 0010100 0001000 0010100 0100010 0000000';
    expect(toOutputText(generateCross({ cols: 7, rows: 7 }), 7)).toEqual({
      frames: [
        '0000000 0100000 0000000 0000000 0000000 0000000 0000000',
        '0000000 0100000 0010000 0000000 0000000 0000000 0000000',
        '0000000 0100000 0010000 0001000 0000000 0000000 0000000',
        '0000000 0100000 0010000 0001000 0000100 0000000 0000000',
        '0000000 0100000 0010000 0001000 0000100 0000010 0000000',
        '0000000 0100010 0010000 0001000 0000100 0000010 0000000',
        '0000000 0100010 0010100 0001000 0000100 0000010 0000000',
        '0000000 0100010 0010100 0001000 0010100 0000010 0000000',
        full,
        '0000000 1000100 0101000 0010000 0101000 1000100 0000000',
        full,
        '0000000 0010001 0001010 0000100 0001010 0010001 0000000',
        full,
      ],
      durations: [40, 40, 40, 40, 40, 40, 40, 40, 60, 60, 60, 60, 1500],
    });
  });

  it('draws a full X centred on 9x3', () => {
    expect(toOutputText(generateCross({ cols: 9, rows: 3 }), 9).frames.at(-1)).toBe(
      '000101000 000010000 000101000',
    );
  });

  it('draws a full-size X on 5x5 and 12x5', () => {
    expect(toOutputText(generateCross({ cols: 5, rows: 5 }), 5).frames.at(-1)).toBe(
      '10001 01010 00100 01010 10001',
    );
    expect(toOutputText(generateCross({ cols: 12, rows: 5 }), 12).frames.at(-1)).toBe(
      '000100010000 000010100000 000001000000 000010100000 000100010000',
    );
  });

  it('draws an even X exactly centred on 8x6', () => {
    expect(toOutputText(generateCross({ cols: 8, rows: 6 }), 8).frames.at(-1)).toBe(
      '01000010 00100100 00011000 00011000 00100100 01000010',
    );
  });

  it('blinks twice instead of shaking when there is no column to shake into on 3x3', () => {
    expect(toOutputText(generateCross({ cols: 3, rows: 3 }), 3)).toEqual({
      frames: [
        '100 000 000',
        '100 010 000',
        '100 010 001',
        '101 010 001',
        '101 010 101',
        '000 000 000',
        '101 010 101',
        '000 000 000',
        '101 010 101',
      ],
      durations: [40, 40, 40, 40, 60, 160, 160, 160, 1500],
    });
  });

  it.each(labelled(ALL_GRIDS))('adds one cell per stroke frame, one diagonal at a time, on %s', (_, grid) => {
    const side = expectedSide(grid);
    const { frames } = generateCross(grid);
    const strokeCount = side % 2 === 1 ? 2 * side - 1 : 2 * side;
    const counts = frames.slice(0, strokeCount).map((frame) => litCells(frame, grid.cols).length);

    expect(counts).toEqual(Array.from({ length: strokeCount }, (_, index) => index + 1));
  });

  it.each(labelled(ALL_GRIDS))('ends on a true 45-degree X in a centred square on %s', (_, grid) => {
    const cells = finalCells(grid);
    const side = expectedSide(grid);
    const box = boundingBox(cells);
    const isOdd = side % 2 === 1;

    expect(isOdd || ((grid.cols - side) % 2 === 0 && (grid.rows - side) % 2 === 0)).toBe(true);
    expect(box).toEqual({
      left: centredStart(grid.cols, side),
      top: centredStart(grid.rows, side),
      width: side,
      height: side,
    });
    expect(cells).toHaveLength(isOdd ? 2 * side - 1 : 2 * side);
    expect(cells.every((cell) => isOnDiagonal(cell, box.left, box.top, side))).toBe(true);
  });

  it.each(labelled(ALL_GRIDS))('keeps the inset margin around the X on %s', (_, grid) => {
    const inset = expectedInset(grid);
    const box = boundingBox(finalCells(grid));

    expect(box.left).toBeGreaterThanOrEqual(inset);
    expect(box.top).toBeGreaterThanOrEqual(inset);
    expect(grid.cols - box.left - box.width).toBeGreaterThanOrEqual(inset);
    expect(grid.rows - box.top - box.height).toBeGreaterThanOrEqual(inset);
  });

  it.each(labelled(ALL_GRIDS))(
    'only ever lights cells of the X or the X shifted one column on %s',
    (_, grid) => {
      const cells = finalCells(grid);
      const allowed = new Set([-1, 0, 1].flatMap((dx) => shiftedKeys(cells, dx)));
      const { frames } = generateCross(grid);

      expect(frames.every((frame) => frameKeys(frame, grid.cols).every((key) => allowed.has(key)))).toBe(
        true,
      );
    },
  );

  it.each(labelled(SHAKE_GRIDS))('shakes the whole X one column at a time on %s', (_, grid) => {
    const cells = finalCells(grid);
    const { frames, durations } = generateCross(grid);
    const shake = frames.slice(-4, -1).map((frame) => frameKeys(frame, grid.cols));

    expect(shake).toEqual(SHAKE_OFFSETS.map((dx) => shiftedKeys(cells, dx)));
    expect(durations.slice(-5, -1)).toEqual([SHAKE_MS, SHAKE_MS, SHAKE_MS, SHAKE_MS]);
    expect(countBlinks(frames)).toBe(0);
  });

  it.each(labelled(BLINK_GRIDS))('blinks twice when there is no room to shake on %s', (_, grid) => {
    expect(countBlinks(generateCross(grid).frames)).toBe(MAX_BLINKS);
  });

  it.each(labelled(ALL_GRIDS))('stays within the flash limit and holds on %s', (_, grid) => {
    const { frames, durations } = generateCross(grid);

    expect(countBlinks(frames)).toBeLessThanOrEqual(MAX_BLINKS);
    expect(maxFlashesPerSecond(frames, durations)).toBeLessThanOrEqual(MAX_FLASHES_PER_WINDOW);
    expect(durations).toHaveLength(frames.length);
    expect(durations.at(-1)).toBe(HOLD_MS);
  });
});
