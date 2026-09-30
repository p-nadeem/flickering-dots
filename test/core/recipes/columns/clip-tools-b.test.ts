import { describe, expect, it } from 'vitest';

import { fromShots, mergeLoop, mergeOnce, scaleShots } from '../../../../src/core/recipes/columns/clip-merge';
import { governFlashes } from '../../../../src/core/recipes/columns/flash-governor';
import { voiceEnvelope } from '../../../../src/core/recipes/columns/voice-envelope';
import type { Frame } from '../../../../src/core/types';

import { countPeakFlashesPerSecond } from '../../../presets/flashes';
import { maxBigChangesPerSecond } from './support-b';

const ON: Frame = [1];
const OFF: Frame = [0];
const BLINK_MS = 100;
const ENVELOPE_FRAMES = 24;

describe('clip merge', () => {
  it('turns shots into frames and durations', () => {
    expect(fromShots([{ frame: ON, ms: 10 }])).toEqual({ frames: [ON], durations: [10] });
  });

  it('merges repeated neighbours of a one-shot clip', () => {
    const merged = mergeOnce([
      { frame: ON, ms: 10 },
      { frame: ON, ms: 20 },
      { frame: OFF, ms: 30 },
    ]);
    expect(merged).toEqual({ frames: [ON, OFF], durations: [30, 30] });
  });

  it('folds a last frame that repeats the first into the first for a loop', () => {
    const merged = mergeLoop([
      { frame: ON, ms: 10 },
      { frame: OFF, ms: 20 },
      { frame: ON, ms: 30 },
    ]);
    expect(merged).toEqual({ frames: [ON, OFF], durations: [40, 20] });
  });

  it('keeps a single still frame as it is', () => {
    expect(mergeLoop([{ frame: ON, ms: 10 }])).toEqual({ frames: [ON], durations: [10] });
  });

  it('scales durations without touching the input', () => {
    const shots = [{ frame: ON, ms: 10 }];
    expect(scaleShots(shots, 2)).toEqual([{ frame: ON, ms: 20 }]);
    expect(shots).toEqual([{ frame: ON, ms: 10 }]);
  });
});

describe('flash governor', () => {
  const blink = Array.from({ length: 10 }, (_, index) => ({
    frame: index % 2 === 0 ? ON : OFF,
    ms: BLINK_MS,
  }));

  it('stretches a fast one-shot blink to at most 3 flashes a second', () => {
    const governed = fromShots(governFlashes(blink, false));
    const clip = { cols: 1, rows: 1, ...governed };
    expect(
      countPeakFlashesPerSecond({
        ...clip,
        frames: [...clip.frames, OFF],
        durations: [...clip.durations, 5000],
      }),
    ).toBeLessThanOrEqual(3);
    expect(maxBigChangesPerSecond(governed, false)).toBeLessThanOrEqual(6);
  });

  it('stretches a fast looping blink so the loop stays safe across the seam', () => {
    const governed = fromShots(governFlashes(blink, true));
    expect(countPeakFlashesPerSecond({ cols: 1, rows: 1, ...governed })).toBeLessThanOrEqual(3);
    expect(maxBigChangesPerSecond(governed, true)).toBeLessThanOrEqual(6);
  });

  it('leaves a safe clip untouched', () => {
    const slow = [
      { frame: ON, ms: 500 },
      { frame: OFF, ms: 500 },
    ];
    expect(governFlashes(slow, true)).toEqual(slow);
    expect(governFlashes([{ frame: ON, ms: 10 }], true)).toEqual([{ frame: ON, ms: 10 }]);
  });
});

describe('voice envelope', () => {
  it('stays within 0.15 and 1 and repeats for the same seed', () => {
    const envelope = voiceEnvelope(ENVELOPE_FRAMES, 11);
    expect(envelope).toHaveLength(ENVELOPE_FRAMES);
    envelope.forEach((level) => {
      expect(level).toBeGreaterThanOrEqual(0.15);
      expect(level).toBeLessThanOrEqual(1);
    });
    expect(voiceEnvelope(ENVELOPE_FRAMES, 11)).toEqual(envelope);
    expect(voiceEnvelope(ENVELOPE_FRAMES, 12)).not.toEqual(envelope);
  });

  it('loops without a jump: the seam step is no bigger than the largest inner step', () => {
    const envelope = voiceEnvelope(ENVELOPE_FRAMES, 11);
    const steps = envelope.slice(1).map((level, index) => Math.abs(level - envelope[index]));
    expect(Math.abs(envelope[0] - envelope[ENVELOPE_FRAMES - 1])).toBeLessThanOrEqual(Math.max(...steps));
  });
});
