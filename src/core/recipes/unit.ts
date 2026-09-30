import type { RecipeFn } from './helpers';
import type { RecipeOptionRules } from './validate';

export interface RecipeUnit {
  readonly run: RecipeFn;
  readonly options?: RecipeOptionRules;
}
