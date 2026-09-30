import { describe, expect, it } from 'vitest';

import {
  columnRowsOfMask,
  frameFromColumnRows,
  frameFromHeights,
  joinOutputs,
  middleRow,
  slideToMask,
  smoothstep,
  withLastDuration,
} from '../../../../src/core/recipes/columns/shared';
import { glyphMask } from '../../../../src/core/glyphs';

import { toFrameText } from '../frame-text';

const GRID = { cols: 4, rows: 3 };

describe('columns shared helpers', () => {
  it('lights one row per column and skips empty columns', () => {
    expect(toFrameText(frameFromColumnRows(GRID, [0, null, 2, 1]), GRID.cols)).toBe('1000 0001 0010');
  });

  it('ignores rows outside the grid', () => {
    expect(toFrameText(frameFromColumnRows(GRID, [-1, 3, 1, 1]), GRID.cols)).toBe('0000 0011 0000');
  });

  it('fills columns up from the bottom, rounding and clamping heights', () => {
    expect(toFrameText(frameFromHeights(GRID, [0, 1.4, 2.5, 9]), GRID.cols)).toBe('0011 0011 0111');
  });

  it('reads the top lit row of each column of a mask', () => {
    expect(columnRowsOfMask([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0], GRID)).toEqual([2, 0, 1, null]);
  });

  it('slides each column one row a frame into a mask, ending on the mask exactly', () => {
    const grid = { cols: 7, rows: 7 };
    const mask = glyphMask('check', grid);
    const frames = slideToMask(grid, [3, 3, 3, 3, 3, 3, 3], mask);
    expect(frames[frames.length - 1]).toEqual(mask);
    const rows = frames.map((frame) => columnRowsOfMask(frame, grid));
    const moves = rows
      .slice(1)
      .flatMap((row, index) =>
        row.map((y, x) => (y === null || rows[index][x] === null ? 0 : Math.abs(y - (rows[index][x] ?? 0)))),
      );
    expect(Math.max(...moves)).toBe(1);
    expect(
      frames.every((frame) =>
        columnRowsOfMask(frame, grid).every(
          (y, x) => y === null || frame.filter((bit, i) => bit === 1 && i % grid.cols === x).length === 1,
        ),
      ),
    ).toBe(true);
  });

  it('picks the lower middle row on even sides', () => {
    expect([middleRow(5), middleRow(6), middleRow(7)]).toEqual([2, 3, 3]);
  });

  it('eases from 0 to 1 with zero slope at both ends', () => {
    expect([smoothstep(0), smoothstep(0.5), smoothstep(1), smoothstep(2)]).toEqual([0, 0.5, 1, 1]);
  });

  it('joins outputs and replaces the last duration without touching the inputs', () => {
    const first = { frames: [[1], [0]] as const, durations: [10, 20] };
    const joined = joinOutputs([
      { frames: [...first.frames], durations: first.durations },
      { frames: [[1]], durations: [30] },
    ]);
    expect(withLastDuration(joined, 99)).toEqual({ frames: [[1], [0], [1]], durations: [10, 20, 99] });
    expect(first.durations).toEqual([10, 20]);
  });
});
