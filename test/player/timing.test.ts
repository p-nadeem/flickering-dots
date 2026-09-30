import { describe, expect, it } from 'vitest';

import { DEFAULT_FRAME_MS } from '../../src/core/constants';
import { assertClip, assertSpeed, getFrameMs, MIN_FRAME_MS, toFrameIndex } from '../../src/player/timing';

import { createClip } from './harness';

describe('getFrameMs', () => {
  it('divides the stored duration by the speed', () => {
    expect(getFrameMs([120, 300], 1, 3)).toBe(100);
  });

  it('never goes below the minimum frame time', () => {
    expect(getFrameMs([20], 0, 2)).toBe(MIN_FRAME_MS);
    expect(getFrameMs([0], 0, 1)).toBe(MIN_FRAME_MS);
  });

  it.each([undefined, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'uses the default frame duration for a stored duration of %s',
    (duration) => {
      const durations = duration === undefined ? [] : [duration];

      expect(getFrameMs(durations, 0, 1)).toBe(DEFAULT_FRAME_MS);
    },
  );
});

describe('assertSpeed', () => {
  it('returns a positive finite speed unchanged', () => {
    expect(assertSpeed(0.25)).toBe(0.25);
  });

  it.each([0, -1, Number.NaN, Number.NEGATIVE_INFINITY])('rejects %s with a readable message', (speed) => {
    expect(() => assertSpeed(speed)).toThrow(`speed must be a positive number, got ${String(speed)}`);
  });
});

describe('toFrameIndex', () => {
  it('keeps an index that is inside the clip', () => {
    expect(toFrameIndex(3, 5)).toBe(3);
  });

  it('clamps to the first and last frame and drops any fraction', () => {
    expect(toFrameIndex(-1, 5)).toBe(0);
    expect(toFrameIndex(9, 5)).toBe(4);
    expect(toFrameIndex(2.9, 5)).toBe(2);
  });

  it('rejects an index that is not a finite number', () => {
    expect(() => toFrameIndex(Number.NaN, 5)).toThrow('frame index must be a finite number, got NaN');
  });
});

describe('assertClip', () => {
  it('returns a clip that has frames', () => {
    const clip = createClip([100]);

    expect(assertClip(clip)).toBe(clip);
  });

  it('rejects a clip without frames', () => {
    expect(() => assertClip(createClip([]))).toThrow('clip has no frames');
  });
});
