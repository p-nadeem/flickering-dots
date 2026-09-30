import { describe, expect, it } from 'vitest';

import { stateNames } from '../../src/core/state-names';

import { EMPTY_SET, FRAMES_SET, NO_THINKING_SET, RECIPE_SET } from './fixtures';

describe('stateNames', () => {
  it('lists standard states in STATE_ORDER before custom states', () => {
    expect(stateNames(FRAMES_SET)).toEqual(['idle', 'thinking', 'error', 'wave']);
  });

  it('keeps custom states in insertion order', () => {
    const set = {
      ...FRAMES_SET,
      states: {
        zeta: FRAMES_SET.states.idle,
        success: FRAMES_SET.states.idle,
        alpha: FRAMES_SET.states.idle,
      },
    };

    expect(stateNames(set)).toEqual(['success', 'zeta', 'alpha']);
  });

  it('skips standard states the set does not have', () => {
    expect(stateNames(NO_THINKING_SET)).toEqual(['success', 'error']);
    expect(stateNames(RECIPE_SET)).toEqual(['idle', 'thinking', 'success', 'error']);
  });

  it('returns an empty list for a set without states', () => {
    expect(stateNames(EMPTY_SET)).toEqual([]);
  });

  it('returns a new array on every call', () => {
    expect(stateNames(FRAMES_SET)).not.toBe(stateNames(FRAMES_SET));
  });
});
