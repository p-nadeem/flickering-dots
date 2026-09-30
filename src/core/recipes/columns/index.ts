import type { RecipeFn } from '../helpers';
import { VARIANTS_A } from './variants-a';
import { VARIANTS_B } from './variants-b';

const DEFAULT_VARIANT = 'pendulum';

const VARIANTS: Readonly<Record<string, RecipeFn>> = { ...VARIANTS_A, ...VARIANTS_B };

/** Names of the columns recipe's variants, in display order. */
export const COLUMNS_VARIANTS: readonly string[] = Object.keys(VARIANTS);

function isColumnsVariant(name: string): boolean {
  return Object.hasOwn(VARIANTS, name);
}

/** One value per column per frame (a height, a phase or a bar), drawn by the variant named in `params.variant`. */
export const generateColumns: RecipeFn = (grid, params) => {
  const variant = params.variant ?? DEFAULT_VARIANT;
  if (!isColumnsVariant(variant)) {
    throw new Error(
      `flickering-dots columns: unknown variant ${JSON.stringify(variant)}; use one of ${COLUMNS_VARIANTS.join(', ')}`,
    );
  }
  return VARIANTS[variant](grid, params);
};
