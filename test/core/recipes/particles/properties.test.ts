import { describe, expect, it } from 'vitest';

import { generateParticles } from '../../../../src/core/recipes/particles';

import { VARIANT_CASES } from './cases';
import {
  MAX_STEPS_PER_WINDOW,
  largestStep,
  maxFlashStepsPerSecond,
  sampleGrids,
  seamStep,
} from './clip-checks';

const ANY_GRID_MIN = 3;
const SEAM_SLACK_DOTS = 2;

const ANY_GRID_CASES = VARIANT_CASES.flatMap((variantCase) =>
  sampleGrids(ANY_GRID_MIN).map(
    (grid) => [`${variantCase.label} ${grid.cols}x${grid.rows}`, variantCase, grid] as const,
  ),
);

const GRID_CASES = VARIANT_CASES.flatMap((variantCase) =>
  sampleGrids(variantCase.minSide).map(
    (grid) => [`${variantCase.label} ${grid.cols}x${grid.rows}`, variantCase, grid] as const,
  ),
);

describe('generateParticles on any grid', () => {
  it.each(ANY_GRID_CASES)(
    'gives whole frames and flashes at most 3 times a second for %s',
    (_, { params, isLoop }, grid) => {
      const output = generateParticles(grid, params);
      expect(output.frames.every((frame) => frame.length === grid.cols * grid.rows)).toBe(true);
      expect(output.durations).toHaveLength(output.frames.length);
      expect(maxFlashStepsPerSecond(output, grid, isLoop)).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
    },
  );
});

describe('generateParticles on every grid from the smallest readable one to 16x16', () => {
  it.each(GRID_CASES)('gives whole frames and positive durations for %s', (_, { params }, grid) => {
    const output = generateParticles(grid, params);
    expect(output.frames.length).toBeGreaterThan(1);
    expect(output.durations).toHaveLength(output.frames.length);
    expect(output.frames.every((frame) => frame.length === grid.cols * grid.rows)).toBe(true);
    expect(output.durations.every((ms) => Number.isFinite(ms) && ms > 0)).toBe(true);
    expect(output.frames.some((frame) => frame.includes(1))).toBe(true);
  });

  it.each(GRID_CASES)('returns the same frames on every call for %s', (_, { params }, grid) => {
    expect(generateParticles(grid, params)).toEqual(generateParticles(grid, params));
  });

  it.each(GRID_CASES)('flashes at most 3 times a second for %s', (_, { params, isLoop }, grid) => {
    const output = generateParticles(grid, params);
    expect(maxFlashStepsPerSecond(output, grid, isLoop)).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
  });

  it.each(GRID_CASES.filter(([, { isLoop }]) => isLoop))(
    'closes the loop with a step no larger than any other for %s',
    (_, { params }, grid) => {
      const { frames } = generateParticles(grid, params);
      expect(seamStep(frames)).toBeLessThanOrEqual(largestStep(frames) + SEAM_SLACK_DOTS);
    },
  );
});
