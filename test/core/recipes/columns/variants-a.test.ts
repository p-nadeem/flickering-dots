import { describe, expect, it } from 'vitest';

import { VARIANTS_A } from '../../../../src/core/recipes/columns/variants-a';

import {
  EVERY_GRID,
  gridsFrom,
  label,
  MAX_LIT_STEPS_PER_SECOND,
  maxInnerChange,
  maxLitStepsPerSecond,
  runCase,
  seamChange,
} from './support-a';
import type { VariantCase } from './support-a';

const PENDULUM_MIN = { cols: 7, rows: 5 };
const HELIX_MIN = { cols: 10, rows: 7 };
const SLOSH_MIN = { cols: 5, rows: 5 };
const ECG_MIN = { cols: 9, rows: 5 };

const CASES: readonly VariantCase[] = [
  { variant: 'pendulum', params: {}, smallest: PENDULUM_MIN, isLoop: true },
  { variant: 'pendulum', params: { length: 0 }, smallest: PENDULUM_MIN, isLoop: true },
  { variant: 'pendulum', params: { length: 1 }, smallest: PENDULUM_MIN, isLoop: true },
  { variant: 'pendulum-sync', params: {}, smallest: PENDULUM_MIN, isLoop: false },
  { variant: 'pendulum-drop', params: {}, smallest: PENDULUM_MIN, isLoop: false },
  { variant: 'helix', params: {}, smallest: HELIX_MIN, isLoop: true },
  { variant: 'helix-slow', params: {}, smallest: HELIX_MIN, isLoop: true },
  { variant: 'helix-fast', params: {}, smallest: HELIX_MIN, isLoop: true },
  { variant: 'helix-zip', params: {}, smallest: HELIX_MIN, isLoop: false },
  { variant: 'helix-unravel', params: {}, smallest: HELIX_MIN, isLoop: false },
  { variant: 'slosh', params: { density: 0.3 }, smallest: SLOSH_MIN, isLoop: true },
  { variant: 'slosh-cycle', params: {}, smallest: SLOSH_MIN, isLoop: true },
  { variant: 'slosh-progress', params: {}, smallest: SLOSH_MIN, isLoop: true },
  { variant: 'slosh-full', params: {}, smallest: SLOSH_MIN, isLoop: false },
  { variant: 'slosh-drain', params: {}, smallest: SLOSH_MIN, isLoop: false },
  { variant: 'ecg', params: {}, smallest: ECG_MIN, isLoop: true },
  { variant: 'ecg-slow', params: {}, smallest: ECG_MIN, isLoop: true },
  { variant: 'ecg-skip', params: {}, smallest: ECG_MIN, isLoop: true },
  { variant: 'ecg-irregular', params: { seed: 5 }, smallest: ECG_MIN, isLoop: true },
  { variant: 'ecg-rise', params: {}, smallest: ECG_MIN, isLoop: false },
  { variant: 'ecg-flat', params: {}, smallest: ECG_MIN, isLoop: false },
];

function caseName({ variant, params }: VariantCase): string {
  return `${variant} ${JSON.stringify(params)}`;
}

describe('VARIANTS_A', () => {
  it('lists every variant the pendulum-wave, helix, slosh and ecg-trace sets use', () => {
    const names = [...new Set(CASES.map(({ variant }) => variant))];
    expect(Object.keys(VARIANTS_A).sort()).toEqual(names.sort());
  });

  describe.each(CASES.map((test) => [caseName(test), test] as const))('%s', (_, test) => {
    it('returns whole frames and positive whole durations on every grid from 3x3 to 16x16', () => {
      EVERY_GRID.forEach((grid) => {
        const { frames, durations } = runCase(VARIANTS_A, test, grid);
        expect(frames.length, label(grid)).toBeGreaterThan(0);
        expect(durations).toHaveLength(frames.length);
        expect(frames.every((frame) => frame.length === grid.cols * grid.rows)).toBe(true);
        expect(frames.every((frame) => frame.every((bit) => bit === 0 || bit === 1))).toBe(true);
        expect(durations.every((ms) => Number.isInteger(ms) && ms > 0)).toBe(true);
      });
    });

    it('is deterministic', () => {
      const grid = { cols: 12, rows: 9 };
      expect(runCase(VARIANTS_A, test, grid)).toEqual(runCase(VARIANTS_A, test, grid));
    });

    it('keeps lit-count steps of 20 percent of the grid to at most 6 a second', () => {
      gridsFrom(test.smallest).forEach((grid) => {
        const output = runCase(VARIANTS_A, test, grid);
        expect(maxLitStepsPerSecond(output, test.isLoop), label(grid)).toBeLessThanOrEqual(
          MAX_LIT_STEPS_PER_SECOND,
        );
      });
    });

    it.runIf(test.isLoop)('closes its loop with a step no larger than its other steps', () => {
      gridsFrom(test.smallest).forEach((grid) => {
        const output = runCase(VARIANTS_A, test, grid);
        expect(seamChange(output), label(grid)).toBeLessThanOrEqual(Math.max(1, maxInnerChange(output)));
      });
    });
  });
});
