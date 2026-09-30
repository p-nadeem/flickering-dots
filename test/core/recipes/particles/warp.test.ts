import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateParticles } from '../../../../src/core/recipes/particles';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { digest } from './clip-checks';

const GRID: GridSize = { cols: 11, rows: 11 };
const LOOP_FRAMES = 16;
const WARP_MS = 60;
const DRIFT_MS = 140;
const HOLD_MS = 1500;
const FALL_MS = 90;
const CENTRE = 5;
const RUN = 3;
const DRIFT_STARS = 6;
const ARRIVAL_HOLD_MS = 120;
const COMPASS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;

function isLitAt(frame: Frame, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < GRID.cols && y < GRID.rows && frame[y * GRID.cols + x] === 1;
}

function hasRadialRun(frame: Frame): boolean {
  return COMPASS.some(([dx, dy]) =>
    Array.from({ length: CENTRE }, (_, start) => start + 1).some((start) =>
      Array.from({ length: RUN }, (_, step) => start + step).every((k) =>
        isLitAt(frame, CENTRE + k * dx, CENTRE + k * dy),
      ),
    ),
  );
}

const PINS: readonly (readonly [string, RecipeParams, string])[] = [
  ['warp', { variant: 'warp' }, '16:35355571'],
  ['warp-drift', { variant: 'warp-drift' }, '15:14b2f0ef'],
  ['warp-arrive', { variant: 'warp-arrive' }, '11:2b9f1852'],
  ['warp-stall', { variant: 'warp-stall' }, '11:33ef540'],
];

function countLit(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}

function isCentreLit(frame: Frame): boolean {
  return frame[5 * GRID.cols + 5] === 1;
}

describe('particles hyperspace variants', () => {
  it.each(PINS)('keeps the exact %s frames on the 11x11 grid', (_, params, pin) => {
    expect(digest(generateParticles(GRID, params))).toBe(pin);
  });

  it('streaks the stars outward over 16 frames of 60 ms and keeps the centre dark', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'warp' });
    expect(frames).toHaveLength(LOOP_FRAMES);
    expect(durations.every((ms) => ms === WARP_MS)).toBe(true);
    expect(frames.some(isCentreLit)).toBe(false);
  });

  it('draws straight radial streaks of three dots along compass lines', () => {
    const { frames } = generateParticles(GRID, { variant: 'warp' });
    expect(frames.filter(hasRadialRun).length).toBeGreaterThanOrEqual(LOOP_FRAMES / 2);
  });

  it('drifts at most six single stars so the idle reads calmer than the jump', () => {
    const { frames } = generateParticles(GRID, { variant: 'warp-drift' });
    frames.forEach((frame) => expect(countLit(frame)).toBeLessThanOrEqual(DRIFT_STARS));
  });

  it('draws single drifting stars at 140 ms, fewer dots than the streaks', () => {
    const drift = generateParticles(GRID, { variant: 'warp-drift' });
    const warp = generateParticles(GRID, { variant: 'warp' });
    expect(drift.durations.every((ms) => ms % DRIFT_MS === 0)).toBe(true);
    const total = (frames: readonly Frame[]) => frames.reduce((sum, frame) => sum + countLit(frame), 0);
    expect(total(drift.frames)).toBeLessThan(total(warp.frames));
  });

  it('lengthens the streaks with density', () => {
    const lit = (density: number) =>
      generateParticles(GRID, { variant: 'warp', density }).frames.reduce(
        (sum, frame) => sum + countLit(frame),
        0,
      );
    expect(lit(1)).toBeGreaterThan(lit(0.5));
  });

  it('snaps the streaks to points, gathers them on one held dot of the check and blooms the check from it', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'warp-arrive' });
    const tick = glyphMask('check', GRID);
    const gathered = frames.findIndex((frame) => countLit(frame) === 1);
    const dot = frames[gathered].indexOf(1);
    expect(gathered).toBeGreaterThan(1);
    expect(tick[dot]).toBe(1);
    expect(durations[gathered]).toBeGreaterThanOrEqual(ARRIVAL_HOLD_MS);
    expect(frames[frames.length - 1]).toEqual(tick);
    expect(durations[durations.length - 1]).toBe(HOLD_MS);
    frames.slice(gathered).forEach((frame, index, bloom) => {
      expect(frame[dot]).toBe(1);
      if (index > 0) frame.forEach((bit, cell) => expect(bit >= bloom[index - 1][cell]).toBe(true));
    });
  });

  it('stops the stars and lets them fall a row every 90 ms until the grid is empty', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'warp-stall' });
    const stopped = frames[1];
    const fallen = frames[2];
    expect(fallen).toEqual([...Array.from({ length: GRID.cols }, () => 0), ...stopped.slice(0, -GRID.cols)]);
    expect(durations.slice(2, -1).every((ms) => ms === FALL_MS)).toBe(true);
    expect(countLit(frames[frames.length - 1])).toBe(0);
  });
});
