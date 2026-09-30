import { describe, expect, it } from 'vitest';

import {
  PARTICLES_DEFAULTS,
  PARTICLES_VARIANTS,
  generateParticles,
} from '../../../../src/core/recipes/particles';

import { VARIANT_CASES } from './cases';

const GRID = { cols: 11, rows: 11 };

describe('generateParticles variants', () => {
  it('lists every variant the five particle sets use', () => {
    expect([...PARTICLES_VARIANTS].sort()).toEqual(
      [...new Set(VARIANT_CASES.map(({ params }) => params.variant))].sort(),
    );
  });

  it('draws the default variant when none is given', () => {
    expect(generateParticles(GRID, {})).toEqual(
      generateParticles(GRID, { variant: PARTICLES_DEFAULTS.variant }),
    );
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateParticles(GRID, { variant: 'plasma' })).toThrow(
      'flickering-dots particles: unknown variant "plasma"; use one of',
    );
  });

  it('changes the output with the seed', () => {
    expect(generateParticles(GRID, { variant: 'jet', seed: 2 })).not.toEqual(
      generateParticles(GRID, { variant: 'jet', seed: 3 }),
    );
  });
});
