import { describe, expect, it } from 'vitest';

import { getLayers } from '../../../../src/core/recipes/network/synapse-layout';
import type { GridSize } from '../../../../src/core/types';

import { chebyshev, expectVariantAcrossGrids, gridLabel, gridsFrom, litCells, run } from './network-checks';
import { SYNAPSE_FRAMES } from './synapse-frames';
import { toOutputText } from '../frame-text';

const MIN_GRID: GridSize = { cols: 9, rows: 7 };
const SET_GRID: GridSize = { cols: 11, rows: 9 };
const STEP_MS = 70;
const REST_SPARK_GAP_MS = 2000;

describe('synapse layout', () => {
  it('uses 4 layers of 3, 4, 2 and 1 nodes on the 11x9 set grid, mirrored left to right', () => {
    expect(getLayers(SET_GRID)).toEqual([
      [
        [1, 1],
        [1, 4],
        [1, 7],
      ],
      [
        [4, 1],
        [4, 3],
        [4, 5],
        [4, 7],
      ],
      [
        [6, 2],
        [6, 6],
      ],
      [[9, 4]],
    ]);
  });

  it('uses 3 layers of 3, 3 and 1 nodes on narrower grids', () => {
    expect(getLayers(MIN_GRID).map((layer) => layer.length)).toEqual([3, 3, 1]);
  });

  it('never puts two nodes next to each other from 9x7 to 16x16', () => {
    gridsFrom(MIN_GRID.cols, MIN_GRID.rows).forEach((grid) => {
      const nodes = getLayers(grid).flat();
      nodes.forEach((a, i) =>
        nodes.slice(i + 1).forEach((b) => expect(chebyshev(a, b), gridLabel(grid)).toBeGreaterThanOrEqual(2)),
      );
    });
  });
});

describe('synapse variants', () => {
  it.each(['synapse', 'synapse-rest', 'synapse-forward', 'synapse-drop', 'synapse-train'])(
    'draws the exact %s frames on the 11x9 set grid',
    (variant) => {
      expect(toOutputText(run(variant, SET_GRID), SET_GRID.cols)).toEqual(SYNAPSE_FRAMES[variant]);
    },
  );

  it.each([
    ['synapse', true],
    ['synapse-rest', true],
    ['synapse-train', true],
    ['synapse-forward', false],
    ['synapse-drop', false],
  ])('%s is well formed, deterministic, seamless and flash safe from 9x7 to 16x16', (variant, isLoop) => {
    expectVariantAcrossGrids({ variant, minGrid: MIN_GRID, isLoop });
  });

  it('keeps every node lit in every thinking frame and steps at 70 ms', () => {
    const output = run('synapse', SET_GRID);
    const nodes = getLayers(SET_GRID).flat();
    output.frames.forEach((frame) => nodes.forEach(([x, y]) => expect(frame[y * SET_GRID.cols + x]).toBe(1)));
    expect(new Set(output.durations)).toEqual(new Set([STEP_MS]));
  });

  it('runs about 27 frames for 2 chains and more for 3', () => {
    const two = run('synapse', SET_GRID).frames.length;
    expect(two).toBeGreaterThanOrEqual(20);
    expect(two).toBeLessThanOrEqual(36);
    expect(run('synapse', SET_GRID, { length: 3 }).frames.length).toBeGreaterThan(two);
  });

  it('fires a spark every 2 s at rest', () => {
    const output = run('synapse-rest', SET_GRID);
    const pairs = output.durations.length / 2;
    Array.from({ length: pairs }, (_, pair) =>
      expect(output.durations[2 * pair] + output.durations[2 * pair + 1]).toBe(REST_SPARK_GAP_MS),
    );
  });

  it('ends the forward pass with a plus held on the output node', () => {
    const output = run('synapse-forward', SET_GRID);
    const last = litCells(output.frames[output.frames.length - 1], SET_GRID.cols);
    const [[ox, oy]] = getLayers(SET_GRID).at(-1) ?? [];
    const plus = [
      [ox, oy - 1],
      [ox - 1, oy],
      [ox, oy],
      [ox + 1, oy],
      [ox, oy + 1],
    ];
    plus.forEach((cell) => expect(last).toContainEqual(cell));
    expect(output.durations.slice(0, -1).every((ms) => ms === 120)).toBe(true);
  });

  it('ends the drop with the output node dark', () => {
    const output = run('synapse-drop', SET_GRID);
    const [[ox, oy]] = getLayers(SET_GRID).at(-1) ?? [];
    expect(output.frames[output.frames.length - 1][oy * SET_GRID.cols + ox]).toBe(0);
  });
});
