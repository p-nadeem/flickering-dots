import { describe, expect, it } from 'vitest';

import { VARIANTS_A } from '../../../../src/core/recipes/arcade/variants-a';
import type { GridSize } from '../../../../src/core/types';

import {
  MAX_BIG_CHANGES_PER_SECOND,
  gridsFrom,
  isWellFormed,
  label,
  largestInnerChange,
  maxBigChangesPerSecond,
  seamChange,
} from './arcade-checks';

interface VariantCase {
  variant: string;
  min: GridSize;
  isLoop: boolean;
  seamSlack?: (grid: GridSize) => number;
}

const pelletRefill = ({ cols }: GridSize): number => Math.floor(cols / 2);

const STACK_MIN = { cols: 4, rows: 6 };
const RALLY_MIN = { cols: 7, rows: 5 };
const MARCH_MIN = { cols: 9, rows: 6 };
const CHOMP_MIN = { cols: 9, rows: 3 };
const HUNT_MIN = { cols: 4, rows: 4 };

const CASES: readonly VariantCase[] = [
  { variant: 'stack', min: STACK_MIN, isLoop: true },
  { variant: 'stack-rest', min: STACK_MIN, isLoop: true },
  { variant: 'stack-progress', min: STACK_MIN, isLoop: true },
  { variant: 'stack-done', min: STACK_MIN, isLoop: false },
  { variant: 'stack-topout', min: STACK_MIN, isLoop: false },
  { variant: 'rally', min: RALLY_MIN, isLoop: true },
  { variant: 'rally-serve', min: RALLY_MIN, isLoop: true },
  { variant: 'rally-wait', min: RALLY_MIN, isLoop: true },
  { variant: 'rally-rest', min: RALLY_MIN, isLoop: false },
  { variant: 'rally-miss', min: RALLY_MIN, isLoop: false },
  { variant: 'march', min: MARCH_MIN, isLoop: true },
  { variant: 'march-idle', min: MARCH_MIN, isLoop: true },
  { variant: 'march-shoot', min: MARCH_MIN, isLoop: true },
  { variant: 'march-clear', min: MARCH_MIN, isLoop: false },
  { variant: 'march-invaded', min: MARCH_MIN, isLoop: false },
  { variant: 'chomp', min: CHOMP_MIN, isLoop: true, seamSlack: pelletRefill },
  { variant: 'chomp-rest', min: CHOMP_MIN, isLoop: true },
  { variant: 'chomp-progress', min: CHOMP_MIN, isLoop: true, seamSlack: pelletRefill },
  { variant: 'chomp-done', min: CHOMP_MIN, isLoop: false },
  { variant: 'chomp-caught', min: CHOMP_MIN, isLoop: false },
  { variant: 'hunt', min: HUNT_MIN, isLoop: true },
  { variant: 'hunt-coil', min: HUNT_MIN, isLoop: true },
  { variant: 'hunt-wait', min: HUNT_MIN, isLoop: true },
  { variant: 'hunt-fill', min: HUNT_MIN, isLoop: false },
  { variant: 'hunt-crash', min: HUNT_MIN, isLoop: false },
];

describe('VARIANTS_A', () => {
  it('offers exactly the variants of stack-clear, rally, alien-march, chomper and snake-hunt', () => {
    expect(Object.keys(VARIANTS_A).sort()).toEqual(CASES.map(({ variant }) => variant).sort());
  });

  describe.each(CASES)('$variant', ({ variant, min, isLoop, seamSlack }) => {
    const run = VARIANTS_A[variant];
    const grids = gridsFrom(min);

    it('draws whole frames with a positive duration each, from its smallest grid to 16x16', () => {
      const broken = grids.filter((grid) => !isWellFormed(run(grid, { variant }), grid)).map(label);
      expect(broken).toEqual([]);
    });

    it('returns the same frames for the same grid', () => {
      grids.forEach((grid) => expect(run(grid, { variant })).toEqual(run(grid, { variant })));
    });

    it('changes 20 percent of the grid at most 6 times in any second', () => {
      const failing = grids.filter(
        (grid) => maxBigChangesPerSecond(run(grid, { variant }), isLoop) > MAX_BIG_CHANGES_PER_SECOND,
      );
      expect(failing.map(label)).toEqual([]);
    });

    it('animates, and a loop closes without a bigger jump than its own steps, apart from a pellet refill', () => {
      const jumps = grids.filter((grid) => {
        const { frames } = run(grid, { variant });
        if (frames.length < 2) return true;
        return isLoop && seamChange(frames) > largestInnerChange(frames) + (seamSlack?.(grid) ?? 0);
      });
      expect(jumps.map(label)).toEqual([]);
    });

    it('explains a grid below its smallest size', () => {
      const small = { cols: min.cols - 1, rows: min.rows };
      if (small.cols < 3) return;
      expect(() => run(small, { variant })).toThrow(
        `arcade variant "${variant}" needs a grid of at least ${min.cols}×${min.rows}, got ${small.cols}×${small.rows}`,
      );
    });
  });
});
