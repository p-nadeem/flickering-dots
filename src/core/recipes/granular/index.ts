import type { GridSize, RecipeParams } from '../../types';
import type { RecipeFn, RecipeOutput } from '../helpers';
import { generateDrift } from './drift';
import { generateDriftProgress } from './drift-progress';
import { generateDriftBlizzard, generateDriftSettle } from './drift-results';
import {
  generateHourglass,
  generateHourglassFull,
  generateHourglassProgress,
  generateHourglassSlow,
} from './hourglass';
import { generateHourglassDone, generateHourglassJam } from './hourglass-results';
import type { RecipeOptionRules } from '../validate';
import { NO_GLYPHS } from '../validate';

/** Variants of the granular recipe: the hourglass family and the snow drift family. */
export const GRANULAR_VARIANTS = [
  'hourglass',
  'hourglass-full',
  'hourglass-slow',
  'hourglass-progress',
  'hourglass-done',
  'hourglass-jam',
  'drift',
  'drift-progress',
  'drift-settle',
  'drift-blizzard',
] as const;

/** One of `GRANULAR_VARIANTS`. */
export type GranularVariant = (typeof GRANULAR_VARIANTS)[number];

/** Params used when none are given. */
export const GRANULAR_DEFAULTS = {
  variant: 'hourglass',
  density: 1,
  seed: 11,
} as const satisfies RecipeParams;

const GENERATORS: Readonly<Record<GranularVariant, RecipeFn>> = {
  hourglass: generateHourglass,
  'hourglass-full': generateHourglassFull,
  'hourglass-slow': generateHourglassSlow,
  'hourglass-progress': generateHourglassProgress,
  'hourglass-done': generateHourglassDone,
  'hourglass-jam': generateHourglassJam,
  drift: generateDrift,
  'drift-progress': generateDriftProgress,
  'drift-settle': generateDriftSettle,
  'drift-blizzard': generateDriftBlizzard,
};

function isGranularVariant(name: string): name is GranularVariant {
  return GRANULAR_VARIANTS.some((variant) => variant === name);
}

/** Grains with conserved counts: an hourglass that drains and turns, and snow that drifts, settles and melts; `variant` picks one. */
export function generateGranular(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? GRANULAR_DEFAULTS.variant;
  if (!isGranularVariant(variant)) {
    throw new Error(
      `flickering-dots granular: unknown variant ${JSON.stringify(variant)}; use one of ${GRANULAR_VARIANTS.join(', ')}`,
    );
  }
  return GENERATORS[variant](grid, { ...params, seed: params.seed ?? GRANULAR_DEFAULTS.seed });
}

export const GRANULAR_OPTIONS: RecipeOptionRules = { variants: GRANULAR_VARIANTS, glyphs: NO_GLYPHS };
