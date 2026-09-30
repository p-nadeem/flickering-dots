import { describe, expect, it, vi } from 'vitest';

import { build } from '../../src/core/build';

vi.mock('../../src/core/recipes/options', () => ({
  getRecipeOptions: (id: string) =>
    id === 'noise' ? { variants: ['soft', 'hard'], glyphs: ['check', 'cross'] } : undefined,
}));

describe('build variant and glyph rules', () => {
  const grid = { cols: 7, rows: 7 };

  it('accepts a listed variant and glyph', () => {
    expect(() => build('noise', grid, { variant: 'soft', glyph: 'cross' })).not.toThrow();
  });

  it('rejects an unknown variant or glyph for a recipe with rules, even after a cached build', () => {
    build('noise', grid, { seed: 5 });

    expect(() => build('noise', grid, { seed: 5, variant: 'loud' })).toThrow(
      'flickering-dots build: params.variant "loud" is not a noise variant; use one of soft, hard',
    );
    expect(() => build('noise', grid, { glyph: 'plus' })).toThrow(
      'flickering-dots build: params.glyph "plus" is not a noise glyph; use one of check, cross',
    );
  });

  it('accepts any variant and glyph text for a recipe without rules', () => {
    expect(() => build('pulse', grid, { variant: 'anything', glyph: 'any' })).not.toThrow();
  });
});
