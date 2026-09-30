import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import {
  generateFlap,
  generateFlapBand,
  generateFlapRest,
  generateFlapRtl,
} from '../../../../src/core/recipes/resolve/flap';
import type { Frame, GridSize } from '../../../../src/core/types';

import {
  countChanged,
  expectFlashSafe,
  expectWellFormed,
  gridsFrom,
  label,
  largestStep,
  lastFrame,
  seamChange,
} from './support-a';

const SET_GRID = { cols: 9, rows: 9 };
const LAG = 3;
const STEP_MS = 60;
const HOLD_MS = 1500;
const REST_PERIOD_MS = 4000;

function columnOf(frame: Frame, grid: GridSize, x: number): number[] {
  return Array.from({ length: grid.rows }, (_, y) => frame[y * grid.cols + x]);
}

function changedColumns(a: Frame, b: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, (_, x) => x).filter(
    (x) => columnOf(a, grid, x).join('') !== columnOf(b, grid, x).join(''),
  );
}

function litColumns(frame: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, (_, x) => x).filter((x) => columnOf(frame, grid, x).includes(1));
}

describe('resolve flap', () => {
  it('locks columns left to right three frames behind the flutter and holds the glyph', () => {
    gridsFrom(5).forEach((grid) => {
      const mask = glyphMask('check', grid);
      const output = generateFlap(grid, { glyph: 'check' });
      expectWellFormed(output, grid, label(grid));
      expect(output.frames.length, label(grid)).toBe(grid.cols + LAG);
      output.frames.forEach((frame, index) => {
        const k = index + 1;
        Array.from({ length: grid.cols }, (_, x) => x).forEach((x) => {
          const column = columnOf(frame, grid, x);
          if (x < k - LAG) expect(column, `${label(grid)} k${k} x${x}`).toEqual(columnOf(mask, grid, x));
          if (x >= k) expect(column.includes(1), `${label(grid)} k${k} x${x}`).toBe(false);
        });
      });
      expect(lastFrame(output), label(grid)).toEqual(mask);
      expect(output.durations, label(grid)).toEqual([
        ...output.durations.slice(0, -1).map(() => STEP_MS),
        HOLD_MS,
      ]);
      expectFlashSafe(output, false, label(grid));
    });
  });

  it('locks right to left for flap-rtl', () => {
    gridsFrom(5).forEach((grid) => {
      const mask = glyphMask('cross', grid);
      const output = generateFlapRtl(grid, { glyph: 'cross' });
      output.frames.forEach((frame, index) => {
        const k = index + 1;
        Array.from({ length: grid.cols }, (_, x) => x).forEach((x) => {
          const order = grid.cols - 1 - x;
          const column = columnOf(frame, grid, x);
          if (order < k - LAG) expect(column, `${label(grid)} k${k} x${x}`).toEqual(columnOf(mask, grid, x));
          if (order >= k) expect(column.includes(1), `${label(grid)} k${k} x${x}`).toBe(false);
        });
      });
      expect(lastFrame(output), label(grid)).toEqual(mask);
      expectFlashSafe(output, false, label(grid));
    });
  });

  it('keeps noise the same inside each 120 ms slot', () => {
    const { frames } = generateFlap(SET_GRID, { glyph: 'check' });
    expect(columnOf(frames[2], SET_GRID, 2)).toEqual(columnOf(frames[3], SET_GRID, 2));
  });

  it('sweeps a three-column band of flutter that never completes, as a seamless loop', () => {
    gridsFrom(5).forEach((grid) => {
      const output = generateFlapBand(grid, {});
      expectWellFormed(output, grid, label(grid));
      expect(output.frames.length, label(grid)).toBe(grid.cols + LAG - 1);
      expect(
        output.durations.every((ms) => ms === STEP_MS),
        label(grid),
      ).toBe(true);
      output.frames.forEach((frame, index) => {
        const columns = litColumns(frame, grid);
        const k = index + 1;
        columns.forEach((x) => expect(x >= k - LAG && x < k, `${label(grid)} k${k} x${x}`).toBe(true));
      });
      expect(seamChange(output), label(grid)).toBeLessThanOrEqual(largestStep(output));
      expectFlashSafe(output, true, label(grid));
    });
  });

  it('rests on the glyph and flutters one column every 4 s', () => {
    gridsFrom(5).forEach((grid) => {
      const mask = glyphMask('sparkle', grid);
      const output = generateFlapRest(grid, { glyph: 'sparkle' });
      expectWellFormed(output, grid, label(grid));
      expect(output.frames[0], label(grid)).toEqual(mask);
      expect(output.still, label(grid)).toBe(0);
      const total = output.durations.reduce((sum, ms) => sum + ms, 0);
      expect(total % REST_PERIOD_MS, label(grid)).toBe(0);
      output.frames.forEach((frame) => {
        expect(changedColumns(frame, mask, grid).length, label(grid)).toBeLessThanOrEqual(1);
      });
      expect(changedColumns(lastFrame(output), mask, grid).length, label(grid)).toBe(1);
      expect(countChanged(lastFrame(output), output.frames[0]), label(grid)).toBeLessThanOrEqual(grid.rows);
      expectFlashSafe(output, true, label(grid));
    });
  });

  it('keeps the same frames for the same seed and changes them for another seed', () => {
    const first = generateFlapBand(SET_GRID, { seed: 2 });
    expect(generateFlapBand(SET_GRID, { seed: 2 })).toEqual(first);
    expect(generateFlapBand(SET_GRID, { seed: 5 }).frames).not.toEqual(first.frames);
    expect(generateFlap(SET_GRID, { seed: 2, glyph: 'check' })).toEqual(
      generateFlap(SET_GRID, { seed: 2, glyph: 'check' }),
    );
  });

  it('flutters at the density it is given', () => {
    const sparse = generateFlapBand(SET_GRID, { density: 0.1 });
    const dense = generateFlapBand(SET_GRID, { density: 0.9 });
    const lit = (frames: readonly Frame[]) => frames.flat().filter((bit) => bit === 1).length;
    expect(lit(dense.frames)).toBeGreaterThan(lit(sparse.frames));
  });

  it('runs on the smallest grids without throwing', () => {
    [3, 4].forEach((side) => {
      const grid = { cols: side, rows: side };
      expect(lastFrame(generateFlap(grid, {}))).toEqual(glyphMask('check', grid));
      expect(generateFlapBand(grid, {}).frames.length).toBe(side + LAG - 1);
    });
  });

  it('rejects a glyph it cannot flip to', () => {
    expect(() => generateFlap(SET_GRID, { glyph: 'chladni' })).toThrow(
      'flickering-dots resolve: glyph "chladni" is not a flap glyph; use one of check, cross, sparkle, plus',
    );
  });
});
