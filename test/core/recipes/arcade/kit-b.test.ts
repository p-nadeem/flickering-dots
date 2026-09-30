import { describe, expect, it } from 'vitest';

import { limitCellFlashes } from '../../../../src/core/recipes/arcade/cell-flashes-b';
import {
  blinkSteps,
  clamp,
  defineVariantB,
  framePoints,
  holdLast,
  iterateUntil,
  stepsOutput,
} from '../../../../src/core/recipes/arcade/kit-b';
import type { RecipeOutput } from '../../../../src/core/recipes/helpers';
import type { Frame } from '../../../../src/core/types';

import { countPeakFlashesPerSecond } from '../../../presets/flashes';

const ON: Frame = [1];
const OFF: Frame = [0];

function blink(onMs: number, offMs: number): RecipeOutput {
  return { frames: [ON, OFF], durations: [onMs, offMs] };
}

describe('arcade kit b', () => {
  it('clamps a value into a range', () => {
    expect([clamp(-2, 0, 5), clamp(3, 0, 5), clamp(9, 0, 5)]).toEqual([0, 3, 5]);
  });

  it('alternates off and on steps, ending on', () => {
    expect(blinkSteps([[1, 1]], [], 250, 2)).toEqual([
      { points: [], ms: 250 },
      { points: [[1, 1]], ms: 250 },
      { points: [], ms: 250 },
      { points: [[1, 1]], ms: 250 },
    ]);
  });

  it('sets the hold on the last step only, without touching the input', () => {
    const steps = [
      { points: [], ms: 80 },
      { points: [], ms: 80 },
    ];
    expect(holdLast(steps, 1500).map((step) => step.ms)).toEqual([80, 1500]);
    expect(steps.map((step) => step.ms)).toEqual([80, 80]);
  });

  it('reads the lit cells of a frame back as points', () => {
    expect(framePoints([0, 1, 1, 0], 2)).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it('iterates until done or until the limit', () => {
    expect(
      iterateUntil(
        1,
        (n) => n * 2,
        (n) => n >= 8,
        10,
      ),
    ).toEqual([1, 2, 4, 8]);
    expect(
      iterateUntil(
        1,
        (n) => n + 1,
        () => false,
        3,
      ),
    ).toEqual([1, 2, 3]);
  });

  it('draws steps as frames with their durations', () => {
    expect(stepsOutput({ cols: 2, rows: 1 }, [{ points: [[1, 0]], ms: 40 }])).toEqual({
      frames: [[0, 1]],
      durations: [40],
    });
  });
});

describe('limitCellFlashes', () => {
  it('leaves a blink that already stays at 3 flashes a second unchanged', () => {
    expect(limitCellFlashes(blink(200, 200))).toEqual(blink(200, 200));
  });

  it('slows a fast blink until no cell flashes more than 3 times a second', () => {
    const paced = limitCellFlashes(blink(50, 50));
    expect(countPeakFlashesPerSecond({ cols: 1, rows: 1, ...paced })).toBeLessThanOrEqual(3);
    expect(paced.durations.every((ms, index) => ms >= blink(50, 50).durations[index])).toBe(true);
  });
});

describe('defineVariantB', () => {
  const drawing = {
    min: { cols: 2, rows: 1 },
    draw: (): RecipeOutput => ({
      frames: [
        [1, 0],
        [1, 0],
        [0, 1],
      ],
      durations: [50, 50, 50],
    }),
    isLoop: () => true,
  };

  it('throws a readable error below the smallest grid', () => {
    expect(() => defineVariantB('demo', drawing)({ cols: 1, rows: 1 }, {})).toThrow(
      'flickering-dots build: arcade variant "demo" needs a grid of at least 2×1, got 1×1',
    );
  });

  it('merges repeated frames and paces the result', () => {
    const output = defineVariantB('demo', drawing)({ cols: 2, rows: 1 }, {});
    expect(output.frames).toEqual([
      [1, 0],
      [0, 1],
    ]);
    expect(countPeakFlashesPerSecond({ cols: 2, rows: 1, ...output })).toBeLessThanOrEqual(3);
  });
});
