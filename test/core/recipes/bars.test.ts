import { describe, expect, it } from 'vitest';

import { BARS_DEFAULTS, generateBars } from '../../../src/core/recipes/bars';
import { createRng } from '../../../src/core/rng';
import type { Frame, GridSize } from '../../../src/core/types';

import { toOutputText } from './frame-text';

const MIN_SIDE = 3;
const MAX_SIDE = 16;
const FRAME_MS = 90;
const DEFAULT_FRAMES = 12;
const MIN_FRAMES = 8;
const MS_PER_SECOND = 1000;
const MAX_FLASHES_PER_SECOND = 3;
const GAP_MIN_COLS = 9;
const ENVELOPE_DROP = 0.45;
const TURN = Math.PI * 2;

const SIDES = Array.from({ length: MAX_SIDE - MIN_SIDE + 1 }, (_, index) => MIN_SIDE + index);
const GRIDS: GridSize[] = SIDES.flatMap((cols) => SIDES.map((rows) => ({ cols, rows })));

interface Layout {
  columns: number[];
  isMirrored: boolean;
}

function layoutOf({ cols, rows }: GridSize): Layout {
  const gap = cols >= GAP_MIN_COLS ? 1 : 0;
  const count = Math.floor((cols + gap) / (1 + gap));
  const used = count + (count - 1) * gap;
  const left = Math.floor((cols - used) / 2);
  return {
    columns: Array.from({ length: count }, (_, bar) => left + bar * (1 + gap)),
    isMirrored: rows % 2 === 1,
  };
}

function expectedLevels(grid: GridSize, frameCount: number, seed: number): number[][] {
  const { columns, isMirrored } = layoutOf(grid);
  const random = createRng(seed);
  const centre = (columns.length - 1) / 2;
  const peak = isMirrored ? (grid.rows - 1) / 2 : grid.rows;
  const bars = columns.map((_, bar) => ({
    phase: random() * TURN,
    multiplier: 1 + Math.floor(random() * 2),
    envelope: 1 - (ENVELOPE_DROP * Math.abs(bar - centre)) / Math.max(1, centre),
  }));
  return Array.from({ length: frameCount }, (_, step) =>
    bars.map(({ phase, multiplier, envelope }) => {
      const amount = 0.5 + 0.5 * Math.sin((TURN * multiplier * step) / frameCount + phase);
      const level = Math.round(peak * envelope * amount);
      return isMirrored ? level : Math.max(1, level);
    }),
  );
}

function litRowsOf(frame: Frame, grid: GridSize, x: number): number[] {
  return Array.from({ length: grid.rows }, (_, y) => y).filter((y) => frame[y * grid.cols + x] === 1);
}

function range(from: number, length: number): number[] {
  return Array.from({ length }, (_, index) => from + index);
}

function barRows(grid: GridSize, level: number, isMirrored: boolean): number[] {
  const centre = (grid.rows - 1) / 2;
  return isMirrored ? range(centre - level, 2 * level + 1) : range(grid.rows - level, level);
}

function maxCellFlashes(frames: Frame[]): number {
  const cells = Array.from({ length: frames[0].length }, (_, cell) => cell);
  const flashesOf = (cell: number) =>
    frames.filter(
      (frame, index) => frame[cell] === 1 && frames[(index + frames.length - 1) % frames.length][cell] === 0,
    ).length;
  return Math.max(...cells.map(flashesOf));
}

function flashRate(grid: GridSize, frameCount: number): number {
  const { frames, durations } = generateBars(grid, { frames: frameCount });
  const loopSeconds = durations.reduce((total, value) => total + value, 0) / MS_PER_SECOND;
  return maxCellFlashes(frames) / loopSeconds;
}

describe('generateBars', () => {
  it('uses 12 frames at 90 ms with seed 4 by default', () => {
    const { frames, durations } = generateBars({ cols: 9, rows: 7 }, {});
    expect(BARS_DEFAULTS).toEqual({ frames: DEFAULT_FRAMES, seed: 4 });
    expect(frames).toHaveLength(DEFAULT_FRAMES);
    expect(durations).toEqual(frames.map(() => FRAME_MS));
    expect(generateBars({ cols: 9, rows: 7 })).toEqual(generateBars({ cols: 9, rows: 7 }, BARS_DEFAULTS));
  });

  it('draws five spaced bars mirrored about row 3 on 9x7', () => {
    const grid = { cols: 9, rows: 7 };
    const levels = expectedLevels(grid, DEFAULT_FRAMES, BARS_DEFAULTS.seed);
    const { frames } = toOutputText(generateBars(grid, {}), grid.cols);
    expect(layoutOf(grid).columns).toEqual([0, 2, 4, 6, 8]);
    frames.forEach((text, step) => {
      const rows = text.split(' ');
      expect(rows[3]).toBe('101010101');
      rows.forEach((row, y) =>
        [0, 2, 4, 6, 8].forEach((x, bar) =>
          expect(row[x] === '1').toBe(Math.abs(y - 3) <= levels[step][bar]),
        ),
      );
    });
  });

  it('draws seven touching bars on 7x5 and three on 3x3', () => {
    expect(layoutOf({ cols: 7, rows: 5 }).columns).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(layoutOf({ cols: 3, rows: 3 }).columns).toEqual([0, 1, 2]);
    const frames = toOutputText(generateBars({ cols: 3, rows: 3 }, {}), 3).frames;
    frames.forEach((text) => expect(text.split(' ')[1]).toBe('111'));
    expect(new Set(frames).size).toBeGreaterThan(1);
  });

  it('anchors eight bars to the bottom row on 16x8', () => {
    const grid = { cols: 16, rows: 8 };
    const { frames } = generateBars(grid, {});
    expect(layoutOf(grid).columns).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    frames.forEach((frame) => layoutOf(grid).columns.forEach((x) => expect(frame[7 * 16 + x]).toBe(1)));
  });

  it.each(GRIDS)('matches the level formula with clean solid bars on $cols x $rows', (grid) => {
    const { columns, isMirrored } = layoutOf(grid);
    const { frames } = generateBars(grid, {});
    const levels = expectedLevels(grid, DEFAULT_FRAMES, BARS_DEFAULTS.seed);
    frames.forEach((frame, step) => {
      expect(frame).toHaveLength(grid.cols * grid.rows);
      range(0, grid.cols).forEach((x) => {
        const bar = columns.indexOf(x);
        const expected = bar < 0 ? [] : barRows(grid, levels[step][bar], isMirrored);
        expect(litRowsOf(frame, grid, x)).toEqual(expected);
      });
    });
  });

  it.each(GRIDS)('centres the bars and moves every bar on $cols x $rows', (grid) => {
    const { columns } = layoutOf(grid);
    const leftMargin = columns[0];
    const rightMargin = grid.cols - 1 - columns[columns.length - 1];
    expect(Math.abs(rightMargin - leftMargin)).toBeLessThanOrEqual(1);
    const { frames } = generateBars(grid, {});
    columns.forEach((x) => {
      const heights = new Set(frames.map((frame) => litRowsOf(frame, grid, x).length));
      expect(heights.size).toBeGreaterThan(1);
    });
  });

  it.each(GRIDS)('stays under three flashes per second per cell on $cols x $rows', (grid) => {
    expect(flashRate(grid, DEFAULT_FRAMES)).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('raises short frame counts to 8 so fast loops stay under three flashes per second', () => {
    const grid = { cols: 9, rows: 7 };
    expect(generateBars(grid, { frames: 2 }).frames).toHaveLength(MIN_FRAMES);
    range(1, 24).forEach((frameCount) =>
      expect(flashRate({ cols: 16, rows: 16 }, frameCount)).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND),
    );
    expect(generateBars(grid, { frames: 0 })).toEqual(generateBars(grid, {}));
  });

  it('moves every bar on its own and never holds a frame on 9x7 by default', () => {
    const grid = { cols: 9, rows: 7 };
    const levels = expectedLevels(grid, DEFAULT_FRAMES, BARS_DEFAULTS.seed);
    const perBar = levels[0].map((_, bar) => levels.map((frame) => frame[bar]));
    const { frames } = generateBars(grid, {});
    const frameKeys = frames.map((frame) => frame.join(''));
    const matches = (a: number[], b: number[]) => a.filter((level, index) => level === b[index]).length;

    expect(frameKeys.every((key, index) => key !== frameKeys.at(index - 1))).toBe(true);
    expect(new Set(perBar.map((sequence) => sequence.join())).size).toBe(perBar.length);
    perBar.forEach((sequence, bar) => {
      expect(new Set(sequence).size).toBeGreaterThanOrEqual(3);
      perBar.slice(bar + 1).forEach((other) => expect(matches(sequence, other)).toBeLessThan(10));
    });
  });

  it('follows the seed', () => {
    const grid = { cols: 12, rows: 5 };
    expect(generateBars(grid, { seed: 9 })).toEqual(generateBars(grid, { seed: 9 }));
    expect(generateBars(grid, { seed: 9 })).not.toEqual(generateBars(grid, { seed: 5 }));
  });
});
