import { loadRecipes, missingRecipes } from '../core/recipes/store';
import type { IndicatorSet } from '../core/types';
import { PRESET_GROUPS, PRESET_MANIFEST } from './manifest';
import type { PresetEntry, PresetGroup } from './manifest';

const loaded = new Map<string, IndicatorSet>();
const loadingGroups = new Map<PresetGroup, Promise<void>>();

export function getPresetEntry(id: string): PresetEntry | undefined {
  return Object.hasOwn(PRESET_MANIFEST, id) ? PRESET_MANIFEST[id] : undefined;
}

export function getLoadedPreset(id: string): IndicatorSet | undefined {
  return loaded.get(id);
}

export function registerPreset(set: IndicatorSet): void {
  loaded.set(set.id, set);
}

export function isPresetReady(id: string): boolean {
  const entry = getPresetEntry(id);
  return entry !== undefined && loaded.has(id) && missingRecipes(entry.recipes).length === 0;
}

function loadGroup(group: PresetGroup): Promise<void> {
  const current = loadingGroups.get(group);
  if (current !== undefined) return current;
  const next = PRESET_GROUPS[group]().then(
    (sets) => sets.forEach(registerPreset),
    (error: unknown) => {
      loadingGroups.delete(group);
      throw error;
    },
  );
  loadingGroups.set(group, next);
  return next;
}

export function loadPreset(id: string): Promise<void> {
  const entry = getPresetEntry(id);
  if (entry === undefined)
    return Promise.reject(new Error(`flickering-dots: there is no preset called "${id}"`));
  if (isPresetReady(id)) return Promise.resolve();
  return Promise.all([loadGroup(entry.group), loadRecipes(entry.recipes)]).then(() => undefined);
}

/** Loads presets by id ahead of use, so the first render of each shows its animation without a loading frame. */
export function preloadPresets(...ids: string[]): Promise<void> {
  return Promise.all(ids.map(loadPreset)).then(() => undefined);
}
