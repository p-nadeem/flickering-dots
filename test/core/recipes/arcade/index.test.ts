import { describe, expect, it } from 'vitest';

import { ARCADE_VARIANTS, generateArcade } from '../../../../src/core/recipes/arcade';
import { VARIANTS_A } from '../../../../src/core/recipes/arcade/variants-a';
import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';

const RALLY_GRID = { cols: 9, rows: 5 };

describe('generateArcade', () => {
  it('lists every variant of both halves once, starting with the stack', () => {
    expect(ARCADE_VARIANTS).toEqual([...Object.keys(VARIANTS_A), ...Object.keys(VARIANTS_B)]);
    expect(new Set(ARCADE_VARIANTS).size).toBe(ARCADE_VARIANTS.length);
    expect(ARCADE_VARIANTS[0]).toBe('stack');
  });

  it('draws the named variant', () => {
    expect(generateArcade(RALLY_GRID, { variant: 'rally' })).toEqual(
      VARIANTS_A.rally(RALLY_GRID, { variant: 'rally' }),
    );
  });

  it('draws the stack when no variant is given', () => {
    const grid = { cols: 6, rows: 8 };
    expect(generateArcade(grid)).toEqual(VARIANTS_A.stack(grid, { variant: 'stack' }));
  });

  it('explains an unknown variant', () => {
    expect(() => generateArcade(RALLY_GRID, { variant: 'plasma' })).toThrow(
      'flickering-dots build: params.variant "plasma" is not an arcade variant; use one of stack, stack-rest',
    );
  });

  it('does not treat inherited object keys as variants', () => {
    expect(() => generateArcade(RALLY_GRID, { variant: 'toString' })).toThrow('is not an arcade variant');
  });
});
