import { describe, expect, it } from 'vitest';

import { build } from '../../../src/core/build';
import { GLYPH_NAMES } from '../../../src/core/glyphs';
import { ARCADE_VARIANTS } from '../../../src/core/recipes/arcade';
import { DICE_FACES } from '../../../src/core/recipes/arcade/dice-faces';
import { AUTOMATON_VARIANTS } from '../../../src/core/recipes/automaton';
import { COLUMNS_VARIANTS } from '../../../src/core/recipes/columns';
import { FACE_VARIANTS } from '../../../src/core/recipes/face';
import { GRANULAR_VARIANTS } from '../../../src/core/recipes/granular';
import { GROW_VARIANTS } from '../../../src/core/recipes/grow';
import { NETWORK_VARIANTS } from '../../../src/core/recipes/network';
import { getRecipeOptions, RECIPE_OPTIONS } from '../../../src/core/recipes/options';
import { PARTICLES_VARIANTS } from '../../../src/core/recipes/particles';
import { PROJECTION_GLYPHS, PROJECTION_VARIANTS } from '../../../src/core/recipes/projection';
import { RESOLVE_VARIANTS } from '../../../src/core/recipes/resolve';
import { SHADER_VARIANTS } from '../../../src/core/recipes/shader';
import { TRACE_VARIANTS } from '../../../src/core/recipes/trace';
import type { RecipeOptionRules } from '../../../src/core/recipes/validate';
import type { RecipeId } from '../../../src/core/types';

const NO_GLYPHS: readonly string[] = [];

const EXPECTED: Readonly<Record<string, { variants: readonly string[]; glyphs: readonly string[] }>> = {
  shader: { variants: SHADER_VARIANTS, glyphs: NO_GLYPHS },
  particles: { variants: PARTICLES_VARIANTS, glyphs: NO_GLYPHS },
  automaton: { variants: AUTOMATON_VARIANTS, glyphs: GLYPH_NAMES },
  grow: { variants: GROW_VARIANTS, glyphs: NO_GLYPHS },
  network: { variants: NETWORK_VARIANTS, glyphs: NO_GLYPHS },
  projection: { variants: PROJECTION_VARIANTS, glyphs: PROJECTION_GLYPHS },
  columns: { variants: COLUMNS_VARIANTS, glyphs: NO_GLYPHS },
  trace: { variants: TRACE_VARIANTS, glyphs: NO_GLYPHS },
  arcade: { variants: ARCADE_VARIANTS, glyphs: DICE_FACES },
  granular: { variants: GRANULAR_VARIANTS, glyphs: NO_GLYPHS },
  face: { variants: FACE_VARIANTS, glyphs: NO_GLYPHS },
};

const ENGINE_IDS = [...Object.keys(EXPECTED), 'resolve'];
const BASE_IDS: readonly RecipeId[] = ['pulse', 'orbit', 'rain', 'check', 'cross', 'hop', 'ripple', 'idle'];
const LARGE_GRID = { cols: 16, rows: 16 };

function rulesOf(id: string): RecipeOptionRules {
  const rules = getRecipeOptions(id);
  if (rules === undefined) throw new Error(`no rules for ${id}`);
  return rules;
}

describe('RECIPE_OPTIONS', () => {
  it('has rules for exactly the 12 wow engines', () => {
    expect(Object.keys(RECIPE_OPTIONS).sort()).toEqual([...ENGINE_IDS].sort());
  });

  it("lists each engine's own variants and glyphs", () => {
    for (const [id, { variants, glyphs }] of Object.entries(EXPECTED)) {
      expect(rulesOf(id).variants, id).toEqual(variants);
      expect(rulesOf(id).glyphs, id).toEqual(glyphs);
    }
    expect(rulesOf('resolve').variants).toEqual(RESOLVE_VARIANTS);
  });

  it('leaves the older recipes open to any variant and glyph text', () => {
    for (const id of BASE_IDS) {
      expect(getRecipeOptions(id), id).toBeUndefined();
    }
    expect(getRecipeOptions('toString')).toBeUndefined();
  });
});

describe('build with the wow engines', () => {
  it('builds every listed variant of every engine at the largest grid', () => {
    for (const id of ENGINE_IDS) {
      for (const variant of rulesOf(id).variants ?? []) {
        const clip = build(id, LARGE_GRID, { variant });
        expect(clip.frames.length, `${id} ${variant}`).toBeGreaterThan(0);
      }
    }
  }, 120_000);

  it('names the engine and its variants when the variant is unknown', () => {
    expect(() => build('shader', LARGE_GRID, { variant: 'plasma' })).toThrow(
      `flickering-dots build: params.variant "plasma" is not a shader variant; use one of ${SHADER_VARIANTS.join(', ')}`,
    );
  });

  it('rejects a glyph for an engine that draws none', () => {
    expect(() => build('face', LARGE_GRID, { glyph: 'check' })).toThrow(
      'flickering-dots build: params.glyph "check" is not a face glyph; the recipe takes none',
    );
  });

  it('accepts the listed glyphs and rejects others', () => {
    expect(() => build('projection', LARGE_GRID, { variant: 'cloud', glyph: 'sphere' })).not.toThrow();
    expect(() => build('arcade', LARGE_GRID, { variant: 'dice', glyph: 'six' })).not.toThrow();
    expect(() => build('automaton', LARGE_GRID, { variant: 'fire-out', glyph: 'heart' })).toThrow(
      'flickering-dots build: params.glyph "heart" is not an automaton glyph; use one of check, cross, sparkle, plus',
    );
  });
});

describe('resolve glyph rule', () => {
  const accepts = (glyph: string): boolean => {
    const { glyphs } = rulesOf('resolve');
    return typeof glyphs === 'function' && glyphs(glyph);
  };

  it('accepts result glyphs, chladni figures, board words and segment numbers', () => {
    for (const glyph of [
      'check',
      'ellipsis',
      'chladni',
      'chladni-2',
      'PLAN|READ|CODE|TEST',
      'done',
      '0-9',
      '42',
    ]) {
      expect(accepts(glyph), glyph).toBe(true);
    }
  });

  it('rejects text no resolve variant can draw', () => {
    for (const glyph of ['PL@N', 'a||b', '#']) {
      expect(accepts(glyph), glyph).toBe(false);
    }
    expect(() => build('resolve', LARGE_GRID, { variant: 'font', glyph: 'PL@N' })).toThrow(
      'flickering-dots build: params.glyph "PL@N" is not a resolve glyph',
    );
  });
});
