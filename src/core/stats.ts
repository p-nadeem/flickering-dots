export { busiestFrame, stillFrame } from './frame-stats';
import { resolve } from './resolve';
import type { IndicatorSet, SetStats } from './types';

const CYCLE_STATE = 'thinking';

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Totals for a set: frames across all states, the thinking (or first) state's cycle in ms, and the state count. */
export function stats(set: IndicatorSet): SetStats {
  const names = Object.keys(set.states);
  if (names.length === 0) return { frames: 0, cycleMs: 0, states: 0 };
  const clips = names.map((name) => resolve(set, name));
  const cycle = clips[Math.max(0, names.indexOf(CYCLE_STATE))];
  return {
    frames: sum(clips.map((clip) => clip.frames.length)),
    cycleMs: sum(cycle.durations),
    states: names.length,
  };
}
