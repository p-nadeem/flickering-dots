import type { RecipeId } from '../types';
import { ARCADE_VARIANTS } from './arcade';
import { DICE_FACES } from './arcade/dice-faces';
import { AUTOMATON_GLYPHS, AUTOMATON_VARIANTS } from './automaton';
import { COLUMNS_VARIANTS } from './columns';
import { FACE_VARIANTS } from './face';
import { GRANULAR_VARIANTS } from './granular';
import { GROW_VARIANTS } from './grow';
import { NETWORK_VARIANTS } from './network';
import { PARTICLES_VARIANTS } from './particles';
import { PROJECTION_GLYPHS, PROJECTION_VARIANTS } from './projection';
import { RESOLVE_VARIANTS } from './resolve';
import { isFontGlyph } from './resolve/font-glyphs';
import { isSegmentsGlyph } from './resolve/segments-layout';
import { GLYPHS_A } from './resolve/variants-a';
import { SHADER_VARIANTS } from './shader';
import { TRACE_VARIANTS } from './trace';
import type { RecipeOptionRules } from './validate';

const NO_GLYPHS: readonly string[] = [];

function isResolveGlyph(glyph: string): boolean {
  return GLYPHS_A.includes(glyph) || isFontGlyph(glyph) || isSegmentsGlyph(glyph);
}

/** Per-recipe allow lists for `variant` and `glyph`, built from each engine's `<ENGINE>_VARIANTS`; a recipe missing here accepts any text. */
export const RECIPE_OPTIONS: Readonly<Partial<Record<RecipeId, RecipeOptionRules>>> = {
  shader: { variants: SHADER_VARIANTS, glyphs: NO_GLYPHS },
  particles: { variants: PARTICLES_VARIANTS, glyphs: NO_GLYPHS },
  automaton: { variants: AUTOMATON_VARIANTS, glyphs: AUTOMATON_GLYPHS },
  grow: { variants: GROW_VARIANTS, glyphs: NO_GLYPHS },
  network: { variants: NETWORK_VARIANTS, glyphs: NO_GLYPHS },
  projection: { variants: PROJECTION_VARIANTS, glyphs: PROJECTION_GLYPHS },
  columns: { variants: COLUMNS_VARIANTS, glyphs: NO_GLYPHS },
  trace: { variants: TRACE_VARIANTS, glyphs: NO_GLYPHS },
  arcade: { variants: ARCADE_VARIANTS, glyphs: DICE_FACES },
  resolve: { variants: RESOLVE_VARIANTS, glyphs: isResolveGlyph },
  granular: { variants: GRANULAR_VARIANTS, glyphs: NO_GLYPHS },
  face: { variants: FACE_VARIANTS, glyphs: NO_GLYPHS },
};

function hasOptions(id: string): id is RecipeId {
  return Object.hasOwn(RECIPE_OPTIONS, id);
}

/** Returns the `variant` and `glyph` rules of a recipe, or undefined when it accepts any text. */
export function getRecipeOptions(id: string): RecipeOptionRules | undefined {
  return hasOptions(id) ? RECIPE_OPTIONS[id] : undefined;
}
