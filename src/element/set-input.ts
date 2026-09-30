import { decodeSet } from '../core/codec';
import { DEFAULT_FRAME_MS, GRID_MAX, GRID_MIN } from '../core/constants';
import { isFrameDuration, isGridSide } from '../core/frame';
import { isRecipeId } from '../core/recipes';
import { assertRecipeParams } from '../core/recipes/validate';
import type { Bit, Clip, Frame, GridSize, IndicatorSet, RecipeId, StateDef, Transition } from '../core/types';
import { getPreset } from '../presets';
import { createElementError, getErrorMessage, isRecord, readJson } from './props';

type Fields = Readonly<Record<string, unknown>>;

const CUSTOM_SET_ID = 'custom';
const TRANSITIONS: readonly Transition[] = ['cut', 'flip', 'crossfade'];
const SET_DATA_KEYS: readonly string[] = ['version', 'encoding', 'grid'];

function isKnownRecipe(value: unknown): value is RecipeId {
  return typeof value === 'string' && isRecipeId(value);
}

function isBit(value: unknown): value is Bit {
  return value === 0 || value === 1;
}

function isTransition(value: unknown): value is Transition {
  return TRANSITIONS.some((transition) => transition === value);
}

function toGridSide(value: unknown, side: keyof GridSize, owner: string): number {
  if (isGridSide(value)) return value;
  throw createElementError(
    `${owner} ${side} must be a whole number from ${GRID_MIN} to ${GRID_MAX}, got ${String(value)}`,
  );
}

function toGrid(fields: Fields, owner: string): GridSize {
  return { cols: toGridSide(fields.cols, 'cols', owner), rows: toGridSide(fields.rows, 'rows', owner) };
}

function toFrame(value: unknown, size: number, where: string): Frame {
  if (Array.isArray(value) && value.length === size && value.every(isBit)) return [...value];
  throw createElementError(`${where} must be ${size} dots, each 0 or 1`);
}

function toFrames(value: unknown, grid: GridSize, owner: string): readonly Frame[] {
  if (!Array.isArray(value) || value.length === 0)
    throw createElementError(`${owner} needs at least one frame`);
  const size = grid.cols * grid.rows;
  return value.map((frame, index) => toFrame(frame, size, `${owner}, frame ${index + 1}`));
}

function toDurations(value: unknown, count: number): readonly number[] {
  const durations: readonly unknown[] = Array.isArray(value) ? value : [];
  return Array.from({ length: count }, (_, index) => {
    const duration = durations[index];
    return isFrameDuration(duration) ? duration : DEFAULT_FRAME_MS;
  });
}

function toStateColour(def: Fields, owner: string): { on?: string } {
  if (def.on === undefined) return {};
  if (typeof def.on === 'string') return { on: def.on };
  throw createElementError(`${owner} colour must be text`);
}

function toRecipeState(def: Fields, owner: string): StateDef {
  if (!isKnownRecipe(def.recipe))
    throw createElementError(`${owner} uses the unknown recipe "${String(def.recipe)}"`);
  const params = def.params;
  if (params === undefined) return { kind: 'recipe', recipe: def.recipe, ...toStateColour(def, owner) };
  assertRecipeParams(params);
  return { kind: 'recipe', recipe: def.recipe, params, ...toStateColour(def, owner) };
}

function toFramesState(def: Fields, grid: GridSize, owner: string): StateDef {
  const frames = toFrames(def.frames, grid, owner);
  return {
    kind: 'frames',
    frames,
    durations: toDurations(def.durations, frames.length),
    ...toStateColour(def, owner),
  };
}

function toStateDef(name: string, def: unknown, grid: GridSize): StateDef {
  const owner = `state "${name}"`;
  if (isRecord(def) && def.kind === 'recipe') return toRecipeState(def, owner);
  if (isRecord(def) && def.kind === 'frames') return toFramesState(def, grid, owner);
  throw createElementError(`${owner} must have kind "recipe" or "frames"`);
}

function toStates(value: unknown, grid: GridSize): Readonly<Record<string, StateDef>> {
  if (!isRecord(value)) throw createElementError('set states must be an object of named states');
  const entries = Object.entries(value);
  if (entries.length === 0) throw createElementError('set has no states');
  return Object.fromEntries(entries.map(([name, def]) => [name, toStateDef(name, def, grid)]));
}

function toTransition(value: unknown): Transition {
  if (value === undefined) return 'cut';
  if (isTransition(value)) return value;
  throw createElementError(`set transition must be cut, flip or crossfade, got ${JSON.stringify(value)}`);
}

function toStateTransitions(value: unknown): { transitions?: Readonly<Record<string, Transition>> } {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).filter((entry): entry is [string, Transition] =>
    isTransition(entry[1]),
  );
  return { transitions: Object.fromEntries(entries) };
}

function readTextField(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function toTags(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [];
}

function toSetObject(fields: Fields): IndicatorSet {
  const grid = toGrid(fields, 'set');
  const id = readTextField(fields.id, CUSTOM_SET_ID);
  return {
    id,
    name: readTextField(fields.name, id),
    cols: grid.cols,
    rows: grid.rows,
    states: toStates(fields.states, grid),
    transition: toTransition(fields.transition),
    ...toStateTransitions(fields.transitions),
    tags: toTags(fields.tags),
    author: readTextField(fields.author, ''),
    source: fields.source === 'builtin' ? 'builtin' : 'mine',
  };
}

function isSetData(fields: Fields): boolean {
  return SET_DATA_KEYS.some((key) => Object.hasOwn(fields, key));
}

function decodeSetData(fields: Fields): IndicatorSet {
  try {
    return decodeSet(fields);
  } catch (error) {
    throw createElementError(getErrorMessage(error));
  }
}

function findPreset(id: string): IndicatorSet {
  const preset = getPreset(id.trim());
  if (preset === undefined) throw createElementError(`there is no preset called "${id}"`);
  return preset;
}

export function toIndicatorSet(value: unknown): IndicatorSet {
  const input = readJson('set', value);
  if (typeof input === 'string') return findPreset(input);
  if (!isRecord(input)) throw createElementError('set must be a preset id, a set object or set JSON');
  return isSetData(input) ? decodeSetData(input) : toSetObject(input);
}

export function toClip(value: unknown): Clip {
  const input = readJson('frames', value);
  if (!isRecord(input) || !Object.hasOwn(input, 'frames')) {
    throw createElementError('frames must be an object with frames, cols and rows');
  }
  const grid = toGrid(input, 'frames');
  const frames = toFrames(input.frames, grid, 'frames');
  return { ...grid, frames, durations: toDurations(input.durations, frames.length) };
}
