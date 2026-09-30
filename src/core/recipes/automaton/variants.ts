import { GLYPH_NAMES } from '../../glyphs';
import type { RecipeParams } from '../../types';

/** Variants of the `automaton` recipe. */
export const AUTOMATON_VARIANTS = [
  'fire',
  'fire-out',
  'fire-gutter',
  'rule-90',
  'rule-30',
  'rule-204',
  'ant',
  'ant-rest',
  'ant-undo',
  'ant-home',
  'ant-freeze',
  'spots',
  'spots-breathe',
  'spots-coral',
  'spots-pulse',
  'spots-labyrinth',
] as const;

/** One of `AUTOMATON_VARIANTS`. */
export type AutomatonVariant = (typeof AUTOMATON_VARIANTS)[number];

/** Glyphs the `automaton` recipe draws: fire-out rises into one, rule-90 blooms into one. */
export const AUTOMATON_GLYPHS = GLYPH_NAMES;

/** Default params of the `automaton` recipe: the thinking campfire. */
export const AUTOMATON_DEFAULTS = {
  variant: 'fire',
  density: 0.65,
  frames: 16,
  seed: 11,
} as const satisfies RecipeParams;

/** True when `name` is one of `AUTOMATON_VARIANTS`. */
export function isAutomatonVariant(name: string): name is AutomatonVariant {
  return AUTOMATON_VARIANTS.some((variant) => variant === name);
}
