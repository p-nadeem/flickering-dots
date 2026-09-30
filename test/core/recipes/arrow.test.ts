import { describe, expect, it } from 'vitest';

import { generateArrow } from '../../../src/core/recipes/arrow';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toOutputText } from './frame-text';

const FRAME_MS = 80;
const PAUSE_MS = 200;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;
const GRIDS: GridSize[] = [
  { cols: 3, rows: 3 },
  { cols: 5, rows: 5 },
  { cols: 7, rows: 7 },
  { cols: 9, rows: 9 },
  { cols: 12, rows: 12 },
  { cols: 16, rows: 8 },
  { cols: 10, rows: 3 },
  { cols: 8, rows: 6 },
  { cols: 6, rows: 4 },
  { cols: 7, rows: 6 },
];

function rowsOf(frame: Frame, grid: GridSize): Frame[] {
  return Array.from({ length: grid.rows }, (_, y) => frame.slice(y * grid.cols, (y + 1) * grid.cols));
}

function litColumns(frame: Frame, grid: GridSize): number[] {
  const rows = rowsOf(frame, grid);
  return Array.from({ length: grid.cols }, (_, x) => x).filter((x) => rows.some((row) => row[x] === 1));
}

function visibleFrames(grid: GridSize): Frame[] {
  return generateArrow(grid).frames.filter((frame) => countLit(frame) > 0);
}

function fullestFrame(grid: GridSize): Frame {
  const frames = visibleFrames(grid);
  const most = Math.max(...frames.map(countLit));
  const full = frames.filter((frame) => countLit(frame) === most);
  return full[Math.floor((full.length - 1) / 2)];
}

describe('generateArrow', () => {
  it('slides a 5-row arrow across 7x7 with a 1-cell margin and a blank pause', () => {
    expect(toOutputText(generateArrow({ cols: 7, rows: 7 }), 7)).toEqual({
      frames: [
        '0000000 0000000 0000000 1000000 0000000 0000000 0000000',
        '0000000 0000000 1000000 1100000 1000000 0000000 0000000',
        '0000000 1000000 0100000 1110000 0100000 1000000 0000000',
        '0000000 0100000 0010000 1111000 0010000 0100000 0000000',
        '0000000 0010000 0001000 1111100 0001000 0010000 0000000',
        '0000000 0001000 0000100 0111110 0000100 0001000 0000000',
        '0000000 0000100 0000010 0011111 0000010 0000100 0000000',
        '0000000 0000010 0000001 0001111 0000001 0000010 0000000',
        '0000000 0000001 0000000 0000111 0000000 0000001 0000000',
        '0000000 0000000 0000000 0000011 0000000 0000000 0000000',
        '0000000 0000000 0000000 0000001 0000000 0000000 0000000',
        '0000000 0000000 0000000 0000000 0000000 0000000 0000000',
      ],
      durations: [...Array.from({ length: 11 }, () => FRAME_MS), PAUSE_MS],
    });
  });

  it('slides a 3-row arrow across 5x5 with a 1-cell margin and a blank pause', () => {
    expect(toOutputText(generateArrow({ cols: 5, rows: 5 }), 5)).toEqual({
      frames: [
        '00000 00000 10000 00000 00000',
        '00000 10000 11000 10000 00000',
        '00000 01000 11100 01000 00000',
        '00000 00100 11110 00100 00000',
        '00000 00010 01111 00010 00000',
        '00000 00001 00111 00001 00000',
        '00000 00000 00011 00000 00000',
        '00000 00000 00001 00000 00000',
        '00000 00000 00000 00000 00000',
      ],
      durations: [...Array.from({ length: 8 }, () => FRAME_MS), PAUSE_MS],
    });
  });

  it.each(GRIDS)('never splits the arrow across the edges on $cols x $rows', (grid) => {
    for (const frame of visibleFrames(grid)) {
      const columns = litColumns(frame, grid);
      expect(columns.at(-1)! - columns[0]).toBe(columns.length - 1);
    }
  });

  it.each(GRIDS)('enters at the left edge and leaves at the right on $cols x $rows', (grid) => {
    const frames = visibleFrames(grid);
    expect(litColumns(frames[0], grid)).toEqual([0]);
    expect(litColumns(frames.at(-1)!, grid)).toEqual([grid.cols - 1]);
    frames.slice(1).forEach((frame, index) => {
      expect(litColumns(frame, grid)[0]).toBeGreaterThanOrEqual(litColumns(frames[index], grid)[0]);
      expect(litColumns(frame, grid).at(-1)).toBeGreaterThanOrEqual(litColumns(frames[index], grid).at(-1)!);
    });
  });

  it.each(GRIDS)('ends each loop with one blank pause on $cols x $rows', (grid) => {
    const { frames, durations } = generateArrow(grid);
    expect(frames.filter((frame) => countLit(frame) === 0)).toHaveLength(1);
    expect(countLit(frames.at(-1)!)).toBe(0);
    expect(durations).toEqual([...frames.slice(1).map(() => FRAME_MS), PAUSE_MS]);
  });

  it.each(GRIDS)('stays within 3 flashes per second on $cols x $rows', (grid) => {
    const { durations } = generateArrow(grid);
    const loopMs = durations.reduce((sum, ms) => sum + ms, 0);
    expect(MS_PER_SECOND / loopMs).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it.each(GRIDS)('is mirror-symmetric top to bottom on $cols x $rows', (grid) => {
    for (const frame of generateArrow(grid).frames) {
      const rows = rowsOf(frame, grid);
      expect([...rows].reverse()).toEqual(rows);
    }
  });

  it.each(GRIDS.filter((grid) => grid.rows >= 5))(
    'keeps a 1-cell margin above and below on $cols x $rows',
    (grid) => {
      for (const frame of generateArrow(grid).frames) {
        const rows = rowsOf(frame, grid);
        expect(countLit(rows[0])).toBe(0);
        expect(countLit(rows[grid.rows - 1])).toBe(0);
      }
    },
  );

  it.each(GRIDS.filter((grid) => grid.cols >= 5))(
    'shows the whole arrow centred once on $cols x $rows',
    (grid) => {
      const columns = litColumns(fullestFrame(grid), grid);
      const leftMargin = columns[0];
      const rightMargin = grid.cols - 1 - columns.at(-1)!;
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(1);
    },
  );

  it.each(GRIDS.filter((grid) => grid.rows % 2 === 1))(
    'draws a straight shaft and single diagonal head on $cols x $rows',
    (grid) => {
      const rows = rowsOf(fullestFrame(grid), grid);
      const middle = (grid.rows - 1) / 2;
      const shaft = rows[middle].flatMap((bit, x) => (bit === 1 ? [x] : []));
      const tip = shaft.at(-1)!;
      expect(tip - shaft[0]).toBe(shaft.length - 1);
      const head = rows
        .slice(0, middle)
        .reverse()
        .filter((row) => countLit(row) > 0);
      expect(head.length).toBeGreaterThan(0);
      head.forEach((row, index) => {
        expect(countLit(row)).toBe(1);
        expect(row.indexOf(1)).toBe(tip - index - 1);
      });
      expect(tip - head.length).toBeGreaterThan(shaft[0]);
    },
  );
});
