import { rowsOf, SET_ENCODING, SET_VERSION } from './decode';
import { resolve } from './resolve';
import { stateNames } from './state-names';
import type { IndicatorSet, SetData } from './types';

function encodeState(set: IndicatorSet, name: string): SetData['states'][string] {
  const { frames, durations, cols } = resolve(set, name);
  const encoded = { durations: [...durations], frames: frames.map((frame) => rowsOf(frame, cols)) };
  const on = set.states[name]?.on;
  return on === undefined ? encoded : { ...encoded, on };
}

function encodeTransitions(set: IndicatorSet, names: readonly string[]): Pick<SetData, 'transitions'> {
  const entries = names.flatMap((name) => {
    const transition = set.transitions?.[name];
    return transition === undefined ? [] : [[name, transition] as const];
  });
  return entries.length === 0 ? {} : { transitions: Object.fromEntries(entries) };
}

/** Fully resolves every state to frames and returns the plain JSON form. */
export function encodeSet(set: IndicatorSet): SetData {
  const names = stateNames(set);
  return {
    version: SET_VERSION,
    id: set.id,
    name: set.name,
    grid: [set.cols, set.rows],
    transition: set.transition,
    encoding: SET_ENCODING,
    states: Object.fromEntries(names.map((name) => [name, encodeState(set, name)])),
    ...encodeTransitions(set, names),
    tags: [...set.tags],
    author: set.author,
  };
}
