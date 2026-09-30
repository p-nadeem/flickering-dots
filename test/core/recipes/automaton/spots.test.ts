import { describe, expect, it } from 'vitest';

import { generateAutomaton } from '../../../../src/core/recipes/automaton';
import { countSpots } from '../../../../src/core/recipes/automaton/spot-count';
import { runMitosis } from '../../../../src/core/recipes/automaton/spots-timeline';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, gridName, gridsFrom } from './clip-metrics';

const GRIDS = gridsFrom([
  [12, 12],
  [13, 13],
  [16, 12],
  [16, 16],
]);
const CASES = GRIDS.map((grid) => [gridName(grid), grid] as const);
const FORWARD_FRAMES = 40;
const SET_GRID = { cols: 16, rows: 16 };
const MIN_TILED_SPOTS = 4;

function contains(outer: Frame, inner: Frame): boolean {
  return inner.every((bit, index) => bit === 0 || outer[index] === 1);
}

function litRows(frame: Frame, grid: GridSize): number[] {
  return frame.flatMap((bit, index) => (bit === 1 ? [Math.floor(index / grid.cols)] : []));
}

describe('countSpots', () => {
  it('joins blobs across the wrapping edges', () => {
    const grid = { cols: 4, rows: 3 };
    expect(countSpots([1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0], grid)).toBe(2);
    expect(countSpots([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], grid)).toBe(0);
  });
});

describe('automaton spots', () => {
  it.each(CASES)('splits one spot into a tiling and plays it forward and back at %s', (_label, grid) => {
    const { frames, durations, still } = generateAutomaton(grid, { variant: 'spots' });
    expect(frames).toHaveLength(2 * FORWARD_FRAMES - 2);
    expect(frames.slice(FORWARD_FRAMES)).toEqual(frames.slice(1, FORWARD_FRAMES - 1).reverse());
    expect(countSpots(frames[0], grid)).toBe(1);
    expect(countSpots(frames[FORWARD_FRAMES - 1], grid)).toBeGreaterThanOrEqual(MIN_TILED_SPOTS);
    expect(durations.every((ms) => ms === 110)).toBe(true);
    expect(still).toBe(FORWARD_FRAMES - 1);
  });

  it.each(CASES)('breathes one spot by a threshold step at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'spots-breathe' });
    const [small, large] = frames;
    expect(countSpots(small, grid)).toBe(1);
    expect(contains(large, small)).toBe(true);
    expect(countLit(large)).toBeGreaterThan(countLit(small));
    expect(durations).toEqual([400, 400]);
  });

  it.each(CASES)('pulses every spot one step fatter and holds the tiling at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'spots-pulse' });
    const tiled = generateAutomaton(grid, { variant: 'spots' }).frames[FORWARD_FRAMES - 1];
    const fat = frames[frames.length - 2];
    expect(frames[frames.length - 1]).toEqual(tiled);
    expect(contains(fat, tiled)).toBe(true);
    expect(countLit(fat)).toBeGreaterThan(countLit(tiled));
    expect(durations.slice(-2)).toEqual([200, 1500]);
  });

  it.each(CASES)('starts the labyrinth from the tiling and freezes at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'spots-labyrinth' });
    const tiled = generateAutomaton(grid, { variant: 'spots' }).frames[FORWARD_FRAMES - 1];
    expect(frames[0]).toEqual(tiled);
    expect(durations[durations.length - 1]).toBe(1500);
    expect(countLit(frames[frames.length - 1])).toBeGreaterThan(countLit(tiled));
  });

  it('merges the spots into fewer, longer bands on the set grid', () => {
    const { frames } = generateAutomaton(SET_GRID, { variant: 'spots-labyrinth' });
    expect(countSpots(frames[frames.length - 1], SET_GRID)).toBeLessThan(countSpots(frames[0], SET_GRID));
  });

  it.each(CASES)('grows the coral colony up from the bottom edge at %s', (_label, grid) => {
    const { frames } = generateAutomaton(grid, { variant: 'spots-coral' });
    expect(frames).toHaveLength(2 * FORWARD_FRAMES - 2);
    expect(Math.min(...litRows(frames[0], grid))).toBeGreaterThanOrEqual(grid.rows / 2);
    expect(Math.min(...litRows(frames[FORWARD_FRAMES - 1], grid))).toBeLessThan(grid.rows / 2);
  });

  it('changes with the seed', () => {
    expect(generateAutomaton(SET_GRID, { variant: 'spots', seed: 3 })).not.toEqual(
      generateAutomaton(SET_GRID, { variant: 'spots' }),
    );
  });
});

describe('runMitosis', () => {
  it('reuses the run for the same grid, seed and sample count, so the spots variants share one simulation', () => {
    const grid = { cols: 12, rows: 12 };

    expect(runMitosis(grid, 11)).toBe(runMitosis(grid, 11));
    expect(runMitosis(grid, 12)).not.toBe(runMitosis(grid, 11));
  });
});
