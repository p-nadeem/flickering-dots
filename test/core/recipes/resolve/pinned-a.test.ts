import { describe, expect, it } from 'vitest';

import { VARIANTS_A } from '../../../../src/core/recipes/resolve/variants-a';

import { toOutputText } from '../frame-text';
import { PLATE_FRAMES } from './frames-plate';
import { SIGNBOARD_FRAMES } from './frames-signboard';

const SET_GRIDS: Readonly<Record<string, number>> = {
  rain: 7,
  flap: 9,
  'flap-rtl': 9,
  'flap-band': 9,
  'flap-rest': 9,
  morph: 9,
  settle: 11,
  'settle-fail': 11,
};

const PINNED = { ...SIGNBOARD_FRAMES, ...PLATE_FRAMES };

describe('resolve variants on their set grids', () => {
  it.each(Object.keys(PINNED))('draws the exact %s frames', (key) => {
    const [variant, glyph] = key.split(' ');
    const side = SET_GRIDS[variant];
    const output = VARIANTS_A[variant]({ cols: side, rows: side }, glyph ? { glyph } : {});
    const { still, ...pinned } = PINNED[key];
    expect(toOutputText(output, side)).toEqual(pinned);
    expect(output.still).toBe(still);
  });
});
