import type { BuildFn } from './builder';
import { foldLoopSeam } from './compact';
import { DEFAULT_FRAME_MS, GRID_MAX, GRID_MIN } from './constants';
import { isFrameDuration, isGridSide } from './frame';
import { isOneShotState } from './one-shot';
import type { FramesStateDef, GridSize, IndicatorSet, ResolvedState, StateDef, StateName } from './types';

const ERROR_PREFIX = 'flickering-dots resolve:';
const FALLBACK_STATE = 'thinking';

function hasState(set: IndicatorSet, name: StateName | undefined): name is StateName {
  return name !== undefined && Object.hasOwn(set.states, name);
}

function pickState(set: IndicatorSet, state: StateName | undefined): StateName {
  if (hasState(set, state)) return state;
  if (hasState(set, FALLBACK_STATE)) return FALLBACK_STATE;
  const [first] = Object.keys(set.states);
  if (first === undefined) throw new Error(`${ERROR_PREFIX} set "${set.id}" has no states`);
  return first;
}

function assertGridOverride(grid: GridSize): void {
  (['cols', 'rows'] as const).forEach((side) => {
    if (isGridSide(grid[side])) return;
    throw new Error(
      `${ERROR_PREFIX} grid.${side} must be a whole number from ${GRID_MIN} to ${GRID_MAX}, got ${String(grid[side])}`,
    );
  });
}

function toDurations(def: FramesStateDef): number[] {
  return def.frames.map((_, index) => {
    const duration = def.durations[index];
    return isFrameDuration(duration) ? duration : DEFAULT_FRAME_MS;
  });
}

function withColour(def: StateDef): { on?: string } {
  return def.on === undefined ? {} : { on: def.on };
}

export type ResolveFn = (set: IndicatorSet, state?: StateName, grid?: GridSize) => ResolvedState;

export function createResolve(build: BuildFn): ResolveFn {
  return (set, state, grid) => {
    const name = pickState(set, state);
    const def = set.states[name];
    if (def.kind === 'frames') {
      return {
        state: name,
        cols: set.cols,
        rows: set.rows,
        frames: def.frames,
        durations: toDurations(def),
        ...withColour(def),
      };
    }
    if (grid !== undefined) assertGridOverride(grid);
    const built = build(def.recipe, grid ?? { cols: set.cols, rows: set.rows }, def.params ?? {});
    const clip = isOneShotState(name) ? built : foldLoopSeam(built);
    return { ...clip, state: name, ...withColour(def) };
  };
}
