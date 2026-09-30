import { describe, expect, it } from 'vitest';

import { limitFlashRate } from '../../../../src/core/recipes/particles/flash-limit';
import type { Frame, GridSize } from '../../../../src/core/types';

import { MAX_STEPS_PER_WINDOW, maxFlashStepsPerSecond } from './clip-checks';

const GRID: GridSize = { cols: 3, rows: 3 };
const FULL: Frame = [1, 1, 1, 1, 1, 1, 1, 1, 1];
const BLANK: Frame = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const ONE: Frame = [1, 0, 0, 0, 0, 0, 0, 0, 0];
const FAST_MS = 50;
const STROBE_FRAMES = 20;

describe('limitFlashRate', () => {
  it('keeps a calm clip exactly as it was', () => {
    const calm = { frames: [BLANK, ONE, BLANK, ONE], durations: [FAST_MS, FAST_MS, FAST_MS, FAST_MS] };
    expect(limitFlashRate(GRID, calm)).toEqual(calm);
  });

  it('slows a strobe until it steps at most 6 times a second, looping or not', () => {
    const frames = Array.from({ length: STROBE_FRAMES }, (_, index) => (index % 2 === 0 ? FULL : BLANK));
    const strobe = { frames, durations: frames.map(() => FAST_MS) };
    const limited = limitFlashRate(GRID, strobe);
    expect(limited.frames).toEqual(frames);
    expect(maxFlashStepsPerSecond(limited, GRID, true)).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
    expect(maxFlashStepsPerSecond(limited, GRID, false)).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
  });

  it('only lengthens frames', () => {
    const frames = [FULL, BLANK, FULL, BLANK, FULL, BLANK, FULL, BLANK];
    const durations = frames.map(() => FAST_MS);
    const limited = limitFlashRate(GRID, { frames, durations });
    expect(limited.durations.every((ms, index) => ms >= durations[index])).toBe(true);
  });
});
