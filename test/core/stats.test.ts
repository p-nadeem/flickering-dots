import { describe, expect, it } from 'vitest';

import { build } from '../../src/core/build';
import { busiestFrame, stats, stillFrame } from '../../src/core/stats';
import type { Clip } from '../../src/core/types';

import {
  CENTRE_3,
  CROSS_3,
  EMPTY_SET,
  FRAMES_SET,
  FULL_3,
  NO_THINKING_SET,
  PLUS_3,
  RECIPE_SET,
} from './fixtures';

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe('stats', () => {
  it('counts frames across every state and uses the thinking cycle', () => {
    expect(stats(FRAMES_SET)).toEqual({ frames: 7, cycleMs: 600, states: 4 });
  });

  it('uses the first state for the cycle when there is no thinking state', () => {
    expect(stats(NO_THINKING_SET)).toEqual({ frames: 3, cycleMs: 800, states: 2 });
  });

  it('resolves recipe states to count their frames', () => {
    const grid = { cols: 7, rows: 7 };
    const recipes = ['idle', 'pulse', 'check', 'cross'] as const;
    const frames = sum(recipes.map((recipe) => build(recipe, grid).frames.length));

    expect(stats(RECIPE_SET)).toEqual({
      frames,
      cycleMs: sum(build('pulse', grid).durations),
      states: 4,
    });
  });

  it('returns zeros for a set without states', () => {
    expect(stats(EMPTY_SET)).toEqual({ frames: 0, cycleMs: 0, states: 0 });
  });
});

describe('busiestFrame', () => {
  const clip: Clip = {
    cols: 3,
    rows: 3,
    frames: [CENTRE_3, CROSS_3, FULL_3, PLUS_3],
    durations: [1, 1, 1, 1],
  };

  it('returns the index of the frame with the most lit cells', () => {
    expect(busiestFrame(clip)).toBe(2);
  });

  it('returns the first of several equally busy frames', () => {
    const tied: Clip = { ...clip, frames: [CENTRE_3, PLUS_3, CROSS_3] };

    expect(busiestFrame(tied)).toBe(1);
  });

  it('returns 0 for a clip without frames', () => {
    expect(busiestFrame({ cols: 3, rows: 3, frames: [], durations: [] })).toBe(0);
  });

  it('breaks a tie with the frame whose lit cells sit closest to the grid centre', () => {
    const sliding: Clip = {
      cols: 5,
      rows: 1,
      frames: [
        [1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 1, 1],
      ],
      durations: [1, 1, 1],
    };

    expect(busiestFrame(sliding)).toBe(1);
  });
});

describe('stillFrame', () => {
  const clip: Clip = {
    cols: 3,
    rows: 3,
    frames: [CENTRE_3, CROSS_3, FULL_3, PLUS_3],
    durations: [1, 1, 1, 1],
  };

  it('returns the still frame a clip names', () => {
    expect(stillFrame({ ...clip, still: 3 })).toBe(3);
  });

  it('falls back to the busiest frame without a valid still frame', () => {
    expect(stillFrame(clip)).toBe(2);
    expect(stillFrame({ ...clip, still: 4 })).toBe(2);
    expect(stillFrame({ ...clip, still: -1 })).toBe(2);
    expect(stillFrame({ ...clip, still: 1.5 })).toBe(2);
  });
});
