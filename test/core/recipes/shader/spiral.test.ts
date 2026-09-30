import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateShader } from '../../../../src/core/recipes/shader';

import { countLit } from '../frame-text';
import { isMirroredBothWays } from './checks';

const SPIRAL = { cols: 11, rows: 11 };
const STEP_MS = 70;
const STILL_MS = 1000;
const UNWIND_MS = 80;
const DISC_RADIUS = 5.3;
const CENTRE = 5;

function isInsideDisc(frame: readonly number[]): boolean {
  return frame.every((bit, index) => {
    const x = index % SPIRAL.cols;
    const y = Math.floor(index / SPIRAL.cols);
    return bit === 0 || Math.hypot(x - CENTRE, y - CENTRE) <= DISC_RADIUS;
  });
}

describe('shader spiral', () => {
  it('turns one arm through twelve frames at 70 ms inside a round record', () => {
    const output = generateShader(SPIRAL, { variant: 'spiral', length: 1, density: 0.3 });

    expect(output.frames).toHaveLength(12);
    output.durations.forEach((ms) => expect(ms).toBe(STEP_MS));
    output.frames.forEach((frame) => expect(isInsideDisc(frame)).toBe(true));
  });

  it('turns two arms through eight frames', () => {
    const output = generateShader(SPIRAL, { variant: 'spiral', length: 2, density: 0.3, frames: 8 });

    expect(output.frames).toHaveLength(8);
  });

  it('freezes the coil for a second with one frame', () => {
    const output = generateShader(SPIRAL, { variant: 'spiral', density: 0.2, frames: 1 });

    expect(output.durations).toEqual([STILL_MS]);
  });

  it('unwinds into rings, contracts to the centre dot and blooms the tick out of it', () => {
    const output = generateShader(SPIRAL, { variant: 'spiral-unwind' });
    const tick = glyphMask('check', SPIRAL);
    const dotIndex = output.frames.findIndex((frame) => countLit(frame) === 1);
    const bloom = output.frames.slice(dotIndex + 1);

    expect(output.durations[0]).toBeGreaterThanOrEqual(UNWIND_MS);
    expect(output.frames.slice(0, dotIndex).some((frame) => isMirroredBothWays(frame, SPIRAL.cols))).toBe(
      true,
    );
    const dot = output.frames[dotIndex].indexOf(1);
    expect(tick[dot]).toBe(1);
    bloom.forEach((frame) => expect(frame[dot]).toBe(1));
    output.frames.forEach((frame) => expect(countLit(frame)).toBeGreaterThan(0));
    bloom.forEach((frame) => frame.forEach((bit, index) => expect(bit <= tick[index]).toBe(true)));
    bloom
      .slice(1)
      .forEach((frame, index) => frame.forEach((bit, cell) => expect(bit >= bloom[index][cell]).toBe(true)));
    expect(bloom[bloom.length - 1]).toEqual(tick);
  });
});
