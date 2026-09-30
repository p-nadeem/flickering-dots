import { describe, expect, it } from 'vitest';

import { build } from '../../src/core/build';
import { DEFAULT_FRAME_MS } from '../../src/core/constants';
import { resolve } from '../../src/core/resolve';
import type { IndicatorSet } from '../../src/core/types';

import {
  CENTRE_3,
  COLOURED_SET,
  EMPTY_SET,
  FRAMES_SET,
  FULL_3,
  NO_THINKING_SET,
  PARAMS_SET,
  PLUS_3,
  RECIPE_SET,
} from './fixtures';

describe('resolve with frames states', () => {
  it('returns the stored frames, durations and grid of the state', () => {
    expect(resolve(FRAMES_SET, 'thinking')).toEqual({
      state: 'thinking',
      cols: 3,
      rows: 3,
      frames: [CENTRE_3, PLUS_3, FULL_3],
      durations: [100, 200, 300],
    });
  });

  it('keeps the set grid even when a grid override is given', () => {
    const result = resolve(FRAMES_SET, 'idle', { cols: 9, rows: 9 });

    expect(result).toMatchObject({ cols: 3, rows: 3, frames: [CENTRE_3] });
  });

  it('fills missing or unusable durations with DEFAULT_FRAME_MS', () => {
    const set: IndicatorSet = {
      ...FRAMES_SET,
      states: { thinking: { kind: 'frames', frames: [CENTRE_3, PLUS_3, FULL_3], durations: [120, 0] } },
    };

    expect(resolve(set, 'thinking').durations).toEqual([120, DEFAULT_FRAME_MS, DEFAULT_FRAME_MS]);
  });
});

describe('resolve with recipe states', () => {
  it('builds the recipe on the set grid', () => {
    expect(resolve(RECIPE_SET, 'thinking')).toEqual({
      ...build('pulse', { cols: 7, rows: 7 }),
      state: 'thinking',
    });
  });

  it('passes the state params to the recipe', () => {
    expect(resolve(PARAMS_SET, 'thinking')).toEqual({
      ...build('pulse', { cols: 5, rows: 5 }, { length: 4 }),
      state: 'thinking',
    });
  });

  it('builds on the override grid when one is given', () => {
    const result = resolve(RECIPE_SET, 'thinking', { cols: 9, rows: 3 });

    expect(result).toEqual({ ...build('pulse', { cols: 9, rows: 3 }), state: 'thinking' });
    expect(result.frames.every((frame) => frame.length === 27)).toBe(true);
  });

  it('rejects an override grid outside 3 to 16 with a readable error', () => {
    expect(() => resolve(RECIPE_SET, 'thinking', { cols: 2, rows: 7 })).toThrow(
      'flickering-dots resolve: grid.cols must be a whole number from 3 to 16, got 2',
    );
    expect(() => resolve(RECIPE_SET, 'thinking', { cols: 7, rows: 7.5 })).toThrow(
      'flickering-dots resolve: grid.rows must be a whole number from 3 to 16, got 7.5',
    );
  });
});

describe('resolve fallback', () => {
  it('falls back to thinking when the state is missing', () => {
    expect(resolve(FRAMES_SET, 'success').state).toBe('thinking');
  });

  it('uses thinking when no state is given', () => {
    expect(resolve(FRAMES_SET).state).toBe('thinking');
  });

  it('falls back to the first state when there is no thinking state', () => {
    const result = resolve(NO_THINKING_SET, 'idle');

    expect(result.state).toBe('success');
    expect(result.durations).toEqual([300, 500]);
  });

  it('ignores names inherited from Object.prototype', () => {
    expect(resolve(FRAMES_SET, 'toString').state).toBe('thinking');
    expect(resolve(NO_THINKING_SET, 'constructor').state).toBe('success');
  });

  it('throws a readable error for a set without states', () => {
    expect(() => resolve(EMPTY_SET)).toThrow('flickering-dots resolve: set "empty" has no states');
  });
});

describe('resolve per-state colour', () => {
  it('returns the on colour of a frames state', () => {
    expect(resolve(COLOURED_SET, 'thinking').on).toBe('#ff5a1f');
  });

  it('returns the on colour of a recipe state', () => {
    expect(resolve(COLOURED_SET, 'success').on).toBe('#3ecf8e');
  });

  it('leaves on out when the state has no colour', () => {
    expect('on' in resolve(COLOURED_SET, 'idle')).toBe(false);
    expect('on' in resolve(RECIPE_SET, 'thinking')).toBe(false);
  });
});

describe('resolve loop seams', () => {
  const STARS: IndicatorSet = {
    ...RECIPE_SET,
    cols: 12,
    rows: 12,
    states: {
      idle: { kind: 'recipe', recipe: 'network', params: { variant: 'stars' } },
      success: { kind: 'recipe', recipe: 'network', params: { variant: 'stars' } },
    },
  };

  it('folds a looping state whose last frame equals its first into the first frame', () => {
    const built = build('network', { cols: 12, rows: 12 }, { variant: 'stars' });
    const looped = resolve(STARS, 'idle');

    expect(looped.frames).toHaveLength(built.frames.length - 1);
    expect(looped.frames.at(-1)).not.toEqual(looped.frames[0]);
    expect(looped.durations.reduce((sum, ms) => sum + ms, 0)).toBe(
      built.durations.reduce((sum, ms) => sum + ms, 0),
    );
  });

  it('keeps every frame of a one-shot state so it still ends where the recipe ends', () => {
    const built = build('network', { cols: 12, rows: 12 }, { variant: 'stars' });

    expect(resolve(STARS, 'success').frames).toHaveLength(built.frames.length);
  });
});
