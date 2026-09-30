import { BUILD_CACHE_LIMIT, createBuild } from './builder';
import type { BuildFn } from './builder';
import { getRecipe } from './recipes';
import { getRecipeOptions } from './recipes/options';

export { BUILD_CACHE_LIMIT };

/** Runs a recipe for a grid, reusing a kept copy for the same inputs. Unknown ids fall back to `pulse`; an invalid grid or params throw. */
export const build: BuildFn = createBuild((recipe) => ({
  run: getRecipe(recipe),
  options: getRecipeOptions(recipe),
}));
