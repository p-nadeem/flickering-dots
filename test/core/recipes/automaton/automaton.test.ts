import { describe, expect, it } from 'vitest';

import {
  AUTOMATON_DEFAULTS,
  AUTOMATON_GLYPHS,
  AUTOMATON_VARIANTS,
  generateAutomaton,
} from '../../../../src/core/recipes/automaton';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import {
  MAX_STEPS_PER_SECOND,
  countPeakLumaSteps,
  expectWellFormed,
  getLargestStep,
  getSeamChange,
  gridName,
  gridsFrom,
} from './clip-metrics';
import { countPeakBigChanges } from '../../../presets/wow/emergence-flashes';

const MAX_BIG_CHANGES_PER_SECOND = 6;

type Playback = 'loop' | 'once';

interface VariantCase {
  name: string;
  params: RecipeParams;
  playback: Playback;
  grids: readonly GridSize[];
}

const FIRE_GRIDS = gridsFrom([
  [6, 6],
  [7, 9],
  [8, 8],
  [12, 8],
  [16, 16],
]);
const RULE_GRIDS = gridsFrom([
  [8, 5],
  [8, 8],
  [11, 7],
  [16, 9],
  [16, 16],
]);
const ANT_GRIDS = gridsFrom([
  [7, 7],
  [8, 8],
  [11, 11],
  [12, 9],
  [16, 16],
]);
const SPOTS_GRIDS = gridsFrom([
  [12, 12],
  [13, 13],
  [16, 12],
  [16, 16],
]);

const CASES: readonly VariantCase[] = [
  { name: 'fire idle', params: { variant: 'fire', density: 0.25 }, playback: 'loop', grids: FIRE_GRIDS },
  { name: 'fire thinking', params: { variant: 'fire', density: 0.65 }, playback: 'loop', grids: FIRE_GRIDS },
  {
    name: 'fire working hard',
    params: { variant: 'fire', density: 0.85 },
    playback: 'loop',
    grids: FIRE_GRIDS,
  },
  { name: 'fire-out', params: { variant: 'fire-out' }, playback: 'once', grids: FIRE_GRIDS },
  { name: 'fire-gutter', params: { variant: 'fire-gutter' }, playback: 'once', grids: FIRE_GRIDS },
  { name: 'rule-90 idle', params: { variant: 'rule-90', frames: 1 }, playback: 'loop', grids: RULE_GRIDS },
  { name: 'rule-90', params: { variant: 'rule-90' }, playback: 'loop', grids: RULE_GRIDS },
  {
    name: 'rule-90 bloom',
    params: { variant: 'rule-90', glyph: 'check' },
    playback: 'once',
    grids: RULE_GRIDS,
  },
  { name: 'rule-30', params: { variant: 'rule-30' }, playback: 'loop', grids: RULE_GRIDS },
  { name: 'rule-204', params: { variant: 'rule-204' }, playback: 'once', grids: RULE_GRIDS },
  { name: 'ant-rest', params: { variant: 'ant-rest' }, playback: 'loop', grids: ANT_GRIDS },
  { name: 'ant', params: { variant: 'ant' }, playback: 'loop', grids: ANT_GRIDS },
  { name: 'ant-undo', params: { variant: 'ant-undo' }, playback: 'loop', grids: ANT_GRIDS },
  { name: 'ant-home', params: { variant: 'ant-home' }, playback: 'once', grids: ANT_GRIDS },
  { name: 'ant-freeze', params: { variant: 'ant-freeze' }, playback: 'once', grids: ANT_GRIDS },
  { name: 'spots-breathe', params: { variant: 'spots-breathe' }, playback: 'loop', grids: SPOTS_GRIDS },
  { name: 'spots', params: { variant: 'spots' }, playback: 'loop', grids: SPOTS_GRIDS },
  { name: 'spots-coral', params: { variant: 'spots-coral' }, playback: 'loop', grids: SPOTS_GRIDS },
  { name: 'spots-pulse', params: { variant: 'spots-pulse' }, playback: 'once', grids: SPOTS_GRIDS },
  { name: 'spots-labyrinth', params: { variant: 'spots-labyrinth' }, playback: 'once', grids: SPOTS_GRIDS },
];

const GRID_CASES = CASES.flatMap((variantCase) =>
  variantCase.grids.map((grid) => [`${variantCase.name} at ${gridName(grid)}`, variantCase, grid] as const),
);

describe('generateAutomaton', () => {
  it('lists every variant the four sets use', () => {
    expect([...AUTOMATON_VARIANTS].sort()).toEqual(
      [...new Set(CASES.map((variantCase) => variantCase.params.variant ?? ''))].sort(),
    );
  });

  it('accepts the shared glyphs', () => {
    expect(AUTOMATON_GLYPHS).toEqual(['check', 'cross', 'sparkle', 'plus']);
  });

  it('draws the thinking fire when no variant is given', () => {
    const grid = { cols: 8, rows: 8 };
    expect(AUTOMATON_DEFAULTS.variant).toBe('fire');
    expect(generateAutomaton(grid, {})).toEqual(generateAutomaton(grid, { variant: 'fire', density: 0.65 }));
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateAutomaton({ cols: 8, rows: 8 }, { variant: 'plasma' })).toThrow(
      'flickering-dots automaton: unknown variant "plasma"; use one of fire, fire-out',
    );
  });

  it.each(GRID_CASES)('%s: builds whole frames with one duration each', (_label, variantCase, grid) => {
    expect(expectWellFormed(generateAutomaton(grid, variantCase.params), grid)).toEqual([]);
  });

  it.each(GRID_CASES)('%s: repeats the same frames for the same params', (_label, variantCase, grid) => {
    expect(generateAutomaton(grid, variantCase.params)).toEqual(generateAutomaton(grid, variantCase.params));
  });

  it.each(GRID_CASES)(
    '%s: stays at or under six big lit-count steps a second',
    (_label, variantCase, grid) => {
      const output = generateAutomaton(grid, variantCase.params);
      expect(countPeakLumaSteps(output, grid, variantCase.playback === 'loop')).toBeLessThanOrEqual(
        MAX_STEPS_PER_SECOND,
      );
    },
  );

  it.each(GRID_CASES.filter(([, variantCase]) => variantCase.params.variant?.startsWith('rule') === true))(
    '%s: changes 20 percent of the grid at most six times a second',
    (_label, variantCase, grid) => {
      const clip = { ...grid, ...generateAutomaton(grid, variantCase.params) };
      expect(countPeakBigChanges(clip, variantCase.playback === 'loop')).toBeLessThanOrEqual(
        MAX_BIG_CHANGES_PER_SECOND,
      );
    },
  );

  it.each(GRID_CASES.filter(([, variantCase]) => variantCase.playback === 'loop'))(
    '%s: loops with a seam no larger than its largest step',
    (_label, variantCase, grid) => {
      const { frames } = generateAutomaton(grid, variantCase.params);
      expect(getSeamChange(frames)).toBeLessThanOrEqual(Math.max(getLargestStep(frames), 1));
    },
  );
});
