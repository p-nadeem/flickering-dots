import { DEFAULT_FRAME_MS, GRID_MAX, GRID_MIN } from '../core/constants';
import { loadRecipes, missingRecipes } from '../core/recipes/store';
import type { Clip, Frame, GridSize } from '../core/types';
import { getPresetEntry, isPresetReady, loadPreset } from '../presets/store';
import type { PresetEntry } from '../presets/manifest';
import type { PropMap } from './props';
import { isRecord, readJson, readNumber, readText } from './props';

export const DEFAULT_SET_ID = 'pulse';

const DEFAULT_SIDE = 7;
const FRAMES_LABEL = 'dots';

export interface Placeholder {
  readonly clip: Clip;
  readonly state: string | null;
  readonly label: string;
}

function readSetInput(props: PropMap): unknown {
  const value = props.set.value;
  if (value === null || value === '') return null;
  try {
    return readJson('set', value);
  } catch {
    return undefined;
  }
}

function readPresetId(props: PropMap): string | null {
  const input = readSetInput(props);
  if (typeof input === 'string') return input.trim();
  if (input === null && readText(props.recipe.value) === null) return DEFAULT_SET_ID;
  return null;
}

function recipeIdsOf(input: unknown): string[] {
  if (!isRecord(input) || !isRecord(input.states)) return [];
  return Object.values(input.states).flatMap((def) =>
    isRecord(def) && def.kind === 'recipe' && typeof def.recipe === 'string' ? [def.recipe] : [],
  );
}

function hasFrames(props: PropMap): boolean {
  return props.frames.value !== null && props.frames.value !== '';
}

export function findPendingLoad(props: PropMap): Promise<void> | null {
  if (hasFrames(props)) return null;
  const loads: Promise<void>[] = [];
  const presetId = readPresetId(props);
  if (presetId !== null && getPresetEntry(presetId) !== undefined && !isPresetReady(presetId)) {
    loads.push(loadPreset(presetId));
  }
  const recipe = readText(props.recipe.value);
  const setRecipes = recipeIdsOf(readSetInput(props));
  const recipes = recipe === null ? setRecipes : [...setRecipes, recipe];
  if (missingRecipes(recipes).length > 0) loads.push(loadRecipes(recipes));
  return loads.length === 0 ? null : Promise.all(loads).then(() => undefined);
}

export function loadDefaultPreset(): Promise<void> | null {
  return isPresetReady(DEFAULT_SET_ID) ? null : loadPreset(DEFAULT_SET_ID);
}

function toSide(value: unknown): number | null {
  const side = readNumber(value);
  return side !== null && Number.isInteger(side) && side >= GRID_MIN && side <= GRID_MAX ? side : null;
}

function posterFrame(entry: PresetEntry): Frame {
  return entry.poster.flatMap((mask) =>
    Array.from({ length: entry.cols }, (_, x) => ((mask >> (entry.cols - 1 - x)) & 1) as 0 | 1),
  );
}

function blankFrame({ cols, rows }: GridSize): Frame {
  return Array.from({ length: cols * rows }, () => 0 as const);
}

function readGrid(props: PropMap, fallback: GridSize): GridSize {
  return {
    cols: toSide(props.cols.value) ?? fallback.cols,
    rows: toSide(props.rows.value) ?? fallback.rows,
  };
}

function setGrid(input: unknown): GridSize {
  if (!isRecord(input)) return { cols: DEFAULT_SIDE, rows: DEFAULT_SIDE };
  const grid = Array.isArray(input.grid) ? { cols: input.grid[0], rows: input.grid[1] } : input;
  return { cols: toSide(grid.cols) ?? DEFAULT_SIDE, rows: toSide(grid.rows) ?? DEFAULT_SIDE };
}

function toClip(grid: GridSize, frame: Frame): Clip {
  return { cols: grid.cols, rows: grid.rows, frames: [frame], durations: [DEFAULT_FRAME_MS] };
}

export function readPlaceholder(props: PropMap, presetId: string | null = readPresetId(props)): Placeholder {
  const state = readText(props.state.value);
  const entry = presetId === null ? undefined : getPresetEntry(presetId);
  if (entry !== undefined) {
    const grid = readGrid(props, entry);
    const isPoster =
      (state === null || state === entry.state) && grid.cols === entry.cols && grid.rows === entry.rows;
    return {
      clip: toClip(grid, isPoster ? posterFrame(entry) : blankFrame(grid)),
      state: state ?? entry.state,
      label: state ?? entry.state,
    };
  }
  const grid = readGrid(props, setGrid(readSetInput(props)));
  return {
    clip: toClip(grid, blankFrame(grid)),
    state,
    label: state ?? readText(props.recipe.value) ?? FRAMES_LABEL,
  };
}
