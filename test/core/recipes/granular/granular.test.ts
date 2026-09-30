import { describe, expect, it } from 'vitest';

import {
  GRANULAR_DEFAULTS,
  GRANULAR_VARIANTS,
  generateGranular,
} from '../../../../src/core/recipes/granular';
import { morphPoints } from '../../../../src/core/recipes/granular/morph';
import { getProgressMarks } from '../../../../src/core/recipes/granular/shared';

import { gridsFrom, hasValidShape, labelGrids } from './checks';

const ALL_GRIDS = gridsFrom(3, 3);

describe('generateGranular', () => {
  it('lists its variants and defaults', () => {
    expect(GRANULAR_VARIANTS).toEqual([
      'hourglass',
      'hourglass-full',
      'hourglass-slow',
      'hourglass-progress',
      'hourglass-done',
      'hourglass-jam',
      'drift',
      'drift-progress',
      'drift-settle',
      'drift-blizzard',
    ]);
    expect(GRANULAR_DEFAULTS).toEqual({ variant: 'hourglass', density: 1, seed: 11 });
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateGranular({ cols: 9, rows: 11 }, { variant: 'plasma' })).toThrow(
      'flickering-dots granular: unknown variant "plasma"; use one of hourglass, hourglass-full, hourglass-slow, hourglass-progress, hourglass-done, hourglass-jam, drift, drift-progress, drift-settle, drift-blizzard',
    );
  });

  it.each(labelGrids(ALL_GRIDS))('draws every variant without throwing on %s', (_, grid) => {
    GRANULAR_VARIANTS.forEach((variant) => {
      expect(hasValidShape(generateGranular(grid, { variant }), grid)).toBe(true);
    });
  });
});

describe('morphPoints', () => {
  it('eases every grain to its nearest free target and ends on the target', () => {
    const steps = morphPoints(
      [
        [0, 0],
        [4, 0],
      ],
      [
        [4, 4],
        [0, 4],
      ],
    );
    expect(steps).toHaveLength(6);
    expect(steps[5]).toEqual([
      [0, 4],
      [4, 4],
    ]);
  });

  it('repeats sources when the target has more cells and returns the target when a side is empty', () => {
    expect(
      morphPoints(
        [[0, 0]],
        [
          [1, 0],
          [2, 0],
        ],
        1,
      ),
    ).toEqual([
      [
        [1, 0],
        [2, 0],
      ],
    ]);
    expect(morphPoints([], [[1, 1]])).toEqual([[[1, 1]]]);
  });
});

describe('getProgressMarks', () => {
  it('rises in seeded steps and ends exactly at 1', () => {
    const marks = getProgressMarks(11);
    expect(marks[marks.length - 1]).toBe(1);
    expect(marks.every((mark, index) => index === 0 || mark > marks[index - 1])).toBe(true);
    expect(getProgressMarks(11)).toEqual(marks);
  });
});
