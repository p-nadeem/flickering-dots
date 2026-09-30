import { describe, expect, it } from 'vitest';

import type { Clip } from '../../src/core/types';

import { countPeakFlashesPerSecond } from './flashes';

function blinkClip(onMs: number, offMs: number): Clip {
  return { cols: 1, rows: 1, frames: [[1], [0]], durations: [onMs, offMs] };
}

describe('countPeakFlashesPerSecond', () => {
  it('counts a 2 Hz blink as two flashes a second', () => {
    expect(countPeakFlashesPerSecond(blinkClip(250, 250))).toBe(2);
  });

  it('counts a 5 Hz blink as five flashes a second', () => {
    expect(countPeakFlashesPerSecond(blinkClip(100, 100))).toBe(5);
  });

  it('counts no flashes for a still frame', () => {
    expect(countPeakFlashesPerSecond({ cols: 1, rows: 1, frames: [[1]], durations: [1000] })).toBe(0);
  });
});
