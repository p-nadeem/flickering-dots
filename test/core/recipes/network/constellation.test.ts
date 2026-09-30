import { describe, expect, it } from 'vitest';

import { createRng } from '../../../../src/core/rng';
import { placeStars, spanningEdges } from '../../../../src/core/recipes/network/constellation-layout';
import type { GridSize } from '../../../../src/core/types';

import { chebyshev, expectVariantAcrossGrids, gridLabel, gridsFrom, litCells, run } from './network-checks';
import { CONSTELLATION_FRAMES } from './constellation-frames';
import { toOutputText } from '../frame-text';

const MIN_GRID: GridSize = { cols: 9, rows: 9 };
const SET_GRID: GridSize = { cols: 12, rows: 12 };
const STAR_SPACING = 3;

describe('constellation layout', () => {
  it('places the stars at least 3 cells apart and inside a margin of at least 1 cell', () => {
    gridsFrom(MIN_GRID.cols, MIN_GRID.rows).forEach((grid) => {
      const stars = placeStars(grid, 5, createRng(1));
      expect(stars, gridLabel(grid)).toHaveLength(5);
      stars.forEach(([x, y], i) => {
        expect(x).toBeGreaterThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(1);
        expect(x).toBeLessThanOrEqual(grid.cols - 2);
        expect(y).toBeLessThanOrEqual(grid.rows - 2);
        stars
          .slice(i + 1)
          .forEach((other) => expect(chebyshev(stars[i], other)).toBeGreaterThanOrEqual(STAR_SPACING));
      });
    });
  });

  it('joins the stars with a minimum spanning tree grown from the first star', () => {
    const stars = [
      [1, 1],
      [8, 1],
      [4, 1],
      [4, 6],
    ] as const;
    expect(spanningEdges(stars)).toEqual([
      { from: [1, 1], to: [4, 1] },
      { from: [4, 1], to: [8, 1] },
      { from: [4, 1], to: [4, 6] },
    ]);
  });
});

describe('constellation variants', () => {
  it.each(['stars', 'constellation', 'constellation-lock', 'constellation-snap', 'sparkle-grow'])(
    'draws the exact %s frames on the 12x12 set grid',
    (variant) => {
      expect(toOutputText(run(variant, SET_GRID), SET_GRID.cols)).toEqual(CONSTELLATION_FRAMES[variant]);
    },
  );

  it.each([
    ['stars', true],
    ['constellation', true],
    ['sparkle-grow', true],
    ['constellation-lock', false],
    ['constellation-snap', false],
  ])('%s is well formed, deterministic, seamless and flash safe from 9x9 to 16x16', (variant, isLoop) => {
    expectVariantAcrossGrids({ variant, minGrid: MIN_GRID, isLoop });
  });

  it('twinkles 3 idle stars, each dark for one 100 ms frame at a time', () => {
    const output = run('stars', SET_GRID);
    const lit = output.frames.map((frame) => litCells(frame, SET_GRID.cols).length);
    expect(Math.max(...lit)).toBe(3);
    expect(Math.min(...lit)).toBeGreaterThanOrEqual(2);
    output.frames.forEach((_, index) => {
      if (lit[index] < 3) expect(output.durations[index]).toBe(100);
    });
  });

  it('sparkles 5 stars into an empty sky and clears the sky before the loop restarts', () => {
    const output = run('constellation', SET_GRID, { length: 5 });
    expect(litCells(output.frames[0], SET_GRID.cols)).toHaveLength(1);
    expect(litCells(output.frames[output.frames.length - 1], SET_GRID.cols)).toHaveLength(0);
  });

  it('grows the idea sparkle to the grid edges', () => {
    const output = run('sparkle-grow', SET_GRID);
    const widest = Math.max(
      ...output.frames.map((frame) => {
        const xs = litCells(frame, SET_GRID.cols).map(([x]) => x);
        return xs.length === 0 ? 0 : Math.max(...xs) - Math.min(...xs) + 1;
      }),
    );
    expect(widest).toBe(SET_GRID.cols);
  });

  it('ends the snap with the stars fallen off the grid and rests on the broken line', () => {
    const output = run('constellation-snap', SET_GRID);
    expect(litCells(output.frames[output.frames.length - 1], SET_GRID.cols)).toHaveLength(0);
    const still = output.still ?? -1;
    expect(still).toBe(17);
    const lit = (index: number) => litCells(output.frames[index], SET_GRID.cols).length;
    expect(lit(still)).toBeLessThan(lit(still - 1));
    expect(lit(still + 1)).toBeLessThan(lit(still));
  });
});
