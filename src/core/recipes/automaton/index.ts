import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { generateAnt, generateAntFreeze, generateAntHome, generateAntRest, generateAntUndo } from './ant';
import { generateFire, generateFireGutter, generateFireOut } from './fire';
import { generateRule204, generateRule30, generateRule90 } from './rule';
import {
  generateSpots,
  generateSpotsBreathe,
  generateSpotsCoral,
  generateSpotsLabyrinth,
  generateSpotsPulse,
} from './spots';
import { AUTOMATON_DEFAULTS, AUTOMATON_GLYPHS, AUTOMATON_VARIANTS, isAutomatonVariant } from './variants';
import type { AutomatonVariant } from './variants';
import type { RecipeOptionRules } from '../validate';

export { AUTOMATON_DEFAULTS, AUTOMATON_GLYPHS, AUTOMATON_VARIANTS, isAutomatonVariant } from './variants';
export type { AutomatonVariant } from './variants';

type VariantFn = (grid: GridSize, params: RecipeParams) => RecipeOutput;

const VARIANTS: Readonly<Record<AutomatonVariant, VariantFn>> = {
  fire: generateFire,
  'fire-out': generateFireOut,
  'fire-gutter': generateFireGutter,
  'rule-90': generateRule90,
  'rule-30': generateRule30,
  'rule-204': generateRule204,
  ant: generateAnt,
  'ant-rest': generateAntRest,
  'ant-undo': generateAntUndo,
  'ant-home': generateAntHome,
  'ant-freeze': generateAntFreeze,
  spots: generateSpots,
  'spots-breathe': generateSpotsBreathe,
  'spots-coral': generateSpotsCoral,
  'spots-pulse': generateSpotsPulse,
  'spots-labyrinth': generateSpotsLabyrinth,
};

/** Cellular automata and reaction-diffusion: campfire, elementary rules 90, 30 and 204, Langton's ant and Gray-Scott spots. */
export function generateAutomaton(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? AUTOMATON_DEFAULTS.variant;
  if (!isAutomatonVariant(variant)) {
    throw new Error(
      `flickering-dots automaton: unknown variant ${JSON.stringify(variant)}; use one of ${AUTOMATON_VARIANTS.join(', ')}`,
    );
  }
  return VARIANTS[variant](grid, params);
}

export const AUTOMATON_OPTIONS: RecipeOptionRules = {
  variants: AUTOMATON_VARIANTS,
  glyphs: AUTOMATON_GLYPHS,
};
