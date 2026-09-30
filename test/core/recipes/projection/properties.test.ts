import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateProjection } from '../../../../src/core/recipes/projection';
import type { RecipeOutput } from '../../../../src/core/recipes';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import { countPeakFlashesPerSecond } from '../../../presets/flashes';
import {
  MAX_STEPS_PER_SECOND,
  largestStep,
  maxBigChangesPerSecond,
  maxStepsPerSecond,
  seamChange,
  squareGrids,
} from './clip-checks';

interface Case {
  params: RecipeParams;
  minSide: number;
  isLoop: boolean;
  endsOn?: 'check' | 'cross';
}

const CASES: readonly Case[] = [
  { params: { variant: 'cube' }, minSide: 11, isLoop: true },
  { params: { variant: 'cube-wait' }, minSide: 11, isLoop: true },
  { params: { variant: 'cube-rest' }, minSide: 11, isLoop: true },
  { params: { variant: 'cube-land' }, minSide: 11, isLoop: false, endsOn: 'check' },
  { params: { variant: 'cube-shake' }, minSide: 11, isLoop: false },
  { params: { variant: 'globe' }, minSide: 9, isLoop: true },
  { params: { variant: 'globe', frames: 1 }, minSide: 9, isLoop: true },
  { params: { variant: 'globe-listen' }, minSide: 9, isLoop: true },
  { params: { variant: 'globe-settle' }, minSide: 9, isLoop: false },
  { params: { variant: 'globe-break' }, minSide: 9, isLoop: false },
  { params: { variant: 'torus' }, minSide: 14, isLoop: true },
  { params: { variant: 'torus-slow' }, minSide: 14, isLoop: true },
  { params: { variant: 'torus-front' }, minSide: 14, isLoop: false },
  { params: { variant: 'torus-drop' }, minSide: 14, isLoop: false },
  { params: { variant: 'coin' }, minSide: 7, isLoop: true },
  { params: { variant: 'coin', glyph: 'check' }, minSide: 7, isLoop: false },
  { params: { variant: 'coin', glyph: 'cross' }, minSide: 7, isLoop: false },
  { params: { variant: 'coin-rest' }, minSide: 7, isLoop: true },
  { params: { variant: 'coin-decide' }, minSide: 7, isLoop: true },
  { params: { variant: 'cloud' }, minSide: 12, isLoop: true },
  { params: { variant: 'cloud', glyph: 'sphere' }, minSide: 12, isLoop: true },
  { params: { variant: 'cloud', glyph: 'check' }, minSide: 12, isLoop: false, endsOn: 'check' },
  { params: { variant: 'cloud', glyph: 'cross' }, minSide: 12, isLoop: false, endsOn: 'cross' },
];

const WIDE_GRIDS: readonly GridSize[] = [
  { cols: 16, rows: 14 },
  { cols: 14, rows: 16 },
];
const HOLD_MS = 1500;
const MAX_DOT_FLASHES = 3;

const clips = new Map<string, RecipeOutput>();

function generate(grid: GridSize, params: RecipeParams): RecipeOutput {
  const key = JSON.stringify([grid.cols, grid.rows, params]);
  const cached = clips.get(key) ?? generateProjection(grid, params);
  clips.set(key, cached);
  return cached;
}

function label({ params }: Case): string {
  return [params.variant, params.glyph, params.frames].filter((part) => part !== undefined).join(' ');
}

function gridsFor(minSide: number): GridSize[] {
  return [...squareGrids(minSide), ...WIDE_GRIDS];
}

describe.each(CASES.map((testCase) => [label(testCase), testCase] as const))(
  'projection %s',
  (_, testCase) => {
    const { params, minSide, isLoop } = testCase;
    const grids = gridsFor(minSide);

    it('sizes every frame to the grid and gives each frame a positive duration', () => {
      grids.forEach((grid) => {
        const { frames, durations } = generate(grid, params);
        expect(frames.length).toBeGreaterThan(0);
        expect(durations).toHaveLength(frames.length);
        frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
        durations.forEach((ms) => expect(ms).toBeGreaterThan(0));
      });
    });

    it('draws the same frames on every call', () => {
      const grid = grids[grids.length - 1];
      expect(generateProjection(grid, params)).toEqual(generate(grid, params));
    });

    it('never makes more than 6 lit-count steps of a fifth of the grid in any second', () => {
      grids.forEach((grid) => {
        expect(maxStepsPerSecond(generate(grid, params), isLoop)).toBeLessThanOrEqual(MAX_STEPS_PER_SECOND);
      });
    });

    it('never changes a fifth of the grid in one step more than 6 times in any second', () => {
      grids.forEach((grid) => {
        expect(maxBigChangesPerSecond(generate(grid, params), isLoop)).toBeLessThanOrEqual(
          MAX_STEPS_PER_SECOND,
        );
      });
    });

    it('never lights any one dot more than 3 times in any second', () => {
      grids.forEach((grid) => {
        expect(countPeakFlashesPerSecond({ ...grid, ...generate(grid, params) })).toBeLessThanOrEqual(
          MAX_DOT_FLASHES,
        );
      });
    });
  },
);

function casesWhere(keep: (testCase: Case) => boolean): (readonly [string, Case])[] {
  return CASES.filter(keep).map((testCase) => [label(testCase), testCase] as const);
}

describe.each(casesWhere(({ isLoop }) => isLoop))('looping projection %s', (_, { params, minSide }) => {
  it('joins its loop seam no harder than its largest step', () => {
    gridsFor(minSide).forEach((grid) => {
      const { frames } = generate(grid, params);
      if (frames.length > 1) expect(seamChange(frames)).toBeLessThanOrEqual(largestStep(frames));
    });
  });
});

describe.each(casesWhere(({ isLoop }) => !isLoop))('one-shot projection %s', (_, { params, minSide }) => {
  it('ends on a held frame', () => {
    gridsFor(minSide).forEach((grid) => {
      expect(generate(grid, params).durations.at(-1)).toBe(HOLD_MS);
    });
  });
});

describe.each(casesWhere(({ endsOn }) => endsOn !== undefined))('landing projection %s', (_, testCase) => {
  it('ends on the shared result glyph', () => {
    gridsFor(testCase.minSide).forEach((grid) => {
      const { frames } = generate(grid, testCase.params);
      expect(frames.at(-1)).toEqual(glyphMask(testCase.endsOn ?? 'check', grid));
    });
  });
});

describe('generateProjection below the readable sizes', () => {
  it('still draws every variant on the smallest grids without throwing', () => {
    [
      { cols: 3, rows: 3 },
      { cols: 5, rows: 4 },
    ].forEach((grid) =>
      CASES.forEach(({ params }) => {
        const { frames } = generateProjection(grid, params);
        frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
      }),
    );
  });
});
