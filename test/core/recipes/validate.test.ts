import { describe, expect, it } from 'vitest';

import { assertRecipeOptions, assertRecipeParams } from '../../../src/core/recipes/validate';
import type { RecipeOptionRules } from '../../../src/core/recipes/validate';

const LONGEST_TEXT = 'x'.repeat(64);
const SHADER_RULES: RecipeOptionRules = {
  variants: ['metaball', 'corridor'],
  glyphs: ['check', 'cross'],
};
const WORD_RULES: RecipeOptionRules = {
  glyphs: (glyph) => /^[A-Z|]+$/.test(glyph),
};

function parseJson<T>(text: string): T {
  return JSON.parse(text);
}

describe('assertRecipeParams variant and glyph', () => {
  it('accepts a variant and a glyph given as text', () => {
    expect(() => assertRecipeParams({ variant: 'metaball', glyph: 'PLAN|READ' })).not.toThrow();
    expect(() => assertRecipeParams({ variant: LONGEST_TEXT, glyph: LONGEST_TEXT })).not.toThrow();
  });

  it('rejects a variant or glyph that is not text', () => {
    expect(() => assertRecipeParams(parseJson('{"variant":3}'))).toThrow(
      'flickering-dots build: params.variant must be text of 1 to 64 characters, got 3',
    );
    expect(() => assertRecipeParams(parseJson('{"glyph":null}'))).toThrow(
      'flickering-dots build: params.glyph must be text of 1 to 64 characters, got null',
    );
  });

  it('rejects empty or overlong text', () => {
    expect(() => assertRecipeParams({ variant: '' })).toThrow(
      'params.variant must be text of 1 to 64 characters, got ""',
    );
    expect(() => assertRecipeParams({ glyph: `${LONGEST_TEXT}x` })).toThrow(
      'params.glyph must be text of 1 to 64 characters',
    );
  });
});

describe('assertRecipeOptions', () => {
  it('accepts any text while a recipe has no rules', () => {
    expect(() =>
      assertRecipeOptions('pulse', { variant: 'anything', glyph: 'any' }, undefined),
    ).not.toThrow();
    expect(() => assertRecipeOptions('pulse', { variant: 'anything' }, {})).not.toThrow();
  });

  it('accepts listed values and missing ones', () => {
    expect(() =>
      assertRecipeOptions('shader', { variant: 'corridor', glyph: 'cross' }, SHADER_RULES),
    ).not.toThrow();
    expect(() => assertRecipeOptions('shader', {}, SHADER_RULES)).not.toThrow();
  });

  it('names the recipe and the allowed variants when a variant is unknown', () => {
    expect(() => assertRecipeOptions('shader', { variant: 'plasma' }, SHADER_RULES)).toThrow(
      'flickering-dots build: params.variant "plasma" is not a shader variant; use one of metaball, corridor',
    );
  });

  it('names the recipe and the allowed glyphs when a glyph is unknown', () => {
    expect(() => assertRecipeOptions('shader', { glyph: 'heart' }, SHADER_RULES)).toThrow(
      'flickering-dots build: params.glyph "heart" is not a shader glyph; use one of check, cross',
    );
  });

  it('checks a glyph against a rule when the recipe takes free text', () => {
    expect(() => assertRecipeOptions('resolve', { glyph: 'PLAN|READ' }, WORD_RULES)).not.toThrow();
    expect(() => assertRecipeOptions('resolve', { glyph: 'plan' }, WORD_RULES)).toThrow(
      'flickering-dots build: params.glyph "plan" is not a resolve glyph',
    );
  });

  it('uses "an" before a recipe name that starts with a vowel', () => {
    expect(() => assertRecipeOptions('arcade', { variant: 'pong' }, { variants: ['stack'] })).toThrow(
      'flickering-dots build: params.variant "pong" is not an arcade variant; use one of stack',
    );
  });

  it('rejects any variant when the recipe lists none', () => {
    expect(() => assertRecipeOptions('check', { variant: 'bold' }, { variants: [] })).toThrow(
      'flickering-dots build: params.variant "bold" is not a check variant; the recipe takes none',
    );
  });
});
