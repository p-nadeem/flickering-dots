import { mergeEqualNeighbours } from './compact';
import { createLruCache } from './lru-cache';
import { getRecipe } from './recipes';
import { getRecipeOptions } from './recipes/options';
import { assertRecipeGrid, assertRecipeOptions, assertRecipeParams } from './recipes/validate';
import type { Clip, GridSize, RecipeId, RecipeParams } from './types';

/** How many built clips `build` keeps, so heavy recipes run once per recipe, grid and params. */
export const BUILD_CACHE_LIMIT = 512;

const cache = createLruCache<Clip>(BUILD_CACHE_LIMIT);

function cacheKey(recipe: string, { cols, rows }: GridSize, params: RecipeParams): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : 1));
  return JSON.stringify([recipe, cols, rows, entries]);
}

function copyClip(clip: Clip): Clip {
  return { ...clip, frames: clip.frames.map((frame) => [...frame]), durations: [...clip.durations] };
}

function runRecipe(recipe: string, grid: GridSize, params: RecipeParams): Clip {
  const { frames, durations, still } = getRecipe(recipe)(grid, params);
  return mergeEqualNeighbours({
    cols: grid.cols,
    rows: grid.rows,
    frames,
    durations,
    ...(still === undefined ? {} : { still }),
  });
}

/** Runs a recipe for a grid, reusing a kept copy for the same inputs. Unknown ids fall back to `pulse`; an invalid grid or params throw. */
export function build(recipe: RecipeId | (string & {}), grid: GridSize, params: RecipeParams = {}): Clip {
  assertRecipeGrid(grid);
  assertRecipeParams(params);
  assertRecipeOptions(recipe, params, getRecipeOptions(recipe));
  const key = cacheKey(recipe, grid, params);
  const kept = cache.read(key) ?? runRecipe(recipe, grid, params);
  cache.write(key, kept);
  return copyClip(kept);
}
