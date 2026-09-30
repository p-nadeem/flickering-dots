import { describe, expect, it } from 'vitest';

import { SHIMMER_DEFAULTS, generateShimmer } from '../../../src/core/recipes/shimmer';
import { framesEqual } from '../../../src/core/frame';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toOutputText } from './frame-text';

const STEP_MS = 110;
const REST_MS = 900;
const MIN_SIDE = 3;
const MAX_SIDE = 16;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;

const SIDES = Array.from({ length: MAX_SIDE - MIN_SIDE + 1 }, (_, index) => MIN_SIDE + index);
const GRIDS: GridSize[] = SIDES.flatMap((cols) => SIDES.map((rows) => ({ cols, rows })));
const LINE_MIN_ROWS = 5;
const LINE_GRIDS = GRIDS.filter((grid) => grid.rows >= LINE_MIN_ROWS);

function cellsOf(grid: GridSize): { x: number; y: number; index: number }[] {
  return Array.from({ length: grid.cols * grid.rows }, (_, index) => ({
    x: index % grid.cols,
    y: Math.floor(index / grid.cols),
    index,
  }));
}

function getShape(grid: GridSize): boolean[] {
  const output = generateShimmer(grid, {});
  return cellsOf(grid).map(({ index }) => output.frames.some((frame) => frame[index] === 1));
}

function getBandDiagonals(grid: GridSize, frame: Frame, base: Frame): number[] {
  const diagonals = cellsOf(grid)
    .filter(({ index }) => frame[index] === 1 && base[index] === 0)
    .map(({ x, y }) => x + y);
  return [...new Set(diagonals)].sort((a, b) => a - b);
}

function getLitRows(grid: GridSize, shape: boolean[]): number[] {
  return SIDES.slice(0, grid.rows)
    .map((_, y) => y)
    .filter((y) => shape.slice(y * grid.cols, (y + 1) * grid.cols).some(Boolean));
}

function isSteady(sizes: number[]): boolean {
  const first = sizes.findIndex((size) => size > 0);
  const last = sizes.length - 1 - [...sizes].reverse().findIndex((size) => size > 0);
  const inner = sizes.slice(first, last + 1);
  const peak = inner.indexOf(Math.max(...inner));
  const rising = inner.slice(0, peak + 1);
  const falling = inner.slice(peak);
  return (
    inner.every((size) => size > 0) &&
    rising.every((size, index) => index === 0 || size >= rising[index - 1]) &&
    falling.every((size, index) => index === 0 || size <= falling[index - 1])
  );
}

function countFlashes(frames: Frame[], index: number): number {
  return frames.filter((frame, step) => frame[index] === 1 && frames.at(step - 1)?.[index] === 0).length;
}

describe('generateShimmer', () => {
  it('sweeps a solid band over a checkerboard strip on 4x3, one new diagonal per frame', () => {
    const base = '1010 0101 1010';
    const first = '1110 1101 1010';
    const second = '1011 0111 1110';
    const third = '1010 0101 1011';
    expect(toOutputText(generateShimmer({ cols: 4, rows: 3 }, {}), 4)).toEqual({
      frames: [first, second, third, base],
      durations: [STEP_MS, STEP_MS, STEP_MS, REST_MS],
    });
  });

  it('draws ragged text lines on 5 or more rows that start and end on a base dot', () => {
    expect(toOutputText(generateShimmer({ cols: 5, rows: 5 }, {}), 5)).toEqual({
      frames: [
        '00000 01110 00000 01010 00000',
        '00000 01010 00000 01110 00000',
        '00000 01010 00000 01010 00000',
      ],
      durations: [STEP_MS, STEP_MS, REST_MS],
    });
  });

  it('gives 12x3 seven band frames and a 900 ms rest', () => {
    const output = generateShimmer({ cols: 12, rows: 3 }, {});
    expect(SHIMMER_DEFAULTS).toEqual({ trail: 2 });
    expect(output.frames).toHaveLength(8);
    expect(output.durations).toEqual([...Array.from({ length: 7 }, () => STEP_MS), REST_MS]);
  });

  it('gives 16x7 three lines of 15, 11 and 7 cells and seven band frames', () => {
    const grid = { cols: 16, rows: 7 };
    const output = generateShimmer(grid, {});
    const shape = getShape(grid);
    const lineLengths = [1, 3, 5].map((y) => shape.slice(y * 16, (y + 1) * 16).filter(Boolean).length);
    expect(output.frames).toHaveLength(8);
    expect(lineLengths).toEqual([15, 11, 7]);
    expect(getLitRows(grid, shape)).toEqual([1, 3, 5]);
    expect(output.durations.at(-1)).toBe(REST_MS);
  });

  it('widens the band with trail and clamps it to 2 to 4', () => {
    const grid = { cols: 12, rows: 3 };
    expect(generateShimmer(grid, { trail: 4 }).frames).toHaveLength(9);
    expect(generateShimmer(grid, { trail: 9 }).frames).toHaveLength(9);
    expect(generateShimmer(grid, { trail: 0 }).frames).toEqual(generateShimmer(grid, {}).frames);
  });

  it.each(GRIDS)('never repeats a frame and rests only on the last frame on $cols x $rows', (grid) => {
    [2, 4].forEach((trail) => {
      const { frames } = generateShimmer(grid, { trail });
      const base = frames.at(-1) as Frame;
      const repeats = frames.filter(
        (frame, index) => frames.length > 1 && framesEqual(frame, frames.at(index - 1) as Frame),
      );
      expect(repeats).toHaveLength(0);
      expect(frames.slice(0, -1).some((frame) => framesEqual(frame, base))).toBe(false);
    });
  });

  it.each(LINE_GRIDS)(
    'never lights a line cell outside its first and last base dots on $cols x $rows',
    (grid) => {
      const { frames } = generateShimmer(grid, {});
      const base = frames.at(-1) as Frame;
      Array.from({ length: grid.rows }, (_, y) => y).forEach((y) => {
        const row = (frame: Frame) => frame.slice(y * grid.cols, (y + 1) * grid.cols);
        const baseXs = row(base).flatMap((bit, x) => (bit === 1 ? [x] : []));
        frames.forEach((frame) => {
          const xs = row(frame).flatMap((bit, x) => (bit === 1 ? [x] : []));
          if (baseXs.length < 2) return;
          expect(Math.min(...xs)).toBe(baseXs[0]);
          expect(Math.max(...xs)).toBe(baseXs.at(-1));
        });
      });
    },
  );

  it('never blinks the band off mid sweep, even with an odd trail', () => {
    const grid = { cols: 12, rows: 3 };
    [1, 3].forEach((trail) => {
      const { frames } = generateShimmer(grid, { trail });
      const base = frames.at(-1) as Frame;
      const bandSizes = frames.map((frame) => getBandDiagonals(grid, frame, base).length);
      expect(isSteady(bandSizes)).toBe(true);
    });
  });

  it.each(GRIDS)('reads cleanly on $cols x $rows', (grid) => {
    const { frames, durations } = generateShimmer(grid, {});
    const base = frames.at(-1) as Frame;
    const shape = getShape(grid);
    expect(durations).toEqual([...frames.slice(1).map(() => STEP_MS), REST_MS]);
    expect(countLit(base)).toBeGreaterThan(0);
    cellsOf(grid).forEach(({ x, y, index }) => {
      expect(base[index]).toBe(shape[index] && (x + y) % 2 === 0 ? 1 : 0);
    });
    frames.forEach((frame) => {
      expect(frame.every((bit, index) => bit <= Number(shape[index]) && bit >= base[index])).toBe(true);
      const band = getBandDiagonals(grid, frame, base);
      expect(band.length).toBeLessThanOrEqual(1);
    });
  });

  it.each(GRIDS)('sweeps every dim cell once, left to right, on $cols x $rows', (grid) => {
    const { frames } = generateShimmer(grid, {});
    const base = frames.at(-1) as Frame;
    const shape = getShape(grid);
    const leads = frames
      .map((frame) => getBandDiagonals(grid, frame, base)[0] ?? -1)
      .filter((lead) => lead >= 0);
    expect(leads).toEqual([...leads].sort((a, b) => a - b));
    expect(isSteady(frames.map((frame) => getBandDiagonals(grid, frame, base).length))).toBe(true);
    cellsOf(grid).forEach(({ index }) => {
      const isDim = shape[index] && base[index] === 0;
      expect(countFlashes(frames, index)).toBe(isDim ? 1 : 0);
    });
  });

  it('lights every cell of a strip of 4 or fewer rows', () => {
    [3, 4].forEach((rows) => {
      expect(getShape({ cols: 12, rows }).every(Boolean)).toBe(true);
    });
  });

  it.each(GRIDS)('centres the text lines and keeps flashes under 3 per second on $cols x $rows', (grid) => {
    const { frames, durations } = generateShimmer(grid, {});
    const litRows = getLitRows(grid, getShape(grid));
    const top = litRows[0];
    const bottom = grid.rows - 1 - (litRows.at(-1) as number);
    const loopSeconds = durations.reduce((sum, ms) => sum + ms, 0) / MS_PER_SECOND;
    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    cellsOf(grid).forEach(({ index }) => {
      expect(countFlashes(frames, index) / loopSeconds).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
    });
  });
});
