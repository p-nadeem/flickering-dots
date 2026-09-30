import { describe, expect, it } from 'vitest';

import { limitFlashRate } from '../../../../src/core/recipes/shader/flash-safe';
import type { Frame } from '../../../../src/core/types';

import {
  MAX_CELL_FLASHES_PER_WINDOW,
  MAX_STEPS_PER_WINDOW,
  peakCellFlashesPerWindow,
  peakStepsPerWindow,
} from './checks';

const ON: Frame = [1, 1, 1, 1, 1];
const OFF: Frame = [0, 0, 0, 0, 0];
const HALF: Frame = [1, 1, 0, 0, 0];
const ONE_OF_TEN: Frame = [1, 0, 0, 0, 0, ...OFF];
const BLANK_TEN: Frame = [...OFF, ...OFF];
const TEN_CELLS = 10;

function cellsOn(cells: readonly number[]): Frame {
  return Array.from({ length: TEN_CELLS }, (_, index) => (cells.includes(index) ? 1 : 0));
}

describe('limitFlashRate', () => {
  it('leaves a clip alone when its big steps are already slow enough', () => {
    const output = { frames: [ON, OFF], durations: [200, 200] };

    expect(limitFlashRate(output, true)).toEqual(output);
  });

  it('stretches a fast loop until no 1 s window holds more than six big steps', () => {
    const output = { frames: [ON, OFF], durations: [100, 60] };

    const limited = limitFlashRate(output, true);

    expect(peakStepsPerWindow(output, true)).toBeGreaterThan(MAX_STEPS_PER_WINDOW);
    expect(peakStepsPerWindow(limited, true)).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
    expect(limited.durations[0] / limited.durations[1]).toBeCloseTo(100 / 60, 1);
  });

  it('counts the seam of a loop but not of a one-shot clip', () => {
    const frames = [
      cellsOn([0, 1, 8, 9]),
      BLANK_TEN,
      cellsOn([2, 3]),
      BLANK_TEN,
      cellsOn([4, 5]),
      BLANK_TEN,
      cellsOn([6, 7]),
    ];
    const output = { frames, durations: frames.map(() => 100) };

    expect(limitFlashRate(output, false)).toEqual(output);
    expect(peakStepsPerWindow(output, true)).toBeGreaterThan(MAX_STEPS_PER_WINDOW);
    expect(peakStepsPerWindow(limitFlashRate(output, true), true)).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
  });

  it('also stretches a loop that moves a fifth of the grid without changing the lit count', () => {
    const pairs = [0, 2, 4, 6, 8].map((cell) => cellsOn([cell, cell + 1]));
    const output = { frames: pairs, durations: pairs.map(() => 60) };

    const limited = limitFlashRate(output, true);
    const loopMs = limited.durations.reduce((sum, ms) => sum + ms, 0);

    expect(peakStepsPerWindow(output, true)).toBe(0);
    expect(loopMs).toBeGreaterThanOrEqual((pairs.length * 1000) / MAX_STEPS_PER_WINDOW);
  });

  it('ignores steps smaller than a fifth of the grid', () => {
    const output = { frames: [BLANK_TEN, ONE_OF_TEN], durations: [400, 400] };

    expect(limitFlashRate(output, true)).toEqual(output);
  });

  it('keeps the frames and never shortens a duration', () => {
    const output = { frames: [ON, HALF, OFF], durations: [50, 70, 90] };

    const limited = limitFlashRate(output, true);

    expect(limited.frames).toEqual(output.frames);
    limited.durations.forEach((ms, index) => expect(ms).toBeGreaterThanOrEqual(output.durations[index]));
  });

  it('slows a dot that turns on more than three times a second', () => {
    const output = { frames: [BLANK_TEN, ONE_OF_TEN], durations: [100, 100] };

    const limited = limitFlashRate(output, true);

    expect(peakCellFlashesPerWindow(output)).toBeGreaterThan(MAX_CELL_FLASHES_PER_WINDOW);
    expect(peakCellFlashesPerWindow(limited)).toBeLessThanOrEqual(MAX_CELL_FLASHES_PER_WINDOW);
  });

  it('returns a single frame unchanged', () => {
    const output = { frames: [ON], durations: [1000] };

    expect(limitFlashRate(output, true)).toEqual(output);
  });
});
