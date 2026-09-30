import { describe, expect, it } from 'vitest';

import { isOneShotState } from '../../src/core/one-shot';
import { resolve } from '../../src/core/resolve';
import { stateNames } from '../../src/core/state-names';
import type { Frame } from '../../src/core/types';
import { getPreset, PRESETS } from '../../src/presets';

import { countPeakBigChanges } from './wow/emergence-flashes';

const MAX_BIG_CHANGES_PER_SECOND = 6;
const BIG_CHANGE_SHARE = 0.2;
const MOTION_ONLY_STATES: readonly (readonly [string, string])[] = [
  ['braille', 'thinking'],
  ['scanner', 'thinking'],
  ['pendulum-wave', 'thinking'],
  ['helix', 'thinking'],
  ['helix', 'indexing'],
];

const isMotionOnly = (id: string, state: string): boolean =>
  MOTION_ONLY_STATES.some(([motionId, motionState]) => motionId === id && motionState === state);

const STATE_CASES = PRESETS.flatMap((set) =>
  stateNames(set)
    .filter((state) => !isMotionOnly(set.id, state))
    .map((state) => [`${set.id} ${state}`, set, state] as const),
);

function countLit(frame: Frame): number {
  return frame.reduce<number>((sum, cell) => sum + cell, 0);
}

describe('the flash rule for every built-in set', () => {
  it.each(STATE_CASES)(
    'changes 20 percent of the grid at most 6 times in any second in %s',
    (_label, set, state) => {
      const clip = resolve(set, state);

      expect(countPeakBigChanges(clip, !isOneShotState(state))).toBeLessThanOrEqual(
        MAX_BIG_CHANGES_PER_SECOND,
      );
    },
  );

  it.each(MOTION_ONLY_STATES)(
    'moves the dots of %s %s without its lit count ever swinging by 20 percent of the grid',
    (id, state) => {
      const set = getPreset(id);
      if (set === undefined) throw new Error(`No preset with id ${id}`);
      const clip = resolve(set, state);
      const counts = clip.frames.map(countLit);

      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThan(BIG_CHANGE_SHARE * set.cols * set.rows);
    },
  );
});
