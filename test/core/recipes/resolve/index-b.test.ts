import { describe, expect, it } from 'vitest';

import { generateResolve, RESOLVE_VARIANTS } from '../../../../src/core/recipes/resolve';
import { VARIANTS_B } from '../../../../src/core/recipes/resolve/variants-b';

const BOARD = { cols: 16, rows: 7 };
const COUNTER = { cols: 5, rows: 7 };
const OWN_VARIANTS = [
  'font',
  'font-wait',
  'font-done',
  'font-fail',
  'segments',
  'segments-done',
  'segments-fail',
];

describe('resolve engine, part b', () => {
  it('offers the departure-board and countdown variants', () => {
    expect(Object.keys(VARIANTS_B)).toEqual(OWN_VARIANTS);
    OWN_VARIANTS.forEach((variant) => expect(RESOLVE_VARIANTS).toContain(variant));
  });

  it('dispatches on params.variant', () => {
    OWN_VARIANTS.forEach((variant) => {
      const grid = variant.startsWith('font') ? BOARD : COUNTER;
      expect(generateResolve(grid, { variant }), variant).toEqual(VARIANTS_B[variant](grid, { variant }));
    });
  });
});
