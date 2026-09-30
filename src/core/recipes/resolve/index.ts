import type { GridSize, RecipeParams } from '../../types';
import type { RecipeFn, RecipeOutput } from '../helpers';
import { GLYPHS_A, VARIANTS_A } from './variants-a';
import { VARIANTS_B } from './variants-b';
import type { RecipeOptionRules } from '../validate';
import { isFontGlyph } from './font-glyphs';
import { isSegmentsGlyph } from './segments-layout';

const VARIANTS: Readonly<Record<string, RecipeFn>> = { ...VARIANTS_A, ...VARIANTS_B };

/** Variants of the `resolve` recipe, the values `params.variant` accepts. */
export const RESOLVE_VARIANTS: readonly string[] = Object.keys(VARIANTS);

/** Default params of the `resolve` recipe: the check decoded out of digital rain. */
export const RESOLVE_DEFAULTS = { variant: 'rain', glyph: 'check' } as const satisfies RecipeParams;

function variantBuilder(name: string): RecipeFn {
  if (Object.hasOwn(VARIANTS, name)) return VARIANTS[name];
  throw new Error(
    `flickering-dots resolve: unknown variant ${JSON.stringify(name)}; use one of ${RESOLVE_VARIANTS.join(', ')}`,
  );
}

/** Glyph reveals: rain decode, split flap, morph, sand settle, board font and segment digits, by `params.variant`. */
export function generateResolve(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  return variantBuilder(params.variant ?? RESOLVE_DEFAULTS.variant)(grid, params);
}

function isResolveGlyph(glyph: string): boolean {
  return GLYPHS_A.includes(glyph) || isFontGlyph(glyph) || isSegmentsGlyph(glyph);
}

export const RESOLVE_OPTIONS: RecipeOptionRules = { variants: RESOLVE_VARIANTS, glyphs: isResolveGlyph };
