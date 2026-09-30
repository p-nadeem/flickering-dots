import { describe, expect, it } from 'vitest';

import { generateNetwork, NETWORK_DEFAULTS, NETWORK_VARIANTS } from '../../../../src/core/recipes/network';

import type { Frame } from '../../../../src/core/types';

import {
  expectWellFormed,
  gridsFrom,
  MAX_BIG_CHANGES_PER_WINDOW,
  maxBigChangesPerSecond,
  run,
} from './network-checks';

const STROBE_MS = 70;
const STROBE_FRAMES = 14;

const SMALLEST_SIDE = 3;

describe('generateNetwork', () => {
  it('lists every variant the synapse, constellation and circuit sets use', () => {
    expect(NETWORK_VARIANTS).toEqual([
      'synapse',
      'synapse-rest',
      'synapse-forward',
      'synapse-drop',
      'synapse-train',
      'stars',
      'constellation',
      'constellation-lock',
      'constellation-snap',
      'sparkle-grow',
      'circuit',
      'trace-idle',
      'circuit-roundtrip',
      'circuit-lit',
      'circuit-break',
    ]);
  });

  it('plays the synapse variant when no variant is given', () => {
    const grid = { cols: 11, rows: 9 };
    expect(NETWORK_DEFAULTS.variant).toBe('synapse');
    expect(generateNetwork(grid)).toEqual(run('synapse', grid));
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => run('plasma', { cols: 9, rows: 9 })).toThrow(
      'flickering-dots network: unknown variant "plasma"; use one of synapse, synapse-rest',
    );
  });

  it('draws every variant on every grid from 3x3 up without throwing', () => {
    gridsFrom(SMALLEST_SIDE, SMALLEST_SIDE).forEach((grid) => {
      NETWORK_VARIANTS.forEach((variant) => expectWellFormed(run(variant, grid), grid));
    });
  });

  it('changes the picture with the seed', () => {
    const grid = { cols: 12, rows: 12 };
    expect(run('constellation', grid, { seed: 1 })).not.toEqual(run('constellation', grid, { seed: 2 }));
  });

  it('counts a whole-grid strobe as unsafe, so the flash checks can fail', () => {
    const grid = { cols: 4, rows: 4 };
    const frames: Frame[] = Array.from({ length: STROBE_FRAMES }, (_, index) =>
      Array.from({ length: 16 }, () => (index % 2 === 0 ? 0 : 1)),
    );
    const strobe = { frames, durations: frames.map(() => STROBE_MS) };
    expect(maxBigChangesPerSecond(strobe, grid, true)).toBeGreaterThan(MAX_BIG_CHANGES_PER_WINDOW);
  });
});
