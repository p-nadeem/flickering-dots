import { describe, expect, it } from 'vitest';

import { generateAutomaton } from '../../../../src/core/recipes/automaton';

import { ANT_REWIND_PINS } from './ant-rewind-pins';
import { CAMPFIRE_PINS } from './campfire-pins';
import { digestFrames, toTexts } from './clip-metrics';
import type { VariantPin } from './pin-types';
import { RULE_STREAM_PINS } from './rule-stream-pins';
import { TURING_SPOTS_PINS } from './turing-spots-pins';

const SETS: readonly (readonly [string, readonly VariantPin[]])[] = [
  ['campfire', CAMPFIRE_PINS],
  ['rule-stream', RULE_STREAM_PINS],
  ['ant-rewind', ANT_REWIND_PINS],
  ['turing-spots', TURING_SPOTS_PINS],
];

const CASES = SETS.flatMap(([set, pins]) => pins.map((pin) => [`${set}: ${pin.name}`, pin] as const));

function middleOf<T>(items: readonly T[]): T {
  return items[Math.floor(items.length / 2)];
}

describe('automaton frames at each set grid', () => {
  it.each(CASES)('%s keeps its pinned frames', (_label, pin) => {
    const output = generateAutomaton(pin.grid, pin.params);
    const texts = toTexts(output.frames, pin.grid.cols);
    expect(output.frames).toHaveLength(pin.count);
    expect(output.still).toBe(pin.still);
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(pin.totalMs);
    expect(digestFrames(output.frames, pin.grid.cols)).toBe(pin.digest);
    if (pin.frames !== undefined)
      expect({ frames: texts, durations: output.durations }).toEqual({
        frames: pin.frames,
        durations: pin.durations,
      });
    if (pin.samples !== undefined)
      expect([texts[0], middleOf(texts), texts[texts.length - 1]]).toEqual(pin.samples);
  });
});
