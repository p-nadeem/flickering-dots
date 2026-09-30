import { mergeEqualNeighbours } from './compact';
import { createLruCache } from './lru-cache';
import type { RecipeUnit } from './recipes/unit';
import { assertRecipeGrid, assertRecipeOptions, assertRecipeParams } from './recipes/validate';
import type { Clip, GridSize, RecipeId, RecipeParams } from './types';

export type BuildFn = (recipe: RecipeId | (string & {}), grid: GridSize, params?: RecipeParams) => Clip;

export const BUILD_CACHE_LIMIT = 512;

function cacheKey(recipe: string, { cols, rows }: GridSize, params: RecipeParams): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : 1));
  return JSON.stringify([recipe, cols, rows, entries]);
}

function copyClip(clip: Clip): Clip {
  return { ...clip, frames: clip.frames.map((frame) => [...frame]), durations: [...clip.durations] };
}

function runUnit(unit: RecipeUnit, grid: GridSize, params: RecipeParams): Clip {
  const { frames, durations, still } = unit.run(grid, params);
  return mergeEqualNeighbours({
    cols: grid.cols,
    rows: grid.rows,
    frames,
    durations,
    ...(still === undefined ? {} : { still }),
  });
}

export function createBuild(getUnit: (recipe: string) => RecipeUnit): BuildFn {
  const cache = createLruCache<Clip>(BUILD_CACHE_LIMIT);
  return (recipe, grid, params = {}) => {
    assertRecipeGrid(grid);
    assertRecipeParams(params);
    const unit = getUnit(recipe);
    assertRecipeOptions(recipe, params, unit.options);
    const key = cacheKey(recipe, grid, params);
    const kept = cache.read(key) ?? runUnit(unit, grid, params);
    cache.write(key, kept);
    return copyClip(kept);
  };
}
