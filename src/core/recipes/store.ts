import type { RecipeId } from '../types';
import { toKnownRecipe } from './ids';
import { RECIPE_LOADERS } from './loaders';
import type { RecipeUnit } from './unit';

const loaded = new Map<RecipeId, RecipeUnit>();
const loading = new Map<RecipeId, Promise<void>>();

export function getLoadedRecipe(id: string): RecipeUnit | undefined {
  return loaded.get(toKnownRecipe(id));
}

export function registerRecipe(id: RecipeId, unit: RecipeUnit): void {
  loaded.set(id, unit);
}

function loadOne(id: RecipeId): Promise<void> {
  const current = loading.get(id);
  if (current !== undefined) return current;
  const next = RECIPE_LOADERS[id]().then(
    (unit) => registerRecipe(id, unit),
    (error: unknown) => {
      loading.delete(id);
      throw error;
    },
  );
  loading.set(id, next);
  return next;
}

export function missingRecipes(ids: Iterable<string>): RecipeId[] {
  const known = new Set([...ids].map(toKnownRecipe));
  return [...known].filter((id) => !loaded.has(id));
}

export function loadRecipes(ids: Iterable<string>): Promise<void> {
  return Promise.all(missingRecipes(ids).map(loadOne)).then(() => undefined);
}
