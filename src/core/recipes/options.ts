import type { RecipeId } from '../types';
import { ARCADE_OPTIONS } from './arcade';
import { AUTOMATON_OPTIONS } from './automaton';
import { COLUMNS_OPTIONS } from './columns';
import { FACE_OPTIONS } from './face';
import { GRANULAR_OPTIONS } from './granular';
import { GROW_OPTIONS } from './grow';
import { NETWORK_OPTIONS } from './network';
import { PARTICLES_OPTIONS } from './particles';
import { PROJECTION_OPTIONS } from './projection';
import { RESOLVE_OPTIONS } from './resolve';
import { SHADER_OPTIONS } from './shader';
import { TRACE_OPTIONS } from './trace';
import type { RecipeOptionRules } from './validate';

/** Per-recipe allow lists for `variant` and `glyph`, built from each engine's `<ENGINE>_VARIANTS`; a recipe missing here accepts any text. */
export const RECIPE_OPTIONS: Readonly<Partial<Record<RecipeId, RecipeOptionRules>>> = {
  shader: SHADER_OPTIONS,
  particles: PARTICLES_OPTIONS,
  automaton: AUTOMATON_OPTIONS,
  grow: GROW_OPTIONS,
  network: NETWORK_OPTIONS,
  projection: PROJECTION_OPTIONS,
  columns: COLUMNS_OPTIONS,
  trace: TRACE_OPTIONS,
  arcade: ARCADE_OPTIONS,
  resolve: RESOLVE_OPTIONS,
  granular: GRANULAR_OPTIONS,
  face: FACE_OPTIONS,
};

function hasOptions(id: string): id is RecipeId {
  return Object.hasOwn(RECIPE_OPTIONS, id);
}

/** Returns the `variant` and `glyph` rules of a recipe, or undefined when it accepts any text. */
export function getRecipeOptions(id: string): RecipeOptionRules | undefined {
  return hasOptions(id) ? RECIPE_OPTIONS[id] : undefined;
}
