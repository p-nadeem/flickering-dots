import type { RecipeId } from '../types';

export const RECIPE_IDS: readonly RecipeId[] = [
  'pulse',
  'orbit',
  'radar',
  'ripple',
  'snake',
  'rain',
  'noise',
  'life',
  'wave',
  'bounce',
  'scan',
  'breathe',
  'ellipsis',
  'typewriter',
  'check',
  'cross',
  'idle',
  'heart',
  'arrow',
  'hop',
  'shimmer',
  'scanner',
  'bars',
  'cascade',
  'fill',
  'shader',
  'particles',
  'automaton',
  'grow',
  'network',
  'projection',
  'columns',
  'trace',
  'arcade',
  'resolve',
  'granular',
  'face',
];

const FALLBACK_RECIPE: RecipeId = 'pulse';

export function isRecipeId(id: string): id is RecipeId {
  return (RECIPE_IDS as readonly string[]).includes(id);
}

export function toKnownRecipe(id: string): RecipeId {
  return isRecipeId(id) ? id : FALLBACK_RECIPE;
}
