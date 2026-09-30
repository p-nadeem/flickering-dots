import { describe, expect, it } from 'vitest';

import { PRESETS, framesEqual, resolve, stateNames } from '../../src/index';
import type { Frame } from '../../src/index';

const ONE_SHOT_STATES = ['success', 'error'];

const CASES = PRESETS.flatMap((set) =>
  stateNames(set).map((name) => [`${set.id} ${name}`, resolve(set, name).frames, name] as const),
);

function repeatedNeighbours(frames: readonly Frame[], isLooping: boolean): number[] {
  const repeats = frames
    .slice(1)
    .flatMap((frame, index) => (framesEqual(frames[index], frame) ? [index] : []));
  const lastIndex = frames.length - 1;
  const hasSeamRepeat = isLooping && frames.length > 1 && framesEqual(frames[lastIndex], frames[0]);
  return hasSeamRepeat ? [...repeats, lastIndex] : repeats;
}

describe('preset frame sequences', () => {
  it.each(CASES)('never shows the same frame twice in a row in %s', (_, frames, name) => {
    expect(repeatedNeighbours(frames, !ONE_SHOT_STATES.includes(name))).toEqual([]);
  });
});
