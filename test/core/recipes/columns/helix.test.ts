import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { VARIANTS_A } from '../../../../src/core/recipes/columns/variants-a';
import type { Frame, GridSize } from '../../../../src/core/types';

import { lastFrame, litRowsInColumn } from './support-a';

const SET_GRID = { cols: 16, rows: 9 };
const helix = VARIANTS_A.helix(SET_GRID, {});

function countLit(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}

function shiftLeft(frame: Frame, grid: GridSize, by: number): Frame {
  return frame.map((_, index) => {
    const x = index % grid.cols;
    const y = Math.floor(index / grid.cols);
    return frame[y * grid.cols + ((x + by) % grid.cols)];
  });
}

function flipVertical(frame: Frame, grid: GridSize): Frame {
  return frame.map((_, index) => {
    const x = index % grid.cols;
    const y = Math.floor(index / grid.cols);
    return frame[(grid.rows - 1 - y) * grid.cols + x];
  });
}

describe('helix', () => {
  it('turns one column per frame for cols frames at 170 ms', () => {
    expect(helix.frames).toHaveLength(16);
    expect(new Set(helix.durations)).toEqual(new Set([170]));
    helix.frames.forEach((frame, f) => expect(frame).toEqual(shiftLeft(helix.frames[0], SET_GRID, f)));
  });

  it('keeps the lit count constant and draws a different front strand on each side of a crossing', () => {
    expect(new Set(helix.frames.map(countLit)).size).toBe(1);
    expect(flipVertical(helix.frames[0], SET_GRID)).not.toEqual(helix.frames[0]);
  });

  it('draws rungs clear of the strands and a single dot where the strands cross', () => {
    expect(litRowsInColumn(helix.frames[0], SET_GRID, 5)).toEqual([0, 2, 3, 4, 5, 6, 8]);
    expect(litRowsInColumn(helix.frames[0], SET_GRID, 0)).toEqual([4]);
  });

  it('plays the same turn at 400 ms for helix-slow and two columns a step for helix-fast', () => {
    const slow = VARIANTS_A['helix-slow'](SET_GRID, {});
    const fast = VARIANTS_A['helix-fast'](SET_GRID, {});
    expect(slow.frames).toEqual(helix.frames);
    expect(new Set(slow.durations)).toEqual(new Set([400]));
    expect(fast.frames).toEqual(helix.frames.filter((_, index) => index % 2 === 0));
    expect(new Set(fast.durations)).toEqual(new Set([170]));
  });
});

describe('helix-zip', () => {
  const output = VARIANTS_A['helix-zip'](SET_GRID, {});

  it('eases the strands into one middle line over 6 frames at 80 ms, then settles into the check', () => {
    expect(output.frames[0]).toEqual(helix.frames[0]);
    const line = Array.from({ length: SET_GRID.cols }, (_, x) =>
      litRowsInColumn(output.frames[6], SET_GRID, x),
    );
    expect(line.flat()).toEqual(Array.from({ length: 16 }, () => 4));
    expect(output.durations.slice(0, 6)).toEqual([80, 80, 80, 80, 80, 80]);
    expect(lastFrame(output)).toEqual(glyphMask('check', SET_GRID));
    expect(output.durations[output.durations.length - 1]).toBe(1500);
  });
});

describe('helix-unravel', () => {
  const output = VARIANTS_A['helix-unravel'](SET_GRID, {});

  it('drops the rungs one at a time, then flattens the strands to the top and bottom rows', () => {
    expect(output.frames[0]).toEqual(helix.frames[0]);
    const last = lastFrame(output);
    const expected = Array.from({ length: SET_GRID.cols }, () => [0, 8]);
    expect(Array.from({ length: SET_GRID.cols }, (_, x) => litRowsInColumn(last, SET_GRID, x))).toEqual(
      expected,
    );
    expect(output.durations[output.durations.length - 1]).toBe(1500);
  });
});
