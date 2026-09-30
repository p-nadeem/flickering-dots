import { describe, expect, it } from 'vitest';

import { generateProjection } from '../../../../src/core/recipes/projection';
import type { Frame, GridSize } from '../../../../src/core/types';

import { litBox, litCount, maxBigChangesPerSecond, overlayAll } from './clip-checks';

const GRID = { cols: 16, rows: 16 };
const TUMBLE_FRAMES = 40;
const SLOW_FRAMES = 24;
const COOKING_FRAMES = 28;
const HOLD_MS = 1500;
const MAX_BIG_PER_SECOND = 6;
const SIZES: readonly GridSize[] = [14, 15, 16].map((side) => ({ cols: side, rows: side }));

function touchesEdge(frame: Frame, { cols, rows }: GridSize): boolean {
  const { left, right, top, bottom } = litBox(frame, cols);
  return left === 0 || top === 0 || right === cols - 1 || bottom === rows - 1;
}

describe('projection torus', () => {
  it('tumbles a dithered torus over 40 frames at 100 ms', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'torus' });

    expect(frames).toHaveLength(TUMBLE_FRAMES);
    expect(new Set(durations)).toEqual(new Set([100]));
  });

  it('keeps every tumbling pose inside the grid with a one-dot margin', () => {
    SIZES.forEach((grid) => {
      generateProjection(grid, { variant: 'torus' }).frames.forEach((frame) =>
        expect(touchesEdge(frame, grid)).toBe(false),
      );
    });
  });

  it('centres the tumble: the poses together leave equal margins give or take one dot', () => {
    SIZES.forEach((grid) => {
      const { left, right, top, bottom } = litBox(
        overlayAll(generateProjection(grid, { variant: 'torus' }).frames),
        grid.cols,
      );
      expect(Math.abs(left - (grid.cols - 1 - right))).toBeLessThanOrEqual(1);
      expect(Math.abs(top - (grid.rows - 1 - bottom))).toBeLessThanOrEqual(1);
    });
  });

  it('cooks at 28 frames on 14x14 without breaking the flash rule', () => {
    const cooking = generateProjection({ cols: 14, rows: 14 }, { variant: 'torus', frames: COOKING_FRAMES });

    expect(maxBigChangesPerSecond(cooking, true)).toBeLessThanOrEqual(MAX_BIG_PER_SECOND);
  });

  it('turns on the view axis only in 24 frames at 150 ms', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'torus-slow' });

    expect(frames).toHaveLength(SLOW_FRAMES);
    expect(new Set(durations)).toEqual(new Set([150]));
    expect(frames[0]).toEqual(generateProjection(GRID, { variant: 'torus' }).frames[0]);
  });

  it('eases to a front view, thins to its rims, then to its outer rim, and draws a check inside', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'torus-front' });

    expect(durations.slice(0, 11)).toEqual([80, 80, 80, 80, 80, 80, 80, 80, 80, 140, 140]);
    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(touchesEdge(frames[9], GRID)).toBe(false);
  });

  it('freezes the front pose, drops it to the floor, bounces and dims', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'torus-drop' });
    const front = generateProjection(GRID, { variant: 'torus-front' }).frames[8];
    const last = frames[frames.length - 1];

    expect(frames[0]).toEqual(front);
    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(litBox(last, GRID.cols).bottom).toBe(GRID.rows - 1);
    expect(litCount(last)).toBeLessThan(litCount(front));
    expect(litCount(last)).toBeGreaterThan(litCount(front) / 3);
    frames.forEach((frame) => expect(litBox(frame, GRID.cols).top).toBeGreaterThanOrEqual(0));
  });
});
