import { describe, expect, it } from 'vitest';

import { generateScanner } from '../../../src/core/recipes/scanner';
import type { Frame, GridSize } from '../../../src/core/types';

import { toOutputText } from './frame-text';

const MIN_SIDE = 3;
const MAX_SIDE = 16;
const STEP_MS = 65;
const EDGE_MS = 195;
const MS_PER_SECOND = 1000;
const MAX_FLASHES_PER_SECOND = 3;

const SIDES = Array.from({ length: MAX_SIDE - MIN_SIDE + 1 }, (_, index) => MIN_SIDE + index);
const GRIDS: GridSize[] = SIDES.flatMap((cols) => SIDES.map((rows) => ({ cols, rows })));

function headHeightOf(rows: number): number {
  if (rows <= 3) return rows;
  return rows % 2 === 1 ? 3 : 4;
}

function defaultTrailOf(cols: number): number {
  return Math.max(2, Math.round(cols / 5));
}

function stepMsOf(cols: number): number {
  if (cols === 3) return 155;
  return cols === 4 ? 78 : STEP_MS;
}

function toRows(frame: Frame, grid: GridSize): Frame[] {
  return Array.from({ length: grid.rows }, (_, y) => frame.slice(y * grid.cols, (y + 1) * grid.cols));
}

function mirrorX(frame: Frame, grid: GridSize): Frame {
  return toRows(frame, grid).flatMap((row) => [...row].reverse());
}

function mirrorY(frame: Frame, grid: GridSize): Frame {
  return [...toRows(frame, grid)].reverse().flat();
}

function litRowsOf(frame: Frame, grid: GridSize, x: number): number[] {
  return Array.from({ length: grid.rows }, (_, y) => y).filter((y) => frame[y * grid.cols + x] === 1);
}

function litColumnsOf(frame: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, (_, x) => x).filter((x) => litRowsOf(frame, grid, x).length > 0);
}

function headPathOf(cols: number): number[] {
  const forward = Array.from({ length: cols }, (_, x) => x);
  const back = Array.from({ length: Math.max(0, cols - 2) }, (_, index) => cols - 2 - index);
  return [...forward, ...back];
}

function range(from: number, length: number): number[] {
  return Array.from({ length }, (_, index) => from + index);
}

function maxCellFlashes(frames: Frame[]): number {
  const cells = Array.from({ length: frames[0].length }, (_, cell) => cell);
  const flashesOf = (cell: number) =>
    frames.filter(
      (frame, index) => frame[cell] === 1 && frames[(index + frames.length - 1) % frames.length][cell] === 0,
    ).length;
  return Math.max(...cells.map(flashesOf));
}

describe('generateScanner', () => {
  it('glides a bar with a two dot tail across 10x3 and back', () => {
    const { frames, durations } = toOutputText(generateScanner({ cols: 10, rows: 3 }, {}), 10);
    expect(frames.slice(0, 4)).toEqual([
      '1000000000 1000000000 1000000000',
      '0100000000 1100000000 0100000000',
      '0010000000 1110000000 0010000000',
      '0001000000 0111000000 0001000000',
    ]);
    expect(frames.slice(8, 12)).toEqual([
      '0000000010 0000001110 0000000010',
      '0000000001 0000000001 0000000001',
      '0000000010 0000000011 0000000010',
      '0000000100 0000000111 0000000100',
    ]);
    expect(frames).toHaveLength(18);
    expect(durations).toEqual(frames.map((_, index) => (index === 0 || index === 9 ? EDGE_MS : STEP_MS)));
  });

  it('takes about 1.4 s per round trip on 10x3', () => {
    const { durations } = generateScanner({ cols: 10, rows: 3 }, {});
    expect(durations.reduce((total, value) => total + value, 0)).toBe(1430);
  });

  it('steps across the middle of 3x3, slowed to stay under the flash limit', () => {
    expect(toOutputText(generateScanner({ cols: 3, rows: 3 }, {}), 3)).toEqual({
      frames: ['100 100 100', '010 110 010', '001 001 001', '010 011 010'],
      durations: [EDGE_MS, 155, EDGE_MS, 155],
    });
  });

  it('slows the steps on 4 columns only as far as the flash limit needs', () => {
    expect(generateScanner({ cols: 4, rows: 3 }, {}).durations).toEqual([EDGE_MS, 78, 78, EDGE_MS, 78, 78]);
  });

  it('centres a four dot head with a two row tail on 16x16', () => {
    const grid = { cols: 16, rows: 16 };
    const frame = generateScanner(grid, {}).frames[5];
    expect(litRowsOf(frame, grid, 5)).toEqual([6, 7, 8, 9]);
    [2, 3, 4].forEach((x) => expect(litRowsOf(frame, grid, x)).toEqual([7, 8]));
    expect(litColumnsOf(frame, grid)).toEqual([2, 3, 4, 5]);
  });

  it('uses params.trail for the tail length', () => {
    const grid = { cols: 10, rows: 3 };
    expect(litColumnsOf(generateScanner(grid, { trail: 4 }).frames[6], grid)).toEqual([2, 3, 4, 5, 6]);
    expect(litColumnsOf(generateScanner(grid, { trail: 0 }).frames[6], grid)).toEqual([6]);
  });

  it.each(GRIDS)('moves a centred bar one column per frame on $cols x $rows', (grid) => {
    const { frames, durations } = generateScanner(grid, {});
    const path = headPathOf(grid.cols);
    const headHeight = headHeightOf(grid.rows);
    const tailHeight = Math.max(1, headHeight - 2);
    expect(frames).toHaveLength(path.length);
    expect(durations).toHaveLength(path.length);
    frames.forEach((frame, index) => {
      const head = path[index];
      const isEdge = head === 0 || head === grid.cols - 1;
      const direction = index < grid.cols ? 1 : -1;
      const tail = isEdge ? [] : range(1, defaultTrailOf(grid.cols)).map((step) => head - step * direction);
      const tailColumns = tail.filter((x) => x >= 0 && x < grid.cols);
      expect(frame).toHaveLength(grid.cols * grid.rows);
      expect(litRowsOf(frame, grid, head)).toEqual(
        range(Math.floor((grid.rows - headHeight) / 2), headHeight),
      );
      tailColumns.forEach((x) =>
        expect(litRowsOf(frame, grid, x)).toEqual(
          range(Math.floor((grid.rows - tailHeight) / 2), tailHeight),
        ),
      );
      expect(litColumnsOf(frame, grid)).toEqual([head, ...tailColumns].sort((a, b) => a - b));
      expect(durations[index]).toBe(isEdge ? EDGE_MS : stepMsOf(grid.cols));
    });
  });

  it.each(GRIDS)('is mirror symmetric on $cols x $rows', (grid) => {
    const { frames } = generateScanner(grid, {});
    frames.forEach((frame, index) => {
      expect(mirrorY(frame, grid)).toEqual(frame);
      expect(mirrorX(frame, grid)).toEqual(frames[(index + grid.cols - 1) % frames.length]);
    });
  });

  it.each(GRIDS)('stays under three flashes per second per cell on $cols x $rows', (grid) => {
    const { frames, durations } = generateScanner(grid, {});
    const loopSeconds = durations.reduce((total, value) => total + value, 0) / MS_PER_SECOND;
    expect(maxCellFlashes(frames) / loopSeconds).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('defaults params when omitted', () => {
    const grid = { cols: 12, rows: 5 };
    expect(generateScanner(grid)).toEqual(generateScanner(grid, {}));
  });
});
