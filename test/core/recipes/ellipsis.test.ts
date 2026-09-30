import { describe, expect, it } from 'vitest';

import { generateEllipsis } from '../../../src/core/recipes/ellipsis';
import type { Frame, GridSize } from '../../../src/core/types';

import { toOutputText } from './frame-text';

const DURATIONS = [200, 260, 260, 560];
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;
const SAMPLE_GRIDS: GridSize[] = [
  { cols: 5, rows: 3 },
  { cols: 7, rows: 3 },
  { cols: 8, rows: 3 },
  { cols: 9, rows: 3 },
  { cols: 10, rows: 3 },
  { cols: 12, rows: 3 },
  { cols: 12, rows: 5 },
  { cols: 16, rows: 5 },
  { cols: 16, rows: 8 },
  { cols: 20, rows: 6 },
  { cols: 24, rows: 8 },
];

interface Span {
  start: number;
  end: number;
}

function litColumns(frame: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, (_, x) => x).filter((x) =>
    Array.from({ length: grid.rows }, (_, y) => frame[y * grid.cols + x]).includes(1),
  );
}

function litRows(frame: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.rows }, (_, y) => y).filter((y) =>
    frame.slice(y * grid.cols, (y + 1) * grid.cols).includes(1),
  );
}

function toSpans(columns: readonly number[]): Span[] {
  return columns.reduce<Span[]>((spans, x) => {
    const last = spans.at(-1);
    return last && last.end === x - 1
      ? [...spans.slice(0, -1), { start: last.start, end: x }]
      : [...spans, { start: x, end: x }];
  }, []);
}

function fullSpans(grid: GridSize): Span[] {
  const frames = generateEllipsis(grid).frames;
  return toSpans(litColumns(frames[frames.length - 1], grid));
}

function countTurnOffs(frames: readonly Frame[]): number {
  return frames.reduce(
    (total, frame, index) =>
      total +
      frame.filter(
        (bit, cell) => bit === 0 && frames[index === 0 ? frames.length - 1 : index - 1][cell] === 1,
      ).length,
    0,
  );
}

describe('generateEllipsis', () => {
  it('spreads the dots to x = 1, 4 and 7 on 9x3', () => {
    expect(toOutputText(generateEllipsis({ cols: 9, rows: 3 }), 9)).toEqual({
      frames: [
        '000000000 000000000 000000000',
        '000000000 010000000 000000000',
        '000000000 010010000 000000000',
        '000000000 010010010 000000000',
      ],
      durations: DURATIONS,
    });
  });

  it('spaces the dots evenly on 7x3', () => {
    expect(toOutputText(generateEllipsis({ cols: 7, rows: 3 }), 7)).toEqual({
      frames: [
        '0000000 0000000 0000000',
        '0000000 0100000 0000000',
        '0000000 0101000 0000000',
        '0000000 0101010 0000000',
      ],
      durations: DURATIONS,
    });
  });

  it('draws 2x2 dots with equal gaps and margins on 16x5', () => {
    expect(toOutputText(generateEllipsis({ cols: 16, rows: 5 }), 16)).toEqual({
      frames: [
        '0000000000000000 0000000000000000 0000000000000000 0000000000000000 0000000000000000',
        '0000000000000000 0011000000000000 0011000000000000 0000000000000000 0000000000000000',
        '0000000000000000 0011000110000000 0011000110000000 0000000000000000 0000000000000000',
        '0000000000000000 0011000110001100 0011000110001100 0000000000000000 0000000000000000',
      ],
      durations: DURATIONS,
    });
  });

  it('closes the gaps when three dots only just fit on 3x3', () => {
    expect(toOutputText(generateEllipsis({ cols: 3, rows: 3 }), 3)).toEqual({
      frames: ['000 000 000', '000 100 000', '000 110 000', '000 111 000'],
      durations: DURATIONS,
    });
  });

  it('loops in about 1.3 seconds', () => {
    const total = generateEllipsis({ cols: 9, rows: 3 }).durations.reduce((sum, ms) => sum + ms, 0);

    expect(total).toBe(1280);
  });

  it.each(SAMPLE_GRIDS)('uses two equal gaps of one to two dots on $cols x $rows', (grid) => {
    const spans = fullSpans(grid);
    const size = spans[0].end - spans[0].start + 1;
    const gap = spans[1].start - spans[0].end - 1;

    expect(spans).toHaveLength(3);
    expect(gap).toBeGreaterThanOrEqual(size);
    expect(gap).toBeLessThanOrEqual(2 * size);
    expect(spans[2].start - spans[1].end - 1).toBe(gap);
  });

  it.each(SAMPLE_GRIDS)(
    'keeps an outer margin of at least one dot when it widens the gaps on $cols x $rows',
    (grid) => {
      const spans = fullSpans(grid);
      const size = spans[0].end - spans[0].start + 1;
      const gap = spans[1].start - spans[0].end - 1;

      if (gap > size) expect(spans[0].start).toBeGreaterThanOrEqual(size);
    },
  );

  it.each(SAMPLE_GRIDS)(
    'centres the dots with equal outer margins when the leftover is even on $cols x $rows',
    (grid) => {
      const spans = fullSpans(grid);
      const left = spans[0].start;
      const right = grid.cols - 1 - spans[2].end;

      expect(right - left).toBe((left + right) % 2);
    },
  );

  it.each(SAMPLE_GRIDS)('draws square dots of one size, vertically centred, on $cols x $rows', (grid) => {
    const frames = generateEllipsis(grid).frames;
    const widths = fullSpans(grid).map((span) => span.end - span.start + 1);
    const rows = litRows(frames[frames.length - 1], grid);

    expect(new Set(widths).size).toBe(1);
    expect(rows).toHaveLength(widths[0]);
    expect(rows[0]).toBe(Math.floor((grid.rows - widths[0]) / 2));
    expect(rows[rows.length - 1] - rows[0] + 1).toBe(rows.length);
  });

  it.each(SAMPLE_GRIDS)('adds one dot per frame from the left on $cols x $rows', (grid) => {
    const { frames } = generateEllipsis(grid);
    const spans = fullSpans(grid);

    expect(frames).toHaveLength(4);
    frames.forEach((frame, visible) => {
      expect(toSpans(litColumns(frame, grid))).toEqual(spans.slice(0, visible));
    });
  });

  it('keeps every dot under three flashes per second', () => {
    const grid = { cols: 9, rows: 3 };
    const { frames, durations } = generateEllipsis(grid);
    const cycleSeconds = durations.reduce((sum, ms) => sum + ms, 0) / MS_PER_SECOND;
    const turnOffsPerDot = countTurnOffs(frames) / 3;

    expect(turnOffsPerDot / cycleSeconds).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
    expect(durations.every((ms) => ms >= MS_PER_SECOND / (2 * MAX_FLASHES_PER_SECOND))).toBe(true);
  });
});
