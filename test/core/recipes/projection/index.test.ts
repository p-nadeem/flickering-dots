import { describe, expect, it } from 'vitest';

import { GLYPH_NAMES } from '../../../../src/core/glyphs';
import {
  PROJECTION_GLYPHS,
  PROJECTION_MIN_SIDES,
  PROJECTION_VARIANTS,
  generateProjection,
} from '../../../../src/core/recipes/projection';

describe('generateProjection', () => {
  it('draws the cube spin when no variant is given', () => {
    const grid = { cols: 12, rows: 12 };

    expect(generateProjection(grid)).toEqual(generateProjection(grid, { variant: 'cube' }));
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateProjection({ cols: 12, rows: 12 }, { variant: 'plasma' })).toThrow(
      'flickering-dots projection: unknown variant "plasma"; use one of cube, cube-rest,',
    );
  });

  it('lists every variant with its smallest readable side', () => {
    expect(Object.keys(PROJECTION_MIN_SIDES)).toEqual([...PROJECTION_VARIANTS]);
    expect(PROJECTION_MIN_SIDES).toMatchObject({ cube: 11, globe: 9, torus: 14, coin: 7, cloud: 12 });
  });

  it('takes the shared glyphs plus sphere', () => {
    expect(PROJECTION_GLYPHS).toEqual([...GLYPH_NAMES, 'sphere']);
  });

  it('draws a still frame at one frame per quarter turn', () => {
    expect(generateProjection({ cols: 12, rows: 12 }, { variant: 'cube', frames: 1 }).frames).toHaveLength(1);
  });
});
