import type { IndicatorSet, RecipeStateDef } from '../core/types';

export const BUILTIN = { author: 'Flickering Dots', source: 'builtin' } as const satisfies Pick<
  IndicatorSet,
  'author' | 'source'
>;

export const IDLE_STATE = { kind: 'recipe', recipe: 'idle' } as const satisfies RecipeStateDef;

export const CHECK_STATE = { kind: 'recipe', recipe: 'check' } as const satisfies RecipeStateDef;

export const CROSS_STATE = { kind: 'recipe', recipe: 'cross' } as const satisfies RecipeStateDef;
