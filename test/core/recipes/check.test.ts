import { describe, expect, it } from 'vitest';

import { generateCheck } from '../../../src/core/recipes/check';
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
  lowCentredStart,
  maxFlashesPerSecond,
} from './result-geometry';
import type { Cell } from './result-geometry';

const HOLD_MS = 1500;
const BASELINE_GRIDS: readonly GridSize[] = [
  { cols: 5, rows: 5 },
  { cols: 7, rows: 7 },
  { cols: 9, rows: 7 },
  { cols: 8, rows: 6 },
  { cols: 7, rows: 6 },
];

function addedCell(previous: Frame, next: Frame, cols: number): Cell {
  const index = next.findIndex((bit, cellIndex) => bit === 1 && previous[cellIndex] === 0);
  return [index % cols, Math.floor(index / cols)];
}

function strokeOrder(grid: GridSize): Cell[] {
  const { frames } = generateCheck(grid);
  return frames.slice(1).map((frame, index) => addedCell(frames[index], frame, grid.cols));
}

function finalBox(frames: readonly Frame[], cols: number) {
  return boundingBox(litCells(frames.at(-1) ?? [], cols));
}

function cornerIndex(cells: readonly Cell[]): number {
  const lowest = Math.max(...cells.map(([, y]) => y));
  return cells.findIndex(([, y]) => y === lowest);
}

describe('generateCheck', () => {
  it('draws a 5 by 4 tick seated on the bottom row of the cross on 7x7', () => {
    expect(toOutputText(generateCheck({ cols: 7, rows: 7 }), 7)).toEqual({
      frames: [
        '0000000 0000000 0000000 0000000 0000000 0000000 0000000',
        '0000000 0000000 0000000 0000000 0100000 0000000 0000000',
        '0000000 0000000 0000000 0000000 0100000 0010000 0000000',
        '0000000 0000000 0000000 0000000 0101000 0010000 0000000',
        '0000000 0000000 0000000 0000100 0101000 0010000 0000000',
        '0000000 0000000 0000010 0000100 0101000 0010000 0000000',
      ],
      durations: [80, 45, 45, 45, 45, 1500],
    });
  });

  it('draws a 4 by 3 tick with its corner under the centre of the cross on 9x3', () => {
    expect(toOutputText(generateCheck({ cols: 9, rows: 3 }), 9).frames.at(-1)).toBe(
      '000000100 000101000 000010000',
    );
  });

  it('draws a small V on the bottom two rows of 3x3', () => {
    expect(toOutputText(generateCheck({ cols: 3, rows: 3 }), 3)).toEqual({
      frames: ['000 000 000', '000 100 000', '000 100 010', '000 101 010'],
      durations: [80, 45, 45, 1500],
    });
  });

  it('draws a real tick with a long arm of 3 one row below centre on 5x5', () => {
    expect(toOutputText(generateCheck({ cols: 5, rows: 5 }), 5).frames.at(-1)).toBe(
      '00000 00001 00010 10100 01000',
    );
  });

  it('draws a 5 by 4 tick seated on the bottom row on 12x5', () => {
    expect(toOutputText(generateCheck({ cols: 12, rows: 5 }), 12).frames.at(-1)).toBe(
      '000000000000 000000001000 000000010000 000010100000 000001000000',
    );
  });

  it('draws a 7 by 5 tick seated on the bottom row on 8x6', () => {
    expect(toOutputText(generateCheck({ cols: 8, rows: 6 }), 8).frames.at(-1)).toBe(
      '00000000 00000001 00000010 01000100 00101000 00010000',
    );
  });

  it.each(labelled(ALL_GRIDS))('puts an odd spare row above the tick, never below, on %s', (_, grid) => {
    const side = expectedSide(grid);
    const squareTop = centredStart(grid.rows, side);
    const box = finalBox(generateCheck(grid).frames, grid.cols);
    const rowsAbove = box.top - squareTop;
    const rowsBelow = squareTop + side - (box.top + box.height);

    expect(rowsAbove - rowsBelow).toBe((side - box.height) % 2);
  });

  it.each(labelled(BASELINE_GRIDS))('shares its lowest row with the cross on %s', (_, grid) => {
    const check = finalBox(generateCheck(grid).frames, grid.cols);
    const cross = finalBox(generateCross(grid).frames, grid.cols);

    expect(check.top + check.height).toBe(cross.top + cross.height);
  });

  it('looks clearly different from the cross on 3x3', () => {
    const grid = { cols: 3, rows: 3 };
    const check = generateCheck(grid).frames.at(-1) ?? [];
    const cross = generateCross(grid).frames.at(-1) ?? [];

    expect(check.filter((bit, index) => bit !== cross[index]).length).toBeGreaterThan(2);
  });

  it.each(labelled(ALL_GRIDS))('adds one diagonal neighbour per frame on %s', (_, grid) => {
    const cells = strokeOrder(grid);
    const steps = cells.slice(1).map(([x, y], index) => [x - cells[index][0], y - cells[index][1]]);

    expect(steps.every(([dx, dy]) => dx === 1 && Math.abs(dy) === 1)).toBe(true);
  });

  it.each(labelled(ALL_GRIDS))('goes down once and then up once on %s', (_, grid) => {
    const cells = strokeOrder(grid);
    const directions = cells.slice(1).map(([, y], index) => Math.sign(y - cells[index][1]));
    const turns = directions.slice(1).filter((direction, index) => direction !== directions[index]);

    expect(directions[0]).toBe(1);
    expect(directions.at(-1)).toBe(-1);
    expect(turns).toHaveLength(1);
  });

  it.each(labelled(ALL_GRIDS))('keeps the short arm half the long arm, at least one, on %s', (_, grid) => {
    const cells = strokeOrder(grid);
    const corner = cornerIndex(cells);
    const long = cells.length - 1 - corner;

    expect(corner).toBe(Math.max(1, Math.floor(long / 2)));
  });

  it.each(labelled(ALL_GRIDS))(
    'fits the same inset and height as the cross, placed low and right, on %s',
    (_, grid) => {
      const side = expectedSide(grid);
      const inset = expectedInset(grid);
      const box = finalBox(generateCheck(grid).frames, grid.cols);

      expect(box.height).toBeLessThanOrEqual(side);
      expect(box.width).toBeLessThanOrEqual(Math.min(grid.cols - 2 * inset, side + 1));
      expect(box.width).toBeGreaterThanOrEqual(side - 1);
      expect(box.left).toBe(lowCentredStart(grid.cols, box.width));
      expect(box.top).toBe(centredStart(grid.rows, side) + lowCentredStart(side, box.height));
    },
  );

  it.each(labelled(ALL_GRIDS))('sits inside the rows of the cross on %s', (_, grid) => {
    const check = finalBox(generateCheck(grid).frames, grid.cols);
    const cross = finalBox(generateCross(grid).frames, grid.cols);

    expect(check.top).toBeGreaterThanOrEqual(cross.top);
    expect(check.top + check.height).toBeLessThanOrEqual(cross.top + cross.height);
  });

  it.each(labelled(ALL_GRIDS))('uses the longest arm that fits on %s', (_, grid) => {
    const side = expectedSide(grid);
    const inset = expectedInset(grid);
    const box = finalBox(generateCheck(grid).frames, grid.cols);
    const nextLong = box.height;
    const nextWidth = Math.max(1, Math.floor(nextLong / 2)) + nextLong + 1;

    expect(nextLong > side - 1 || nextWidth > Math.min(grid.cols - 2 * inset, side + 1)).toBe(true);
  });

  it.each(labelled(ALL_GRIDS))('plays once without blinking and holds on %s', (_, grid) => {
    const { frames, durations } = generateCheck(grid);

    expect(countBlinks(frames)).toBe(0);
    expect(maxFlashesPerSecond(frames, durations)).toBeLessThanOrEqual(MAX_FLASHES_PER_WINDOW);
    expect(durations).toHaveLength(frames.length);
    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(litCells(frames.at(-1) ?? [], grid.cols)).toHaveLength(frames.length - 1);
  });
});
