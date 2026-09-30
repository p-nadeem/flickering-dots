import { describe, expect, it } from 'vitest';

import { generateFill } from '../../../src/core/recipes/fill';
import type { Frame, GridSize } from '../../../src/core/types';

import { toFrameText, toOutputText } from './frame-text';

const MIN_SIDE = 3;
const MAX_SIDE = 16;
const MS_PER_SECOND = 1000;
const MAX_FLASHES_PER_SECOND = 3;
const BLINK_MAX_SEGMENTS = 8;
const BLINK_MS = 170;
const STEP_MS = 90;
const ENDING_MS = [420, 140, 420, 300];

const SIDES = Array.from({ length: MAX_SIDE - MIN_SIDE + 1 }, (_, index) => MIN_SIDE + index);
const GRIDS: GridSize[] = SIDES.flatMap((cols) => SIDES.map((rows) => ({ cols, rows })));
const LENGTHS = [1, 2, 3, 5, 8];
const SEGMENTED: [GridSize, number][] = GRIDS.flatMap((grid) =>
  LENGTHS.filter((length) => length < grid.cols).map((length): [GridSize, number] => [grid, length]),
);

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

function columnRows(frame: Frame, grid: GridSize, x: number): number[] {
  return Array.from({ length: grid.rows }, (_, y) => y).filter((y) => frame[y * grid.cols + x] === 1);
}

function isCentredRun(rows: number[], gridRows: number): boolean {
  if (rows.length === 0) return false;
  const top = rows[0];
  const isContiguous = rows.every((row, index) => row === top + index);
  const bottomMargin = gridRows - (top + rows.length);
  return isContiguous && Math.abs(top - bottomMargin) <= 1;
}

function litColumns(frame: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, (_, x) => x).filter((x) => columnRows(frame, grid, x).length > 0);
}

function segmentStarts(columns: number[]): number[] {
  return columns.filter((x, index) => index === 0 || columns[index - 1] !== x - 1);
}

function risingEdgeTimes(frames: Frame[], durations: number[], cell: number): number[] {
  const starts = durations.map((_, index) => sum(durations.slice(0, index)));
  return frames.flatMap((frame, index) => {
    const previous = frames[(index + frames.length - 1) % frames.length];
    return frame[cell] === 1 && previous[cell] === 0 ? [starts[index]] : [];
  });
}

function maxFlashesInOneSecond(frames: Frame[], durations: number[]): number {
  const loop = sum(durations);
  const cells = Array.from({ length: frames[0].length }, (_, cell) => cell);
  return Math.max(
    ...cells.flatMap((cell) => {
      const times = risingEdgeTimes(frames, durations, cell);
      const unrolled = [...times, ...times.map((time) => time + loop)];
      return times.map(
        (start) => unrolled.filter((time) => time >= start && time < start + MS_PER_SECOND).length,
      );
    }),
    0,
  );
}

describe('generateFill', () => {
  it('fills one column at a time over a middle-row track on 12x3, then flashes full', () => {
    const grid = { cols: 12, rows: 3 };
    const output = generateFill(grid, {});
    const { frames, durations } = toOutputText(output, grid.cols);
    expect(frames.slice(0, 3)).toEqual([
      '100000000000 111111111111 100000000000',
      '110000000000 111111111111 110000000000',
      '111000000000 111111111111 111000000000',
    ]);
    expect(frames.slice(10)).toEqual([
      '111111111110 111111111111 111111111110',
      '111111111111 111111111111 111111111111',
      '000000000000 111111111111 000000000000',
      '111111111111 111111111111 111111111111',
      '000000000000 111111111111 000000000000',
    ]);
    expect(durations).toEqual([...Array.from({ length: 11 }, () => STEP_MS), ...ENDING_MS]);
    expect(sum(durations)).toBe(2270);
    expect(frames[output.still ?? -1]).toBe('111111100000 111111111111 111111100000');
  });

  it('blinks the current step dot on, off and on, then leaves it standing, on 9x3', () => {
    const grid = { cols: 9, rows: 3 };
    const output = generateFill(grid, { length: 5 });
    const { frames, durations } = toOutputText(output, grid.cols);
    expect(frames.slice(0, 6)).toEqual([
      '100000000 101010101 100000000',
      '000000000 101010101 000000000',
      '100000000 101010101 100000000',
      '101000000 101010101 101000000',
      '100000000 101010101 100000000',
      '101000000 101010101 101000000',
    ]);
    expect(frames.slice(13)).toEqual([
      '101010100 101010101 101010100',
      '101010101 101010101 101010101',
      '000000000 101010101 000000000',
      '101010101 101010101 101010101',
      '000000000 101010101 000000000',
    ]);
    expect(durations).toEqual([...Array.from({ length: 14 }, () => BLINK_MS), ...ENDING_MS]);
    expect(sum(durations)).toBe(3660);
    expect(frames[output.still ?? -1]).toBe('101010000 101010101 101010000');
  });

  it('blinks every column on 3x3', () => {
    const { frames } = toOutputText(generateFill({ cols: 3, rows: 3 }, {}), 3);
    expect(frames).toEqual([
      '100 111 100',
      '000 111 000',
      '100 111 100',
      '110 111 110',
      '100 111 100',
      '110 111 110',
      '111 111 111',
      '110 111 110',
      '111 111 111',
      '000 111 000',
      '111 111 111',
      '000 111 000',
    ]);
  });

  it.each([...GRIDS.map((grid): [GridSize, number] => [grid, 0]), ...SEGMENTED])(
    'changes one segment per frame and never repeats a frame on %o with length %i',
    (grid, length) => {
      const { frames } = generateFill(grid, { length });
      const starts = segmentStarts(litColumns(frames[frames.length - 4], grid));
      const segmentOf = (x: number) => starts.filter((start) => start <= x).length - 1;
      const progress = frames.slice(0, -3);
      progress.slice(1).forEach((frame, index) => {
        const changed = Array.from({ length: grid.cols }, (_, x) => x).filter(
          (x) => columnRows(frame, grid, x).join() !== columnRows(progress[index], grid, x).join(),
        );
        expect(new Set(changed.map(segmentOf)).size).toBe(1);
      });
      frames.forEach((frame, index) => {
        expect(toFrameText(frame, grid.cols)).not.toBe(toFrameText(frames.at(index - 1) ?? [], grid.cols));
      });
    },
  );

  it('puts a four-row fill over a two-row track on 16x6', () => {
    const grid = { cols: 16, rows: 6 };
    const [first] = generateFill(grid, {}).frames;
    expect(toFrameText(first, grid.cols).split(' ')).toEqual([
      '0000000000000000',
      '1000000000000000',
      '1111111111111111',
      '1111111111111111',
      '1000000000000000',
      '0000000000000000',
    ]);
  });

  it('uses wider segments with one-column gaps when length is below cols', () => {
    const grid = { cols: 16, rows: 3 };
    const [first] = generateFill(grid, { length: 4 }).frames;
    expect(toFrameText(first, grid.cols)).toBe('1110000000000000 1110111011101110 1110000000000000');
  });

  it('clamps length to the grid and treats 0 as the default', () => {
    const grid = { cols: 7, rows: 3 };
    expect(generateFill(grid, { length: 99 })).toEqual(generateFill(grid, {}));
    expect(generateFill(grid, { length: 0 })).toEqual(generateFill(grid, {}));
    expect(generateFill(grid, { length: 6 })).toEqual(generateFill(grid, { length: 4 }));
  });

  it.each(GRIDS)('reads as a centred bar on $cols x $rows', (grid) => {
    const { frames, durations } = generateFill(grid, {});
    const blinks = grid.cols <= BLINK_MAX_SEGMENTS;
    expect(frames).toHaveLength((blinks ? 3 : 1) * grid.cols - 1 + ENDING_MS.length);
    expect(durations).toHaveLength(frames.length);
    const full = frames[frames.length - 4];
    const empty = frames[frames.length - 3];
    const band = columnRows(full, grid, 0);
    const track = columnRows(empty, grid, 0);
    expect(isCentredRun(band, grid.rows)).toBe(true);
    expect(isCentredRun(track, grid.rows)).toBe(true);
    expect(band.length).toBe(grid.rows <= 3 ? grid.rows : 4 - (grid.rows % 2));
    expect(track.length).toBe(Math.max(1, band.length - 2));
    expect(track.every((row) => band.includes(row))).toBe(true);
    Array.from({ length: grid.cols }, (_, x) => x).forEach((x) => {
      expect(columnRows(full, grid, x)).toEqual(band);
      expect(columnRows(empty, grid, x)).toEqual(track);
    });
  });

  it.each(SEGMENTED)('lays out equal, evenly spaced segments on %o with length %i', (grid, length) => {
    const { frames } = generateFill(grid, { length });
    const full = frames[frames.length - 4];
    const columns = litColumns(full, grid);
    const starts = segmentStarts(columns);
    const count = Math.min(length, Math.floor((grid.cols + 1) / 2));
    expect(starts).toHaveLength(count);
    const width = columns.length / count;
    expect(Number.isInteger(width)).toBe(true);
    starts.forEach((start, index) => expect(start).toBe(starts[0] + index * (width + 1)));
    const rightMargin = grid.cols - (columns[columns.length - 1] + 1);
    expect(rightMargin - columns[0]).toBeGreaterThanOrEqual(0);
    expect(rightMargin - columns[0]).toBeLessThanOrEqual(1);
  });

  it.each(GRIDS)('only ever lights band or track cells, filled from the left, on $cols x $rows', (grid) => {
    const { frames } = generateFill(grid, { length: 5 });
    const full = frames[frames.length - 4];
    const empty = frames[frames.length - 3];
    frames.forEach((frame) => {
      frame.forEach((bit, cell) => {
        expect(bit <= full[cell]).toBe(true);
        expect(bit >= empty[cell]).toBe(true);
      });
      const filled = litColumns(frame, grid).filter(
        (x) => columnRows(frame, grid, x).length > columnRows(empty, grid, x).length,
      );
      filled.forEach((x, index) => expect(index === 0 || x > filled[index - 1]).toBe(true));
    });
  });

  it.each([...GRIDS.map((grid): [GridSize, number] => [grid, 0]), ...SEGMENTED])(
    'stays at or under three flashes per second per cell on %o with length %i',
    (grid, length) => {
      const { frames, durations } = generateFill(grid, { length });
      expect(maxFlashesInOneSecond(frames, durations)).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
    },
  );

  it('ignores unrelated params', () => {
    const grid = { cols: 9, rows: 5 };
    expect(generateFill(grid, { frames: 3, trail: 4, seed: 7, density: 0.5 })).toEqual(
      generateFill(grid, {}),
    );
  });
});
