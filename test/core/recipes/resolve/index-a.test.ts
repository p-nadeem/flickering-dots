import { describe, expect, it } from 'vitest';

import { generateResolve, RESOLVE_DEFAULTS, RESOLVE_VARIANTS } from '../../../../src/core/recipes/resolve';
import { GLYPHS_A, VARIANTS_A } from '../../../../src/core/recipes/resolve/variants-a';
import { VARIANTS_B } from '../../../../src/core/recipes/resolve/variants-b';

const SET_GRID = { cols: 9, rows: 9 };
const OWN_VARIANTS = ['rain', 'flap', 'flap-rtl', 'flap-band', 'flap-rest', 'morph', 'settle', 'settle-fail'];

describe('resolve engine, part a', () => {
  it('offers the decode, split-flap, morph and sandplate variants', () => {
    expect(Object.keys(VARIANTS_A)).toEqual(OWN_VARIANTS);
    OWN_VARIANTS.forEach((variant) => expect(RESOLVE_VARIANTS).toContain(variant));
  });

  it('merges both variant maps without either hiding the other', () => {
    expect(RESOLVE_VARIANTS).toHaveLength(Object.keys(VARIANTS_A).length + Object.keys(VARIANTS_B).length);
  });

  it('dispatches on params.variant', () => {
    OWN_VARIANTS.forEach((variant) => {
      expect(generateResolve(SET_GRID, { variant }), variant).toEqual(
        VARIANTS_A[variant](SET_GRID, { variant }),
      );
    });
  });

  it('decodes the check out of the rain by default', () => {
    expect(RESOLVE_DEFAULTS.variant).toBe('rain');
    expect(generateResolve(SET_GRID)).toEqual(VARIANTS_A.rain(SET_GRID, {}));
  });

  it('rejects an unknown variant with the list it accepts', () => {
    expect(() => generateResolve(SET_GRID, { variant: 'plasma' })).toThrow(
      `flickering-dots resolve: unknown variant "plasma"; use one of ${RESOLVE_VARIANTS.join(', ')}`,
    );
  });
});

describe('resolve glyph names, part a', () => {
  it('lists every glyph the part a variants accept, once each', () => {
    expect(GLYPHS_A).toEqual([
      'check',
      'cross',
      'sparkle',
      'plus',
      'ellipsis',
      'chladni',
      'chladni-1',
      'chladni-2',
      'chladni-3',
    ]);
  });
});
