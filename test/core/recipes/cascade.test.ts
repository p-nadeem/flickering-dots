import { describe, expect, it } from 'vitest';

import { CASCADE_DEFAULTS, generateCascade } from '../../../src/core/recipes/cascade';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toFrameText, toOutputText } from './frame-text';

const STEP_MS = 90;
const HOLD_MS = 300;
const MIN_SIDE = 3;
const MAX_SIDE = 16;
const GAP_MIN_SIDE = 5;
const MIN_BLOCKS = 3;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;

const SIDES = Array.from({ length: MAX_SIDE - MIN_SIDE + 1 }, (_, index) => MIN_SIDE + index);
const GRIDS: GridSize[] = SIDES.flatMap((cols) => SIDES.map((rows) => ({ cols, rows })));

type Run = readonly [start: number, end: number];

function getRuns(isLit: boolean[]): Run[] {
  return isLit.reduce<Run[]>((runs, lit, index) => {
    if (!lit) return runs;
    const last = runs.at(-1);
    if (last && last[1] === index - 1) return [...runs.slice(0, -1), [last[0], index]];
    return [...runs, [index, index]];
  }, []);
}

function getAxisRuns(hold: Frame, grid: GridSize, axis: 'x' | 'y'): Run[] {
  const length = axis === 'x' ? grid.cols : grid.rows;
  const across = axis === 'x' ? grid.rows : grid.cols;
  const isLit = Array.from({ length }, (_, a) =>
    Array.from({ length: across }, (__, b) =>
      axis === 'x' ? hold[b * grid.cols + a] : hold[a * grid.cols + b],
    ).some((bit) => bit === 1),
  );
  const runs = getRuns(isLit);
  const isTouching = Math.min(grid.cols, grid.rows) < GAP_MIN_SIDE;
  return isTouching && runs.length === 1 ? Array.from({ length }, (_, index): Run => [index, index]) : runs;
}

function findRun(runs: Run[], value: number): number {
  return runs.findIndex(([start, end]) => value >= start && value <= end);
}

function getBlockDelay(grid: GridSize, runs: { xs: Run[]; ys: Run[] }, index: number): number {
  const i = findRun(runs.xs, index % grid.cols);
  const j = findRun(runs.ys, Math.floor(index / grid.cols));
  return i < 0 || j < 0 ? -1 : i + j;
}

function countFlashes(frames: Frame[], index: number): number {
  return frames.filter((frame, step) => frame[index] === 0 && frames.at(step - 1)?.[index] === 1).length;
}

function getMargins(runs: Run[], length: number): [number, number] {
  return [runs[0][0], length - 1 - (runs.at(-1) as Run)[1]];
}

describe('generateCascade', () => {
  it('blinks a 3x3 dot grid out along each diagonal in turn', () => {
    expect(CASCADE_DEFAULTS).toEqual({});
    expect(toOutputText(generateCascade({ cols: 3, rows: 3 }, {}), 3)).toEqual({
      frames: [
        '011 111 111',
        '001 011 111',
        '100 001 011',
        '110 100 001',
        '111 110 100',
        '111 111 110',
        '111 111 111',
      ],
      durations: [90, 90, 90, 90, 90, 90, 300],
    });
  });

  it('draws 3x3 blocks of 2x2 on 8x8 with 7 frames and about 840 ms', () => {
    const output = generateCascade({ cols: 8, rows: 8 }, {});
    const hold = '11011011 11011011 00000000 11011011 11011011 00000000 11011011 11011011';
    const first = '00011011 00011011 00000000 11011011 11011011 00000000 11011011 11011011';
    expect(output.frames).toHaveLength(7);
    expect(toFrameText(output.frames[0], 8)).toBe(first);
    expect(toFrameText(output.frames[6], 8)).toBe(hold);
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(840);
  });

  it('draws 3x3 blocks of 3x3 on 11x11 and a 4x4 dot lattice on 7x7', () => {
    const large = generateCascade({ cols: 11, rows: 11 }, {}).frames.at(-1) as Frame;
    const lattice = generateCascade({ cols: 7, rows: 7 }, {}).frames.at(-1) as Frame;
    expect(countLit(large)).toBe(81);
    expect(toFrameText(large, 11).split(' ')[3]).toBe('00000000000');
    expect(toFrameText(lattice, 7)).toBe('1010101 0000000 1010101 0000000 1010101 0000000 1010101');
  });

  it('takes the block size from length and clamps it to the grid', () => {
    const grid = { cols: 8, rows: 8 };
    expect(countLit(generateCascade(grid, { length: 1 }).frames.at(-1) as Frame)).toBe(16);
    expect(generateCascade(grid, { length: 0 }).frames).toEqual(generateCascade(grid, { length: 1 }).frames);
    expect(countLit(generateCascade(grid, { length: 99 }).frames.at(-1) as Frame)).toBe(64);
  });

  it.each(GRIDS)('lays out square, evenly spaced, centred blocks on $cols x $rows', (grid) => {
    const hold = generateCascade(grid, {}).frames.at(-1) as Frame;
    const xs = getAxisRuns(hold, grid, 'x');
    const ys = getAxisRuns(hold, grid, 'y');
    const sizes = [...xs, ...ys].map(([start, end]) => end - start + 1);
    const gaps = [xs, ys].flatMap((runs) =>
      runs.slice(1).map(([start], index) => start - runs[index][1] - 1),
    );
    const [left, right] = getMargins(xs, grid.cols);
    const [top, bottom] = getMargins(ys, grid.rows);
    expect(new Set(sizes).size).toBe(1);
    expect(new Set(gaps).size).toBe(1);
    expect(Math.min(xs.length, ys.length)).toBeGreaterThanOrEqual(MIN_BLOCKS);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1);
    hold.forEach((bit, index) => {
      expect(bit).toBe(getBlockDelay(grid, { xs, ys }, index) >= 0 ? 1 : 0);
    });
  });

  it.each(GRIDS)('switches whole diagonals off for 2 frames then holds on $cols x $rows', (grid) => {
    const { frames, durations } = generateCascade(grid, {});
    const hold = frames.at(-1) as Frame;
    const runs = { xs: getAxisRuns(hold, grid, 'x'), ys: getAxisRuns(hold, grid, 'y') };
    expect(frames).toHaveLength(runs.xs.length + runs.ys.length + 1);
    expect(durations).toEqual([...frames.slice(1).map(() => STEP_MS), HOLD_MS]);
    frames.slice(0, -1).forEach((frame, step) => {
      frame.forEach((bit, index) => {
        const delay = getBlockDelay(grid, runs, index);
        const isOff = delay < 0 || step - delay === 0 || step - delay === 1;
        expect(bit).toBe(isOff ? 0 : 1);
      });
    });
  });

  it.each(GRIDS)('blinks each block once and under 3 times per second on $cols x $rows', (grid) => {
    const { frames, durations } = generateCascade(grid, {});
    const hold = frames.at(-1) as Frame;
    const loopSeconds = durations.reduce((sum, ms) => sum + ms, 0) / MS_PER_SECOND;
    hold.forEach((bit, index) => {
      const flashes = countFlashes(frames, index);
      expect(flashes).toBe(bit);
      expect(flashes / loopSeconds).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
    });
  });
});
