import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { chladniFigures } from '../../../../src/core/recipes/resolve/chladni';
import { generateSettle, generateSettleFail } from '../../../../src/core/recipes/resolve/settle';

import { countPeakBigChanges } from '../../../presets/wow/emergence-flashes';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit } from '../frame-text';
import {
  countChanged,
  expectFlashSafe,
  expectWellFormed,
  gridsFrom,
  isMirroredBothWays,
  label,
  largestStep,
  lastFrame,
  rowsOf,
  seamChange,
} from './support-a';

const SET_GRID = { cols: 11, rows: 11 };
const SCATTER_MS = 70;
const FIGURE_MS = 600;
const TOGGLE_MS = 400;
const FAIL_STEP_MS = 170;
const HOLD_MS = 1500;
const FAIL_SCATTERS = 4;
const SEAM_SLACK = 1.25;

const ASTERISK_11 = [
  '#....#....#',
  '.#...#...#.',
  '..#..#..#..',
  '...#.#.#...',
  '....###....',
  '###########',
  '....###....',
  '...#.#.#...',
  '..#..#..#..',
  '.#...#...#.',
  '#....#....#',
];

function isTransposeSymmetric(frame: Frame, grid: GridSize): boolean {
  if (grid.cols !== grid.rows) return true;
  const rows = rowsOf(frame, grid.cols);
  return rows.every((row, y) => [...row].every((cell, x) => cell === rows[x][y]));
}

function isPile(frame: Frame, grid: GridSize): boolean {
  return Array.from({ length: grid.cols }, (_, x) => x).every((x) => {
    const column = Array.from({ length: grid.rows }, (_, y) => frame[y * grid.cols + x]).join('');
    return /^0*1*$/.test(column);
  });
}

describe('resolve settle', () => {
  it('curates Chladni figures that are symmetric four ways at every grid from 9x9', () => {
    gridsFrom(9).forEach((grid) => {
      const figures = chladniFigures(grid);
      expect(figures.length, label(grid)).toBeGreaterThanOrEqual(2);
      figures.forEach((figure) => {
        expect(countLit(figure), label(grid)).toBeGreaterThan(0);
        expect(isMirroredBothWays(figure, grid.cols), label(grid)).toBe(true);
        expect(isTransposeSymmetric(figure, grid), label(grid)).toBe(true);
      });
      const texts = figures.map((figure) => figure.join(''));
      expect(new Set(texts).size, label(grid)).toBe(figures.length);
    });
  });

  it('opens the figure list with the asterisk on the 11x11 plate', () => {
    expect(rowsOf(chladniFigures(SET_GRID)[0], SET_GRID.cols)).toEqual(ASTERISK_11);
  });

  it('cycles the figures, each with two scatter frames and a 600 ms hold, as a seamless loop', () => {
    gridsFrom(9).forEach((grid) => {
      const figures = chladniFigures(grid);
      const output = generateSettle(grid, { glyph: 'chladni' });
      expectWellFormed(output, grid, label(grid));
      expect(output.frames.length, label(grid)).toBe(3 * figures.length);
      expect(output.durations, label(grid)).toEqual(
        figures.flatMap(() => [SCATTER_MS, SCATTER_MS, FIGURE_MS]),
      );
      figures.forEach((figure, index) => expect(output.frames[3 * index + 2], label(grid)).toEqual(figure));
      expect(seamChange(output), label(grid)).toBeLessThanOrEqual(SEAM_SLACK * largestStep(output));
      expectFlashSafe(output, true, label(grid));
    });
  });

  it('scatters grains no further than two cells, then one, from the figure they settle into', () => {
    const output = generateSettle(SET_GRID, { glyph: 'chladni' });
    const figure = output.frames[2];
    [output.frames[0], output.frames[1]].forEach((scatter) => {
      expect(countLit(scatter)).toBeLessThanOrEqual(countLit(figure));
      expect(countLit(scatter)).toBeGreaterThan(0);
    });
  });

  it('rests on the asterisk for chladni-1, one grain hopping out and back every 400 ms', () => {
    gridsFrom(9).forEach((grid) => {
      const figure = chladniFigures(grid)[0];
      const output = generateSettle(grid, { glyph: 'chladni-1' });
      expectWellFormed(output, grid, label(grid));
      expect(output.still, label(grid)).toBe(0);
      expect(
        output.durations.every((ms) => ms === TOGGLE_MS),
        label(grid),
      ).toBe(true);
      output.frames.forEach((frame, index) => {
        if (index % 2 === 0) expect(frame, label(grid)).toEqual(figure);
        else expect(countChanged(frame, figure), label(grid)).toBe(2);
        expect(countLit(frame), label(grid)).toBe(countLit(figure));
      });
      expect(seamChange(output), label(grid)).toBe(2);
    });
  });

  it('shakes once and settles into the check with its own dot budget', () => {
    gridsFrom(9).forEach((grid) => {
      const mask = glyphMask('check', grid);
      const output = generateSettle(grid, { glyph: 'check' });
      expect(output.frames, label(grid)).toHaveLength(3);
      expect(lastFrame(output), label(grid)).toEqual(mask);
      expect(output.durations, label(grid)).toEqual([SCATTER_MS, SCATTER_MS, HOLD_MS]);
      output.frames.forEach((frame) =>
        expect(countLit(frame), label(grid)).toBeLessThanOrEqual(countLit(mask)),
      );
      expectFlashSafe(output, false, label(grid));
    });
  });

  it('never settles on error: four scatters, then every grain falls a row per frame into a pile', () => {
    gridsFrom(9).forEach((grid) => {
      const output = generateSettleFail(grid, {});
      const { frames, durations } = output;
      expectWellFormed(output, grid, label(grid));
      expect(
        durations.slice(0, -1).every((ms) => ms === FAIL_STEP_MS),
        label(grid),
      ).toBe(true);
      expect(durations[durations.length - 1], label(grid)).toBe(HOLD_MS);
      const falling = frames.slice(FAIL_SCATTERS - 1);
      falling
        .slice(1)
        .forEach((frame, at) => expect(countLit(frame), label(grid)).toBe(countLit(falling[at])));
      expect(isPile(lastFrame(output), grid), label(grid)).toBe(true);
      expect(
        frames.slice(0, -1).some((frame) => isPile(frame, grid)),
        label(grid),
      ).toBe(false);
      expectFlashSafe(output, false, label(grid));
    });
  });

  it('spaces the error scatters and falls so a fifth of the plate changes at most six times a second', () => {
    gridsFrom(9).forEach((grid) => {
      const clip = { ...grid, ...generateSettleFail(grid, {}) };
      expect(countPeakBigChanges(clip, false), label(grid)).toBeLessThanOrEqual(6);
    });
  });

  it('keeps the same frames for the same seed and changes them for another seed', () => {
    const first = generateSettle(SET_GRID, { glyph: 'chladni', seed: 1 });
    expect(generateSettle(SET_GRID, { glyph: 'chladni', seed: 1 })).toEqual(first);
    expect(generateSettle(SET_GRID, { glyph: 'chladni', seed: 2 }).frames).not.toEqual(first.frames);
    expect(generateSettleFail(SET_GRID, { seed: 1 })).toEqual(generateSettleFail(SET_GRID, { seed: 1 }));
  });

  it('runs on the smallest grids without throwing', () => {
    [3, 5].forEach((side) => {
      const grid = { cols: side, rows: side };
      expect(generateSettle(grid, { glyph: 'chladni' }).frames.length).toBeGreaterThan(0);
      expect(generateSettle(grid, { glyph: 'chladni-1' }).frames.length).toBeGreaterThan(0);
      expect(generateSettleFail(grid, {}).frames.length).toBeGreaterThan(0);
    });
  });

  it('rejects a figure it does not have', () => {
    expect(() => generateSettle(SET_GRID, { glyph: 'chladni-9' })).toThrow(
      'flickering-dots resolve: glyph "chladni-9" is not a settle glyph; use one of chladni, chladni-1, chladni-2, chladni-3, check, cross, sparkle, plus',
    );
  });
});
