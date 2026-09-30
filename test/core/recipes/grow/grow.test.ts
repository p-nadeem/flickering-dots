import { describe, expect, it } from 'vitest';

import { GROW_DEFAULTS, GROW_VARIANTS, generateGrow } from '../../../../src/core/recipes/grow';
import type { GridSize } from '../../../../src/core/types';

import {
  MAX_BIG_CHANGES_PER_WINDOW,
  gridName,
  gridsFrom,
  maxBigChangesPerSecond,
  maxStepChange,
  seamChange,
  squareGrids,
} from './grow-checks';

const MAZE = { cols: 7, rows: 7 };
const FLOOD = { cols: 7, rows: 7 };
const BEAM = { cols: 9, rows: 9 };
const DLA = { cols: 9, rows: 9 };
const LEADER = { cols: 5, rows: 7 };

const SMALLEST: Readonly<Record<string, GridSize>> = {
  maze: MAZE,
  'maze-path': MAZE,
  'maze-trace': MAZE,
  'maze-collapse': MAZE,
  'maze-wait': MAZE,
  flood: FLOOD,
  'flood-rest': FLOOD,
  'flood-path': FLOOD,
  'flood-sealed': FLOOD,
  'flood-wait': FLOOD,
  beam: BEAM,
  'beam-rest': BEAM,
  'beam-win': BEAM,
  'beam-fail': BEAM,
  dla: DLA,
  'dla-rest': DLA,
  'dla-progress': DLA,
  'dla-tips': DLA,
  'dla-shatter': DLA,
  leader: LEADER,
  'leader-crackle': LEADER,
  'leader-strike': LEADER,
  'leader-strike-out': LEADER,
};

const ONE_SHOT = new Set([
  'maze-trace',
  'maze-collapse',
  'flood-path',
  'flood-sealed',
  'beam-win',
  'beam-fail',
  'dla-tips',
  'dla-shatter',
  'leader-strike',
  'leader-strike-out',
]);

const cases = GROW_VARIANTS.flatMap((variant) =>
  gridsFrom(SMALLEST[variant]).map((grid) => [variant, gridName(grid), grid] as const),
);

describe('generateGrow', () => {
  it('lists every variant the five sets use, each with a smallest readable grid', () => {
    expect([...GROW_VARIANTS].sort()).toEqual(Object.keys(SMALLEST).sort());
    expect(GROW_DEFAULTS).toEqual({ variant: 'maze', seed: 1 });
  });

  it('draws the maze when no variant is given', () => {
    expect(generateGrow(MAZE, {})).toEqual(generateGrow(MAZE, { variant: 'maze', seed: 1 }));
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateGrow(MAZE, { variant: 'plasma' })).toThrow(
      'flickering-dots grow: unknown variant "plasma"; use one of maze, maze-path',
    );
  });

  it.each(cases)('%s at %s gives whole frames and positive durations', (variant, _name, grid) => {
    const output = generateGrow(grid, { variant });
    expect(output.frames.length).toBeGreaterThan(0);
    expect(output.durations).toHaveLength(output.frames.length);
    output.frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
    output.frames.forEach((frame) => expect(frame.every((bit) => bit === 0 || bit === 1)).toBe(true));
    output.durations.forEach((ms) => expect(Number.isInteger(ms) && ms > 0).toBe(true));
  });

  it.each(cases)('%s at %s is deterministic for a seed', (variant, _name, grid) => {
    expect(generateGrow(grid, { variant, seed: 4 })).toEqual(generateGrow(grid, { variant, seed: 4 }));
  });

  it.each(cases)(
    '%s at %s changes 20 percent of the grid at most 6 times a second',
    (variant, _name, grid) => {
      const output = generateGrow(grid, { variant });
      const isLoop = !ONE_SHOT.has(variant);
      expect(maxBigChangesPerSecond(output, isLoop)).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_WINDOW);
    },
  );

  it.each(cases.filter(([variant]) => !ONE_SHOT.has(variant)))(
    '%s at %s loops with a seam no bigger than its own steps',
    (variant, _name, grid) => {
      const output = generateGrow(grid, { variant });
      expect(seamChange(output)).toBeLessThanOrEqual(Math.max(maxStepChange(output), 0));
    },
  );

  it.each(cases.filter(([variant]) => ONE_SHOT.has(variant)))(
    '%s at %s ends on a held last frame',
    (variant, _name, grid) => {
      const { durations } = generateGrow(grid, { variant });
      expect(durations[durations.length - 1]).toBeGreaterThanOrEqual(400);
    },
  );

  it.each(squareGrids(3, 6).flatMap((grid) => GROW_VARIANTS.map((variant) => [variant, grid] as const)))(
    '%s still draws below its smallest grid without throwing',
    (variant, grid) => {
      const output = generateGrow(grid, { variant });
      expect(output.frames.length).toBeGreaterThan(0);
      expect(output.durations).toHaveLength(output.frames.length);
    },
  );

  it.each([
    { cols: 12, rows: 3 },
    { cols: 3, rows: 16 },
    { cols: 16, rows: 8 },
  ])('draws every variant on the thin %o grid', (grid) => {
    GROW_VARIANTS.forEach((variant) => {
      const output = generateGrow(grid, { variant });
      output.frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
    });
  });
});
