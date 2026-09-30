import { describe, expect, it } from 'vitest';

import { VARIANTS_A } from '../../../../src/core/recipes/columns/variants-a';

import { isolatedCells, MAX_BIG_CHANGES_PER_SECOND, peakBigChanges } from '../flash-budget';
import { litRowsInColumn } from './support-a';

const SET_GRID = { cols: 16, rows: 9 };
const LOOPS = ['helix', 'helix-slow', 'helix-fast'] as const;

describe('helix reads as a turning double helix', () => {
  it.each(LOOPS)('keeps %s within 6 big changes a second', (variant) => {
    const output = VARIANTS_A[variant](SET_GRID, {});

    expect(peakBigChanges(output, SET_GRID, true)).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_SECOND);
  });

  it('draws the strands without lone dots away from the scrolling edges', () => {
    const { frames } = VARIANTS_A.helix(SET_GRID, {});

    frames.forEach((frame) => expect(isolatedCells(frame, SET_GRID, true)).toBe(0));
  });

  it('shows rungs of at least two lengths so the ladder turns', () => {
    const [first] = VARIANTS_A.helix(SET_GRID, {}).frames;
    const lengths = Array.from(
      { length: SET_GRID.cols },
      (_, x) => litRowsInColumn(first, SET_GRID, x).length,
    );

    expect(new Set(lengths.filter((count) => count >= 5)).size).toBeGreaterThanOrEqual(2);
  });

  it('breaks the back strand beside each crossing so one strand passes in front', () => {
    const [first] = VARIANTS_A.helix(SET_GRID, {}).frames;

    expect(litRowsInColumn(first, SET_GRID, 1).every((y) => y > (SET_GRID.rows - 1) / 2)).toBe(true);
  });

  it('turns faster for indexing than for thinking, and slower for idle', () => {
    const speed = (variant: string): number => {
      const output = VARIANTS_A[variant](SET_GRID, {});
      return output.durations.reduce((sum, ms) => sum + ms, 0);
    };

    expect(speed('helix-fast')).toBeLessThan(speed('helix'));
    expect(speed('helix-slow')).toBeGreaterThan(speed('helix'));
  });
});
