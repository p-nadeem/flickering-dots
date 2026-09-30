import { describe, expect, it } from 'vitest';

import { generateGranular } from '../../../../src/core/recipes/granular';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import {
  MAX_BIG_CHANGES_PER_SECOND,
  maxBigChangesPerSecond,
  gridsFrom,
  hasValidShape,
  labelGrids,
  largestStep,
  seamChanges,
} from './checks';

interface Case {
  name: string;
  params: RecipeParams;
  grids: GridSize[];
  isLoop: boolean;
}

const HOURGLASS_GRIDS = gridsFrom(7, 9);
const DRIFT_GRIDS = gridsFrom(7, 7);

const CASES: Case[] = [
  { name: 'hourglass', params: { variant: 'hourglass' }, grids: HOURGLASS_GRIDS, isLoop: true },
  { name: 'hourglass-full', params: { variant: 'hourglass-full' }, grids: HOURGLASS_GRIDS, isLoop: true },
  { name: 'hourglass-slow', params: { variant: 'hourglass-slow' }, grids: HOURGLASS_GRIDS, isLoop: true },
  {
    name: 'hourglass-progress',
    params: { variant: 'hourglass-progress' },
    grids: HOURGLASS_GRIDS,
    isLoop: true,
  },
  { name: 'hourglass-done', params: { variant: 'hourglass-done' }, grids: HOURGLASS_GRIDS, isLoop: false },
  { name: 'hourglass-jam', params: { variant: 'hourglass-jam' }, grids: HOURGLASS_GRIDS, isLoop: false },
  { name: 'drift', params: { variant: 'drift' }, grids: DRIFT_GRIDS, isLoop: true },
  { name: 'drift idle', params: { variant: 'drift', density: 0.2 }, grids: DRIFT_GRIDS, isLoop: true },
  { name: 'drift-progress', params: { variant: 'drift-progress' }, grids: DRIFT_GRIDS, isLoop: true },
  { name: 'drift-settle', params: { variant: 'drift-settle' }, grids: DRIFT_GRIDS, isLoop: false },
  { name: 'drift-blizzard', params: { variant: 'drift-blizzard' }, grids: DRIFT_GRIDS, isLoop: false },
];

const HOURGLASS_LOOPS = new Set(['hourglass', 'hourglass-slow', 'hourglass-progress']);

describe.each(CASES)('granular $name', ({ params, grids, isLoop }) => {
  it.each(labelGrids(grids))('has well-formed frames and is deterministic on %s', (_, grid) => {
    const output = generateGranular(grid, params);
    expect(hasValidShape(output, grid)).toBe(true);
    expect(generateGranular(grid, params)).toEqual(output);
  });

  it.each(labelGrids(grids))('keeps big changes to at most 6 in any second on %s', (_, grid) => {
    expect(maxBigChangesPerSecond(generateGranular(grid, params), isLoop)).toBeLessThanOrEqual(
      MAX_BIG_CHANGES_PER_SECOND,
    );
  });
});

const SMOOTH_LOOPS = CASES.filter(({ name, isLoop }) => isLoop && !HOURGLASS_LOOPS.has(name));

describe.each(SMOOTH_LOOPS)('granular $name loop seam', ({ params, grids }) => {
  it.each(labelGrids(grids))('closes its loop with an ordinary step on %s', (_, grid) => {
    const { frames } = generateGranular(grid, params);
    expect(seamChanges(frames)).toBeLessThanOrEqual(largestStep(frames));
  });
});
