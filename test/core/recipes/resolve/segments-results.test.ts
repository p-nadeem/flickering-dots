import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateCheck } from '../../../../src/core/recipes/check';
import { generateRipple } from '../../../../src/core/recipes/ripple';
import { generateSegments } from '../../../../src/core/recipes/resolve/segments';
import {
  generateSegmentsDone,
  generateSegmentsFail,
} from '../../../../src/core/recipes/resolve/segments-results';

import { changedCells, lastFrame } from './support-b';

const COUNTER = { cols: 5, rows: 7 };
const ZERO_MS = 400;
const RING_MS = 120;
const FLIGHT_MS = 60;
const DIGIT_MS = 120;
const FLIGHT_STEPS = 6;
const HOLD_MS = 1500;
const BURST_RINGS = 4;

describe('resolve segments results', () => {
  it('holds the 0, bursts in ripple rings, then draws the check and holds it', () => {
    const output = generateSegmentsDone(COUNTER, { variant: 'segments-done' });
    const zero = generateSegments(COUNTER, { glyph: '0' }).frames[0];
    const rings = generateRipple(COUNTER, { frames: BURST_RINGS + 1 }).frames.slice(0, -1);
    const check = generateCheck(COUNTER);
    expect(output.frames).toEqual([zero, ...rings, ...check.frames]);
    expect(output.durations).toEqual([ZERO_MS, ...rings.map(() => RING_MS), ...check.durations]);
    expect(lastFrame(output)).toEqual(glyphMask('check', COUNTER));
    expect(output.durations[output.durations.length - 1]).toBe(HOLD_MS);
  });

  it('bursts from the digit it is given', () => {
    const output = generateSegmentsDone(COUNTER, { variant: 'segments-done', glyph: '1' });
    expect(output.frames[0]).toEqual(generateSegments(COUNTER, { glyph: '1' }).frames[0]);
  });

  it('flies the digit into the cross in steps of 60 ms and holds it', () => {
    const grid = { cols: 7, rows: 7 };
    const output = generateSegmentsFail(grid, { variant: 'segments-fail' });
    const cross = glyphMask('cross', grid);
    expect(output.frames[0]).toEqual(generateSegments(grid, { glyph: '0' }).frames[0]);
    expect(lastFrame(output)).toEqual(cross);
    expect(output.durations[0]).toBeGreaterThanOrEqual(DIGIT_MS);
    expect(
      output.durations.slice(0, -1).every((ms) => (ms - DIGIT_MS) % FLIGHT_MS === 0 || ms % FLIGHT_MS === 0),
    ).toBe(true);
    output.frames.slice(1).forEach((frame, index) => expect(frame).not.toEqual(output.frames[index]));
    expect(output.durations[output.durations.length - 1]).toBe(HOLD_MS);
    expect(output.frames.length).toBeLessThanOrEqual(FLIGHT_STEPS + 1);
    output.frames.slice(0, -1).forEach((frame) => expect(changedCells(frame, cross)).toBeGreaterThan(0));
  });

  it('uses the last number of a range as the digit', () => {
    const output = generateSegmentsFail(COUNTER, { variant: 'segments-fail', glyph: '5-1' });
    expect(output.frames[0]).toEqual(generateSegments(COUNTER, { glyph: '1' }).frames[0]);
  });
});
