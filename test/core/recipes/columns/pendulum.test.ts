import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { VARIANTS_A } from '../../../../src/core/recipes/columns/variants-a';
import type { Frame, GridSize } from '../../../../src/core/types';

import { lastFrame, litRowsInColumn } from './support-a';

const SET_GRID = { cols: 12, rows: 7 };
const pendulum = VARIANTS_A.pendulum;

function columnRows(frame: Frame, grid: GridSize): number[][] {
  return Array.from({ length: grid.cols }, (_, x) => litRowsInColumn(frame, grid, x));
}

describe('pendulum', () => {
  it('runs T = 8 * (6 + cols - 1) frames at 45 ms with six as the default length', () => {
    const { frames, durations } = pendulum(SET_GRID, { length: 6 });
    expect(frames).toHaveLength(136);
    expect(new Set(durations)).toEqual(new Set([45]));
    expect(pendulum(SET_GRID, {})).toEqual(pendulum(SET_GRID, { length: 6 }));
  });

  it('uses length 4 below 9 columns', () => {
    expect(pendulum({ cols: 8, rows: 5 }, {}).frames).toHaveLength(8 * (4 + 7));
  });

  it('keeps one bob per column on the cosine row of its own frequency', () => {
    const { frames } = pendulum(SET_GRID, { length: 6 });
    const frame = 17;
    const expected = Array.from({ length: SET_GRID.cols }, (_, c) => [
      Math.round(3 + 3 * Math.cos((2 * Math.PI * (6 + c) * frame) / 136)),
    ]);
    expect(columnRows(frames[frame], SET_GRID)).toEqual(expected);
    expect(frames.every((f) => columnRows(f, SET_GRID).every((rows) => rows.length === 1))).toBe(true);
  });

  it('starts every loop as one flat line on the bottom row', () => {
    expect(columnRows(pendulum(SET_GRID, { length: 6 }).frames[0], SET_GRID).flat()).toEqual(
      Array.from({ length: 12 }, () => 6),
    );
  });

  it('swings every column together when the length is 0', () => {
    const { frames } = pendulum(SET_GRID, { length: 0 });
    expect(frames).toHaveLength(40);
    expect(frames.every((f) => new Set(columnRows(f, SET_GRID).flat()).size === 1)).toBe(true);
  });

  it('sends one gentle wave along the row when the length is 1', () => {
    const { frames, durations } = pendulum(SET_GRID, { length: 1 });
    expect(frames).toHaveLength(40);
    expect(new Set(durations)).toEqual(new Set([60]));
    const frame = 7;
    const expected = Array.from({ length: SET_GRID.cols }, (_, c) => [
      Math.round(3 + 3 * Math.cos(2 * Math.PI * (frame / 40 - c / 12))),
    ]);
    expect(columnRows(frames[frame], SET_GRID)).toEqual(expected);
  });
});

describe('pendulum-sync', () => {
  const output = VARIANTS_A['pendulum-sync'](SET_GRID, {});

  it('holds a flat line on the middle row for 400 ms, then settles into the check and holds', () => {
    expect(columnRows(output.frames[0], SET_GRID).flat()).toEqual(Array.from({ length: 12 }, () => 3));
    expect(output.durations[0]).toBe(400);
    expect(lastFrame(output)).toEqual(glyphMask('check', SET_GRID));
    expect(output.durations[output.durations.length - 1]).toBe(1500);
  });
});

describe('pendulum-drop', () => {
  const output = VARIANTS_A['pendulum-drop'](SET_GRID, {});

  it('drops the columns from the middle line one by one, left first, and holds on the bottom row', () => {
    const bottomAt = Array.from({ length: SET_GRID.cols }, (_, x) =>
      output.frames.findIndex((frame) => litRowsInColumn(frame, SET_GRID, x)[0] === SET_GRID.rows - 1),
    );
    expect(columnRows(output.frames[0], SET_GRID).flat()).toEqual(Array.from({ length: 12 }, () => 3));
    expect(bottomAt.every((at, x) => x === 0 || at > bottomAt[x - 1])).toBe(true);
    expect(columnRows(lastFrame(output), SET_GRID).flat()).toEqual(Array.from({ length: 12 }, () => 6));
    expect(output.durations[output.durations.length - 1]).toBe(1500);
  });
});
