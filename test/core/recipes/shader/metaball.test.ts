import { describe, expect, it } from 'vitest';

import { generateShader } from '../../../../src/core/recipes/shader';

import { countLit } from '../frame-text';
import { countBlobs, countIsolated, isMirroredBothWays, squareGrids, toRows, totalMs } from './checks';

const LAVA = { cols: 12, rows: 8 };
const IDLE_LOOP_MS = 16 * 160;
const THINKING_LOOP_MS = 24 * 90;
const MERGE_STEP_MS = 80;
const MERGE_HOLD_MS = 1200;
const DRIP_FALL_MS = 70;
const QUARTER_TURN = 6;
const IDLE_SIZES = 3;
const METABALL_MIN = 7;
const LARGEST = 16;

describe('shader metaball', () => {
  it('breathes one centred ball on the lava lamp grid', () => {
    const output = generateShader(LAVA, { variant: 'metaball', length: 1 });

    expect(totalMs(output)).toBe(IDLE_LOOP_MS);
    expect(new Set(output.frames.map(countLit)).size).toBe(IDLE_SIZES);
    output.frames.forEach((frame) => expect(isMirroredBothWays(frame, LAVA.cols)).toBe(true));
  });

  it('pulls the blobs apart into separate lobes at the quarter turn and keeps them off the side columns', () => {
    const output = generateShader(LAVA, { variant: 'metaball', length: 3 });
    const sideColumns = [0, LAVA.cols - 1];

    expect(totalMs(output)).toBe(THINKING_LOOP_MS);
    expect(countBlobs(output.frames[QUARTER_TURN], LAVA)).toBeGreaterThanOrEqual(2);
    expect(countBlobs(output.frames[0], LAVA)).toBe(1);
    output.frames.forEach((frame) =>
      toRows(frame, LAVA.cols).forEach((row) => sideColumns.forEach((x) => expect(row[x]).toBe('0'))),
    );
  });

  it('names the parted lobes as the still frame', () => {
    const output = generateShader(LAVA, { variant: 'metaball', length: 3 });

    expect(output.still).toBe(QUARTER_TURN);
  });

  it('uses three balls when asked for more', () => {
    expect(generateShader(LAVA, { variant: 'metaball', length: 5 })).toEqual(
      generateShader(LAVA, { variant: 'metaball', length: 3 }),
    );
  });

  it('follows a seeded voice level when one ball has a seed', () => {
    const first = generateShader(LAVA, { variant: 'metaball', length: 1, seed: 5 });
    const second = generateShader(LAVA, { variant: 'metaball', length: 1, seed: 9 });

    expect(first).not.toEqual(second);
    expect(new Set(first.frames.map(countLit)).size).toBeGreaterThan(2);
    first.frames.forEach((frame) => expect(isMirroredBothWays(frame, LAVA.cols)).toBe(true));
  });

  it('eases the balls into one blob, plops it outward and holds it with a tick cut out', () => {
    const output = generateShader(LAVA, { variant: 'metaball-merge' });
    const thinking = generateShader(LAVA, { variant: 'metaball', length: 3 });
    const last = output.frames[output.frames.length - 1];
    const plop = output.frames[output.frames.length - 2];

    expect(countBlobs(output.frames[0], LAVA)).toBe(2);
    expect(countLit(last)).toBeLessThan(countLit(plop));
    expect(countLit(plop)).toBeGreaterThan(Math.max(...thinking.frames.map(countLit)));
    thinking.frames.forEach((frame) => expect(frame).not.toEqual(last));
    expect(output.durations[0]).toBe(MERGE_STEP_MS);
    expect(output.durations[output.durations.length - 1]).toBeGreaterThanOrEqual(MERGE_HOLD_MS);
  });

  it('breaks the mass into droplets that fall off the bottom', () => {
    const output = generateShader(LAVA, { variant: 'metaball-drip' });
    const blobs = output.frames.map((frame) => countBlobs(frame, LAVA));

    expect(blobs[0]).toBe(1);
    expect(Math.max(...blobs)).toBeGreaterThanOrEqual(2);
    expect(output.durations).toContain(DRIP_FALL_MS);
    expect(countLit(output.frames[output.frames.length - 1])).toBe(0);
  });

  it.each(squareGrids(METABALL_MIN, LARGEST))('splits the mass without stray dots on %j', (grid) => {
    const output = generateShader(grid, { variant: 'metaball-drip' });
    const splitting = output.frames
      .filter((_, index) => output.durations[index] !== DRIP_FALL_MS)
      .slice(0, -1);

    splitting.forEach((frame) => expect(countIsolated(frame, grid)).toBe(0));
  });
});
