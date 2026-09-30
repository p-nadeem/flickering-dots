import { describe, expect, it } from 'vitest';

import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import { countPeakFlashesPerSecond } from '../../../presets/flashes';
import {
  MAX_BIG_CHANGES_PER_SECOND,
  gridsFrom,
  maxBigCellChangesPerSecond,
  maxBigLitChangesPerSecond,
  maxStepChange,
  seamChange,
} from './arcade-b-checks';

interface VariantCase {
  variant: string;
  min: GridSize;
  isLoop: boolean;
  params?: RecipeParams;
}

const BRICKS_MIN = { cols: 7, rows: 7 };
const RUN_MIN = { cols: 8, rows: 5 };
const CORNER_MIN = { cols: 8, rows: 6 };
const REELS_MIN = { cols: 11, rows: 3 };
const DICE_MIN = { cols: 3, rows: 3 };
const ANY_GRID = { cols: 3, rows: 3 };
const MAX_CELL_FLASHES_PER_SECOND = 3;

const CASES: readonly VariantCase[] = [
  { variant: 'bricks', min: BRICKS_MIN, isLoop: true },
  { variant: 'bricks-rest', min: BRICKS_MIN, isLoop: true },
  { variant: 'bricks-progress', min: BRICKS_MIN, isLoop: true },
  { variant: 'bricks-progress', min: BRICKS_MIN, isLoop: true, params: { density: 0.4 } },
  { variant: 'bricks-clear', min: BRICKS_MIN, isLoop: false },
  { variant: 'bricks-miss', min: BRICKS_MIN, isLoop: false },
  { variant: 'run', min: RUN_MIN, isLoop: true },
  { variant: 'run-stand', min: RUN_MIN, isLoop: true },
  { variant: 'run-empty', min: RUN_MIN, isLoop: true },
  { variant: 'run-finish', min: RUN_MIN, isLoop: false },
  { variant: 'run-crash', min: RUN_MIN, isLoop: false },
  { variant: 'corner', min: CORNER_MIN, isLoop: true },
  { variant: 'corner-drift', min: CORNER_MIN, isLoop: true },
  { variant: 'corner-wait', min: CORNER_MIN, isLoop: true },
  { variant: 'corner-hit', min: CORNER_MIN, isLoop: false },
  { variant: 'corner-near', min: CORNER_MIN, isLoop: false },
  { variant: 'reels', min: REELS_MIN, isLoop: true },
  { variant: 'reels-rest', min: REELS_MIN, isLoop: true },
  { variant: 'reels-stagger', min: REELS_MIN, isLoop: true },
  { variant: 'reels-win', min: REELS_MIN, isLoop: false },
  { variant: 'reels-lose', min: REELS_MIN, isLoop: false },
  { variant: 'dice', min: DICE_MIN, isLoop: true },
  { variant: 'dice', min: DICE_MIN, isLoop: false, params: { glyph: 'six' } },
  { variant: 'dice', min: DICE_MIN, isLoop: false, params: { glyph: 'one' } },
  { variant: 'dice-rest', min: DICE_MIN, isLoop: true },
  { variant: 'dice-sample', min: DICE_MIN, isLoop: true },
];

const EXPECTED_VARIANTS = [
  'bricks',
  'bricks-rest',
  'bricks-progress',
  'bricks-clear',
  'bricks-miss',
  'run',
  'run-stand',
  'run-empty',
  'run-finish',
  'run-crash',
  'corner',
  'corner-drift',
  'corner-wait',
  'corner-hit',
  'corner-near',
  'reels',
  'reels-rest',
  'reels-stagger',
  'reels-win',
  'reels-lose',
  'dice',
  'dice-rest',
  'dice-sample',
];

function label({ variant, params }: VariantCase): string {
  return params ? `${variant} ${JSON.stringify(params)}` : variant;
}

function run(entry: VariantCase, grid: GridSize) {
  return VARIANTS_B[entry.variant](grid, { variant: entry.variant, ...entry.params });
}

describe('VARIANTS_B', () => {
  it('maps exactly the brick-wall, runner, corner-hit, reels and dice variants', () => {
    expect(Object.keys(VARIANTS_B).sort()).toEqual([...EXPECTED_VARIANTS].sort());
  });

  describe.each(CASES.map((entry) => [label(entry), entry] as const))('%s', (_, entry) => {
    it('throws a readable error on grids smaller than its smallest readable grid', () => {
      gridsFrom(ANY_GRID)
        .filter((grid) => grid.cols < entry.min.cols || grid.rows < entry.min.rows)
        .forEach((grid) => {
          expect(() => run(entry, grid)).toThrow(
            `flickering-dots build: arcade variant "${entry.variant}" needs a grid of at least ${entry.min.cols}×${entry.min.rows}, got ${grid.cols}×${grid.rows}`,
          );
        });
    });

    it('returns grid-sized frames with one positive whole duration each from its smallest grid to 16x16', () => {
      gridsFrom(entry.min).forEach((grid) => {
        const { frames, durations } = run(entry, grid);
        expect(frames.length).toBeGreaterThan(0);
        expect(durations).toHaveLength(frames.length);
        frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
        durations.forEach((ms) => expect(Number.isInteger(ms) && ms > 0).toBe(true));
      });
    });

    it('gives the same frames for the same grid and params', () => {
      gridsFrom(entry.min).forEach((grid) => expect(run(entry, grid)).toEqual(run(entry, grid)));
    });

    it('keeps changes of 20 percent of the grid to 6 or fewer in any second from its smallest grid to 16x16', () => {
      gridsFrom(entry.min).forEach((grid) => {
        const output = run(entry, grid);
        const worst = Math.max(
          maxBigCellChangesPerSecond(output, entry.isLoop),
          maxBigLitChangesPerSecond(output, entry.isLoop),
        );
        expect({ grid, worst }).toEqual({ grid, worst: Math.min(worst, MAX_BIG_CHANGES_PER_SECOND) });
      });
    });

    it('turns no cell on more than 3 times in any second, played as a loop', () => {
      gridsFrom(entry.min).forEach((grid) => {
        const worst = countPeakFlashesPerSecond({ ...grid, ...run(entry, grid) });
        expect({ grid, worst }).toEqual({ grid, worst: Math.min(worst, MAX_CELL_FLASHES_PER_SECOND) });
      });
    });

    it.runIf(entry.isLoop)('closes the loop with a seam no larger than its largest step', () => {
      gridsFrom(entry.min).forEach((grid) => {
        const { frames } = run(entry, grid);
        const seam = seamChange(frames);
        expect({ grid, seam }).toEqual({ grid, seam: Math.min(seam, maxStepChange(frames)) });
      });
    });
  });
});
