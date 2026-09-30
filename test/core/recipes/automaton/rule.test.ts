import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateAutomaton } from '../../../../src/core/recipes/automaton';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, gridName, gridsFrom } from './clip-metrics';

const GRIDS = gridsFrom([
  [8, 5],
  [8, 8],
  [11, 7],
  [12, 9],
  [16, 9],
  [16, 16],
]);
const CASES = GRIDS.map((grid) => [gridName(grid), grid] as const);
const BLINK_FRAMES = 4;

function rowsOf(frame: Frame, grid: GridSize): string[] {
  return Array.from({ length: grid.rows }, (_, y) =>
    frame.slice(y * grid.cols, (y + 1) * grid.cols).join(''),
  );
}

function ringWidth(cols: number): number {
  return 2 ** Math.floor(Math.log2(cols));
}

function isScrollOf(previous: Frame, next: Frame, grid: GridSize): boolean {
  return rowsOf(next, grid).slice(0, -1).join() === rowsOf(previous, grid).slice(1).join();
}

function mirrorsAround(frame: Frame, grid: GridSize, axis: number): boolean {
  return frame.every((bit, index) => {
    const x = index % grid.cols;
    const mirrored = 2 * axis - x;
    const other = mirrored >= 0 && mirrored < grid.cols ? frame[index - x + mirrored] : 0;
    return bit === other;
  });
}

describe('automaton rule-90', () => {
  it.each(CASES)(
    'grows from one seed, annihilates and scrolls away in cols/2 + rows frames at %s',
    (_label, grid) => {
      const { frames, durations, still } = generateAutomaton(grid, { variant: 'rule-90' });
      expect(frames).toHaveLength(ringWidth(grid.cols) / 2 + grid.rows);
      expect(countLit(frames[0])).toBe(1);
      expect(countLit(frames[frames.length - 1])).toBe(0);
      expect(durations.every((ms) => ms >= 90)).toBe(true);
      expect(frames.slice(1).every((frame, index) => isScrollOf(frames[index], frame, grid))).toBe(true);
      expect(still).toBe(ringWidth(grid.cols) / 2 - 1);
    },
  );

  it.each(CASES)('freezes the grown triangle, mirror-symmetric about its seed, at %s', (_label, grid) => {
    const { frames } = generateAutomaton(grid, { variant: 'rule-90', frames: 1 });
    const loop = generateAutomaton(grid, { variant: 'rule-90' });
    const seedColumn = frames[0].indexOf(1) % grid.cols;
    expect(frames).toEqual([loop.frames[loop.still ?? 0]]);
    expect(mirrorsAround(frames[0], grid, seedColumn)).toBe(true);
  });

  it.each(CASES)('blooms once and ends on the check at %s', (_label, grid) => {
    const { frames } = generateAutomaton(grid, { variant: 'rule-90', glyph: 'check' });
    expect(frames[frames.length - 1]).toEqual(glyphMask('check', grid));
    expect(frames).toHaveLength(ringWidth(grid.cols) / 2 + 1);
  });
});

describe('automaton rule-30', () => {
  it.each(CASES)('scrolls one new row in per frame, across the seam too, at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'rule-30' });
    const wrapped = [...frames, frames[0]];
    expect(wrapped.slice(1).every((frame, index) => isScrollOf(wrapped[index], frame, grid))).toBe(true);
    expect(durations.every((ms) => ms === 170)).toBe(true);
  });

  it('loops exactly after 40 steps on 8 columns and 72 on 9', () => {
    expect(generateAutomaton({ cols: 8, rows: 8 }, { variant: 'rule-30' }).frames).toHaveLength(40);
    expect(generateAutomaton({ cols: 9, rows: 9 }, { variant: 'rule-30' }).frames).toHaveLength(72);
    expect(generateAutomaton({ cols: 16, rows: 9 }, { variant: 'rule-30' }).frames).toHaveLength(40);
  });
});

describe('automaton rule-204', () => {
  it.each(CASES)('repeats the last row until the view is frozen, then blinks twice at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'rule-204' });
    const frozen = frames[frames.length - 1];
    const blinks = frames.slice(-BLINK_FRAMES);
    expect(new Set(rowsOf(frozen, grid)).size).toBe(1);
    expect(countLit(frozen)).toBeGreaterThan(0);
    expect(blinks.map(countLit)).toEqual([0, countLit(frozen), 0, countLit(frozen)]);
    expect(durations.slice(-BLINK_FRAMES)).toEqual([250, 250, 250, 1500]);
  });
});
