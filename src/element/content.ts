import { applyDirection } from '../core/apply-direction';
import { build } from '../core/build';
import { directedFinalMarkFrame } from '../core/one-shot';
import { resolve } from '../core/resolve';
import { stateNames } from '../core/state-names';
import type { Clip, GridSize, IndicatorSet, PlayDirection, StateName, Transition } from '../core/types';
import { getPreset } from '../presets';
import type { PropMap } from './props';
import { createElementError, getErrorMessage, isRecord, readJson, readNumber, readText } from './props';
import { toClip, toIndicatorSet } from './set-input';

export interface DotsContent {
  readonly clip: Clip;
  readonly state: StateName | null;
  readonly on: string | null;
  readonly set: IndicatorSet | null;
  readonly label: string;
  readonly mark: number;
}

type RawContent = Omit<DotsContent, 'mark'>;

export interface ContentResult {
  readonly content: DotsContent;
  readonly error: string | null;
}

const DEFAULT_SET_ID = 'pulse';
const DEFAULT_RECIPE_SIDE = 7;
const FRAMES_LABEL = 'dots';
const TRANSITIONS: readonly Transition[] = ['cut', 'flip', 'crossfade'];

interface GridOverride {
  readonly cols: number | null;
  readonly rows: number | null;
}

function getDefaultSet(): IndicatorSet {
  const preset = getPreset(DEFAULT_SET_ID);
  if (preset === undefined) throw createElementError(`the default preset "${DEFAULT_SET_ID}" is missing`);
  return preset;
}

function readGridOverride(props: PropMap): GridOverride {
  return { cols: readNumber(props.cols.value), rows: readNumber(props.rows.value) };
}

function hasOverride(grid: GridOverride): boolean {
  return grid.cols !== null || grid.rows !== null;
}

function fillGrid(grid: GridOverride, fallback: GridSize): GridSize {
  return { cols: grid.cols ?? fallback.cols, rows: grid.rows ?? fallback.rows };
}

function readSet(props: PropMap): IndicatorSet | null {
  const value = props.set.value;
  return value === null || value === '' ? null : toIndicatorSet(value);
}

function fromSet(set: IndicatorSet, props: PropMap): RawContent {
  const grid = readGridOverride(props);
  const requested = readText(props.state.value) ?? undefined;
  const resolved = resolve(set, requested, hasOverride(grid) ? fillGrid(grid, set) : undefined);
  const { state, on, ...clip } = resolved;
  return { clip, state, on: on ?? null, set, label: state };
}

function readParams(props: PropMap): unknown {
  const params = readJson('params', props.params.value);
  return params === null || params === '' ? {} : params;
}

function toParams(value: unknown): Readonly<Record<string, unknown>> {
  if (isRecord(value)) return value;
  throw createElementError('params must be an object of recipe settings');
}

function fromRecipe(recipe: string, props: PropMap): RawContent {
  const set = readSet(props);
  const fallback = set ?? { cols: DEFAULT_RECIPE_SIDE, rows: DEFAULT_RECIPE_SIDE };
  const clip = build(recipe, fillGrid(readGridOverride(props), fallback), toParams(readParams(props)));
  const state = readText(props.state.value);
  return { clip, state, on: null, set, label: state ?? recipe };
}

function fromFrames(props: PropMap): RawContent {
  const state = readText(props.state.value);
  return { clip: toClip(props.frames.value), state, on: null, set: null, label: state ?? FRAMES_LABEL };
}

function readContent(props: PropMap): RawContent {
  if (props.frames.value !== null && props.frames.value !== '') return fromFrames(props);
  const recipe = readText(props.recipe.value);
  if (recipe !== null) return fromRecipe(recipe, props);
  return fromSet(readSet(props) ?? getDefaultSet(), props);
}

function withDirection(content: RawContent, direction: PlayDirection): DotsContent {
  const mark = directedFinalMarkFrame(content.clip, direction);
  return { ...content, clip: applyDirection(content.clip, direction), mark };
}

function readFallback(props: PropMap): RawContent {
  const state = readText(props.state.value) ?? undefined;
  const { state: resolvedState, on, ...clip } = resolve(getDefaultSet(), state);
  return { clip, state: resolvedState, on: on ?? null, set: getDefaultSet(), label: resolvedState };
}

export function loadContent(props: PropMap, direction: PlayDirection): ContentResult {
  try {
    return { content: withDirection(readContent(props), direction), error: null };
  } catch (error) {
    return { content: withDirection(readFallback(props), direction), error: getErrorMessage(error) };
  }
}

function isTransition(value: unknown): value is Transition {
  return TRANSITIONS.some((transition) => transition === value);
}

export function getTransitionKind(override: unknown, content: DotsContent): Transition {
  if (isTransition(override)) return override;
  const { set, state } = content;
  if (set === null) return 'cut';
  const perState = state !== null && set.transitions ? set.transitions[state] : undefined;
  return perState ?? set.transition;
}

export function getNextState(content: DotsContent): StateName | null {
  if (content.set === null) return null;
  const names = stateNames(content.set);
  if (names.length < 2) return null;
  const current = content.state === null ? -1 : names.indexOf(content.state);
  return names[(current + 1) % names.length];
}
