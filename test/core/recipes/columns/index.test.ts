import { describe, expect, it } from 'vitest';

import { COLUMNS_VARIANTS, generateColumns } from '../../../../src/core/recipes/columns';
import { VARIANTS_A } from '../../../../src/core/recipes/columns/variants-a';
import { VARIANTS_B } from '../../../../src/core/recipes/columns/variants-b';

const GRID = { cols: 12, rows: 7 };

describe('generateColumns', () => {
  it('lists the variants of both halves once each', () => {
    const names = [...Object.keys(VARIANTS_A), ...Object.keys(VARIANTS_B)];
    expect([...COLUMNS_VARIANTS].sort()).toEqual([...names].sort());
    expect(new Set(COLUMNS_VARIANTS).size).toBe(COLUMNS_VARIANTS.length);
  });

  it('dispatches on params.variant', () => {
    expect(generateColumns(GRID, { variant: 'helix' })).toEqual(VARIANTS_A.helix(GRID, { variant: 'helix' }));
  });

  it('draws the pendulum wave when no variant is given', () => {
    expect(generateColumns(GRID, {})).toEqual(VARIANTS_A.pendulum(GRID, {}));
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateColumns(GRID, { variant: 'plasma' })).toThrow(
      'flickering-dots columns: unknown variant "plasma"',
    );
  });
});
