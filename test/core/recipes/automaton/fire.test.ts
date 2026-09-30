import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateAutomaton } from '../../../../src/core/recipes/automaton';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, gridName, gridsFrom } from './clip-metrics';

const GRIDS = gridsFrom([
  [6, 6],
  [7, 9],
  [8, 8],
  [12, 8],
  [16, 16],
]);
const CASES = GRIDS.map((grid) => [gridName(grid), grid] as const);
const PILOT_ROWS = 2;
const FLAME_MS = 80;
const PILOT_MS = 140;
const BURN_MS = 60;
const EMBERS_FRAME = 4;
const LONGEST_EMBER_RUN = 2;
const FLARE_SHARE = 0.4;
const SMOKE_DOTS = 2;

function litRows(frame: Frame, grid: GridSize): number[] {
  return frame.flatMap((bit, index) => (bit === 1 ? [Math.floor(index / grid.cols)] : []));
}

function meanLit(frames: readonly Frame[]): number {
  return frames.reduce((sum, frame) => sum + countLit(frame), 0) / frames.length;
}

function longestBottomRun(frame: Frame, grid: GridSize): number {
  const row = frame.slice((grid.rows - 1) * grid.cols);
  return row.reduce<{ best: number; run: number }>(
    (state, bit) => {
      const run = bit === 1 ? state.run + 1 : 0;
      return { best: Math.max(state.best, run), run };
    },
    { best: 0, run: 0 },
  ).best;
}

function isBottomRowLit(frame: Frame, grid: GridSize): boolean {
  return frame.slice((grid.rows - 1) * grid.cols).every((bit) => bit === 1);
}

describe('automaton fire', () => {
  it.each(CASES)('keeps a solid ember bed under the thinking flames at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'fire' });
    expect(frames).toHaveLength(16);
    expect(durations.every((ms) => ms === FLAME_MS)).toBe(true);
    expect(frames.every((frame) => isBottomRowLit(frame, grid))).toBe(true);
  });

  it.each(CASES)('keeps the pilot light in the bottom two rows at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'fire', density: 0.25 });
    expect(durations.every((ms) => ms === PILOT_MS)).toBe(true);
    expect(frames.flatMap((frame) => litRows(frame, grid)).every((y) => y >= grid.rows - PILOT_ROWS)).toBe(
      true,
    );
    expect(frames.every((frame) => countLit(frame) > 0)).toBe(true);
  });

  it.each(CASES)('burns taller as density rises at %s', (_label, grid) => {
    const [pilot, thinking, hard] = [0.25, 0.65, 0.85].map((density) =>
      meanLit(generateAutomaton(grid, { variant: 'fire', density }).frames),
    );
    expect(pilot).toBeLessThan(thinking);
    expect(thinking).toBeLessThan(hard);
  });

  it('records as many frames as asked and changes with the seed', () => {
    const grid = { cols: 8, rows: 8 };
    expect(generateAutomaton(grid, { variant: 'fire', frames: 4 }).frames).toHaveLength(4);
    expect(generateAutomaton(grid, { variant: 'fire', seed: 3 })).not.toEqual(
      generateAutomaton(grid, { variant: 'fire' }),
    );
  });

  it.each(CASES)('burns down in 4 frames to embers and ends on the check at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'fire-out' });
    const shrinking = frames.slice(0, EMBERS_FRAME).map(countLit);
    expect(frames[frames.length - 1]).toEqual(glyphMask('check', grid));
    expect(durations.slice(0, EMBERS_FRAME + 1).every((ms) => ms === BURN_MS)).toBe(true);
    expect(shrinking).toEqual([...shrinking].sort((a, b) => b - a));
    expect(litRows(frames[EMBERS_FRAME], grid).every((y) => y === grid.rows - 1)).toBe(true);
  });

  it('rises into another shared glyph when one is given', () => {
    const grid = { cols: 9, rows: 9 };
    const { frames } = generateAutomaton(grid, { variant: 'fire-out', glyph: 'sparkle' });
    expect(frames[frames.length - 1]).toEqual(glyphMask('sparkle', grid));
  });

  it.each(CASES)('keeps the rising tick apart from the embers at %s', (_label, grid) => {
    const { frames } = generateAutomaton(grid, { variant: 'fire-out' });
    frames.slice(EMBERS_FRAME + 1).forEach((frame) => {
      expect(longestBottomRun(frame, grid)).toBeLessThanOrEqual(LONGEST_EMBER_RUN);
    });
  });

  it.each(CASES)('flares for two frames, gutters to two smoke dots and ends dark at %s', (_label, grid) => {
    const output = generateAutomaton(grid, { variant: 'fire-gutter' });
    const { frames } = output;
    const flare = frames.slice(0, 2);
    const smoke = frames.slice(2);
    flare.forEach((frame) =>
      expect(countLit(frame)).toBeGreaterThanOrEqual(FLARE_SHARE * grid.cols * grid.rows),
    );
    expect(smoke.slice(0, -2).every((frame) => countLit(frame) === SMOKE_DOTS)).toBe(true);
    expect(countLit(frames[frames.length - 1])).toBe(0);
    expect(countLit(frames[output.still ?? 0])).toBe(SMOKE_DOTS);
  });
});
