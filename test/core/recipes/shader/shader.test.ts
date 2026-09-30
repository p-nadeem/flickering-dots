import { describe, expect, it } from 'vitest';

import { generateShader, SHADER_DEFAULTS, SHADER_VARIANTS } from '../../../../src/core/recipes/shader';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import {
  countIsolated,
  gridName,
  largestStep,
  MAX_CELL_FLASHES_PER_WINDOW,
  MAX_STEPS_PER_WINDOW,
  peakCellFlashesPerWindow,
  peakStepsPerWindow,
  seamChange,
  squareGrids,
} from './checks';

interface StateCase {
  name: string;
  params: RecipeParams;
  smallest: number;
  isLoop: boolean;
  isClean: boolean;
  extra: readonly GridSize[];
}

const LAVA: readonly GridSize[] = [{ cols: 12, rows: 8 }];
const RECTANGLES: readonly GridSize[] = [
  { cols: 12, rows: 8 },
  { cols: 16, rows: 9 },
  { cols: 10, rows: 7 },
];
const LARGEST = 16;
const SEAM_TOLERANCE = 1.5;
const METABALL_MIN = 7;
const CORRIDOR_MIN = 5;
const SPIRAL_MIN = 9;

const STATES: readonly StateCase[] = [
  {
    name: 'lava idle',
    params: { variant: 'metaball', length: 1 },
    smallest: METABALL_MIN,
    isLoop: true,
    isClean: true,
    extra: LAVA,
  },
  {
    name: 'lava thinking',
    params: { variant: 'metaball', length: 3 },
    smallest: METABALL_MIN,
    isLoop: true,
    isClean: true,
    extra: RECTANGLES,
  },
  {
    name: 'lava listening',
    params: { variant: 'metaball', length: 1, seed: 5 },
    smallest: METABALL_MIN,
    isLoop: true,
    isClean: true,
    extra: LAVA,
  },
  {
    name: 'lava success',
    params: { variant: 'metaball-merge' },
    smallest: METABALL_MIN,
    isLoop: false,
    isClean: true,
    extra: RECTANGLES,
  },
  {
    name: 'lava error',
    params: { variant: 'metaball-drip' },
    smallest: METABALL_MIN,
    isLoop: false,
    isClean: false,
    extra: RECTANGLES,
  },
  {
    name: 'corridor idle',
    params: { variant: 'corridor-hover' },
    smallest: CORRIDOR_MIN,
    isLoop: true,
    isClean: false,
    extra: RECTANGLES,
  },
  {
    name: 'corridor thinking',
    params: { variant: 'corridor' },
    smallest: CORRIDOR_MIN,
    isLoop: true,
    isClean: false,
    extra: RECTANGLES,
  },
  {
    name: 'corridor connecting',
    params: { variant: 'corridor-rush' },
    smallest: CORRIDOR_MIN,
    isLoop: true,
    isClean: false,
    extra: RECTANGLES,
  },
  {
    name: 'corridor success',
    params: { variant: 'corridor-land' },
    smallest: CORRIDOR_MIN,
    isLoop: false,
    isClean: false,
    extra: RECTANGLES,
  },
  {
    name: 'corridor error',
    params: { variant: 'corridor-reverse' },
    smallest: CORRIDOR_MIN,
    isLoop: false,
    isClean: false,
    extra: RECTANGLES,
  },
  {
    name: 'spiral idle',
    params: { variant: 'spiral', density: 0.2, frames: 1 },
    smallest: SPIRAL_MIN,
    isLoop: true,
    isClean: true,
    extra: [],
  },
  {
    name: 'spiral thinking',
    params: { variant: 'spiral', length: 1, density: 0.3 },
    smallest: SPIRAL_MIN,
    isLoop: true,
    isClean: true,
    extra: [],
  },
  {
    name: 'spiral deep thinking',
    params: { variant: 'spiral', length: 2, density: 0.3, frames: 8 },
    smallest: SPIRAL_MIN,
    isLoop: true,
    isClean: true,
    extra: [],
  },
  {
    name: 'spiral success',
    params: { variant: 'spiral-unwind' },
    smallest: SPIRAL_MIN,
    isLoop: false,
    isClean: false,
    extra: [],
  },
];

const CASES = STATES.flatMap((state) =>
  [...squareGrids(state.smallest, LARGEST), ...state.extra].map(
    (grid) => [`${state.name} on ${gridName(grid)}`, state, grid] as const,
  ),
);

describe('generateShader', () => {
  it('lists every variant the lava lamp, corridor and spiral wave sets use', () => {
    expect(SHADER_VARIANTS).toEqual([
      'metaball',
      'metaball-merge',
      'metaball-drip',
      'corridor',
      'corridor-hover',
      'corridor-rush',
      'corridor-land',
      'corridor-reverse',
      'spiral',
      'spiral-unwind',
    ]);
  });

  it('draws the metaball variant by default', () => {
    const grid = { cols: 12, rows: 8 };

    expect(SHADER_DEFAULTS).toEqual({ variant: 'metaball' });
    expect(generateShader(grid, {})).toEqual(generateShader(grid, { variant: 'metaball' }));
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateShader({ cols: 9, rows: 9 }, { variant: 'plasma' })).toThrow(
      'flickering-dots shader: unknown variant "plasma"; use one of metaball, metaball-merge',
    );
  });

  it('draws every variant on every grid from 3x3 to 16x16', () => {
    const grids = squareGrids(3, LARGEST).flatMap(({ cols }) =>
      squareGrids(3, LARGEST).map(({ rows }) => ({ cols, rows })),
    );

    grids.forEach((grid) =>
      SHADER_VARIANTS.forEach((variant) => {
        const output = generateShader(grid, { variant });
        expect(output.frames.length).toBeGreaterThan(0);
        output.frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
      }),
    );
  });

  it.each(CASES)('%s has one full frame per duration', (_, state, grid) => {
    const output = generateShader(grid, state.params);

    expect(output.frames.length).toBeGreaterThan(0);
    expect(output.durations).toHaveLength(output.frames.length);
    output.frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
    output.durations.forEach((ms) => expect(Number.isInteger(ms) && ms > 0).toBe(true));
  });

  it.each(CASES)('%s is the same on every call', (_, state, grid) => {
    expect(generateShader(grid, state.params)).toEqual(generateShader(grid, state.params));
  });

  it.each(CASES)('%s keeps at most six big lit-count steps in any second', (_, state, grid) => {
    const output = generateShader(grid, state.params);

    expect(peakStepsPerWindow(output, state.isLoop)).toBeLessThanOrEqual(MAX_STEPS_PER_WINDOW);
  });

  it.each(CASES)('%s turns no dot on more than three times in any second', (_, state, grid) => {
    const output = generateShader(grid, state.params);

    expect(peakCellFlashesPerWindow(output)).toBeLessThanOrEqual(MAX_CELL_FLASHES_PER_WINDOW);
  });

  it.each(CASES.filter(([, state]) => state.isLoop))(
    '%s loops without a jump at the seam',
    (_, state, grid) => {
      const output = generateShader(grid, state.params);

      expect(seamChange(output)).toBeLessThanOrEqual(SEAM_TOLERANCE * largestStep(output));
    },
  );

  it.each(CASES.filter(([, state]) => state.isClean))('%s leaves no stray dots', (_, state, grid) => {
    const output = generateShader(grid, state.params);

    output.frames.forEach((frame) => expect(countIsolated(frame, grid)).toBe(0));
  });

  it.each(CASES.filter(([, state]) => !state.isLoop))('%s ends on a frame it holds', (_, state, grid) => {
    const { durations } = generateShader(grid, state.params);

    expect(durations[durations.length - 1]).toBeGreaterThanOrEqual(Math.max(...durations.slice(0, -1)));
  });
});
