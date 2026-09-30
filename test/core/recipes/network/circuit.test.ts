import { describe, expect, it } from 'vitest';

import { getCircuitLayout, padRing } from '../../../../src/core/recipes/network/circuit-trace';
import type { GridSize } from '../../../../src/core/types';

import { cellKeys, expectVariantAcrossGrids, gridLabel, gridsFrom, litCells, run } from './network-checks';
import { CIRCUIT_FRAMES } from './circuit-frames';
import { toOutputText } from '../frame-text';

const MIN_GRID: GridSize = { cols: 7, rows: 5 };
const SET_GRID: GridSize = { cols: 12, rows: 7 };
const CELL_MS = 35;

function isNeighbour(a: readonly number[], b: readonly number[]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

describe('circuit trace', () => {
  it('draws an S trace with two right-angle bends into a 3x3 pad on the 12x7 set grid', () => {
    const { trace, pad } = getCircuitLayout(SET_GRID, 0);
    expect(pad).toEqual({ left: 9, top: 3, size: 3 });
    expect(trace).toEqual([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
      [5, 4],
      [6, 4],
      [7, 4],
      [8, 4],
    ]);
  });

  it('keeps every trace a 4-connected path from the left edge that touches only its own neighbours', () => {
    gridsFrom(MIN_GRID.cols, MIN_GRID.rows).forEach((grid) => {
      [0, 1, 2].forEach((shape) => {
        const { trace, pad } = getCircuitLayout(grid, shape);
        const label = `${gridLabel(grid)} shape ${shape}`;
        expect(trace[0][0], label).toBe(0);
        trace.slice(1).forEach((cell, i) => expect(isNeighbour(trace[i], cell), label).toBe(true));
        trace.forEach((a, i) =>
          trace.slice(i + 2).forEach((b) => expect(isNeighbour(a, b), label).toBe(false)),
        );
        expect(
          padRing(pad).some((cell) => isNeighbour(cell, trace[trace.length - 1])),
          label,
        ).toBe(true);
      });
    });
  });
});

describe('circuit variants', () => {
  it.each(['circuit', 'trace-idle', 'circuit-roundtrip', 'circuit-lit', 'circuit-break'])(
    'draws the exact %s frames on the 12x7 set grid',
    (variant) => {
      expect(toOutputText(run(variant, SET_GRID), SET_GRID.cols)).toEqual(CIRCUIT_FRAMES[variant]);
    },
  );

  it.each([
    ['circuit', true],
    ['trace-idle', true],
    ['circuit-roundtrip', true],
    ['circuit-lit', false],
    ['circuit-break', false],
  ])('%s is well formed, deterministic, seamless and flash safe from 7x5 to 16x16', (variant, isLoop) => {
    expectVariantAcrossGrids({ variant, minGrid: MIN_GRID, isLoop });
  });

  it('moves packets one cell per 35 ms', () => {
    expect(new Set(run('circuit', SET_GRID).durations)).toEqual(new Set([CELL_MS]));
  });

  it('shifts the dotted wire parity every 400 ms at rest', () => {
    const output = run('trace-idle', SET_GRID);
    expect(output.durations).toEqual([400, 400]);
    const [a, b] = output.frames.map((frame) => cellKeys(litCells(frame, SET_GRID.cols)));
    expect(a.filter((key) => b.includes(key))).toEqual(cellKeys(padRing({ left: 9, top: 3, size: 3 })));
  });

  it('holds a solid pad after lighting the wire for 300 ms', () => {
    const output = run('circuit-lit', SET_GRID);
    expect(output.durations.at(-2)).toBe(300);
    expect(litCells(output.frames[output.frames.length - 1], SET_GRID.cols)).toHaveLength(9);
  });

  it('blinks the two cells beside the break twice at 250 ms', () => {
    const output = run('circuit-break', SET_GRID);
    expect(output.durations.slice(-5, -1)).toEqual([250, 250, 250, 250]);
  });
});
