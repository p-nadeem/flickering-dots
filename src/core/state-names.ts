import { STATE_ORDER } from './constants';
import type { IndicatorSet, StateName } from './types';

/** State names of a set: standard states in STATE_ORDER first, then custom ones in insertion order. */
export function stateNames(set: IndicatorSet): StateName[] {
  const names = Object.keys(set.states);
  const standard: readonly string[] = STATE_ORDER;
  return [
    ...STATE_ORDER.filter((name) => names.includes(name)),
    ...names.filter((name) => !standard.includes(name)),
  ];
}
