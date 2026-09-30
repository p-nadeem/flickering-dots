import type { GridSize, RecipeParams } from '../../types';
import type { RecipeFn, RecipeOutput } from '../helpers';
import { VARIANTS_A } from './variants-a';
import { VARIANTS_B } from './variants-b';
import type { RecipeOptionRules } from '../validate';
import { DICE_FACES } from './dice-faces';

const VARIANTS: Readonly<Record<string, RecipeFn>> = { ...VARIANTS_A, ...VARIANTS_B };

/** Variant ids of the arcade recipe; the first is drawn when `params.variant` is absent. */
export const ARCADE_VARIANTS: readonly string[] = Object.keys(VARIANTS);

function unknownVariant(variant: string): Error {
  return new Error(
    `flickering-dots build: params.variant ${JSON.stringify(variant)} is not an arcade variant; use one of ${ARCADE_VARIANTS.join(', ')}`,
  );
}

/** Tiny self-playing games (stack, rally, march, chomp, hunt, bricks, run, corner, reels, dice) chosen by `params.variant`. */
export function generateArcade(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? ARCADE_VARIANTS[0];
  if (!Object.hasOwn(VARIANTS, variant)) throw unknownVariant(variant);
  return VARIANTS[variant](grid, { ...params, variant });
}

export const ARCADE_OPTIONS: RecipeOptionRules = { variants: ARCADE_VARIANTS, glyphs: DICE_FACES };
