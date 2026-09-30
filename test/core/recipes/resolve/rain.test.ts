import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateRainReveal } from '../../../../src/core/recipes/resolve/rain';
import type { Frame } from '../../../../src/core/types';

import { countLit } from '../frame-text';
import { expectFlashSafe, expectWellFormed, gridsFrom, label, lastFrame } from './support-a';

const SET_GRID = { cols: 7, rows: 7 };
const STEP_MS = 60;
const SHAKE_MS = 80;
const HOLD_MS = 1500;
const GLYPHS = ['check', 'cross', 'sparkle'] as const;
const SET_FRAME_LIMIT = 24;
const LARGE_FRAME_LIMIT = 45;

function contains(outer: Frame, inner: Frame): boolean {
  return inner.every((bit, index) => bit === 0 || outer[index] === 1);
}

describe('resolve rain', () => {
  it.each(GLYPHS)('decodes %s at every grid from 5x5 to 16x16 and holds it', (glyph) => {
    gridsFrom(5).forEach((grid) => {
      const output = generateRainReveal(grid, { glyph });
      const name = `${glyph} ${label(grid)}`;
      expectWellFormed(output, grid, name);
      expect(lastFrame(output), name).toEqual(glyphMask(glyph, grid));
      expect(output.durations[output.durations.length - 1], name).toBe(HOLD_MS);
      expectFlashSafe(output, false, name);
    });
  });

  it('decodes the 7x7 check in about 20 frames of 60 ms', () => {
    const output = generateRainReveal(SET_GRID, { glyph: 'check' });
    expect(output.frames.length).toBeLessThanOrEqual(SET_FRAME_LIMIT);
    expect(output.durations.slice(0, -1).every((ms) => ms === STEP_MS)).toBe(true);
  });

  it('reveals within about 2.6 s of rain on the largest grid', () => {
    const output = generateRainReveal({ cols: 16, rows: 16 }, { glyph: 'check' });
    expect(output.frames.length).toBeLessThanOrEqual(LARGE_FRAME_LIMIT);
  });

  it('keeps every stuck dot lit once a stream has decoded it', () => {
    gridsFrom(5).forEach((grid) => {
      const mask = glyphMask('check', grid);
      const { frames } = generateRainReveal(grid, { glyph: 'check' });
      const stuckSoFar = frames.map((_, at) =>
        mask.map((bit, index) => (bit === 1 && frames.slice(0, at + 1).some((f) => f[index] === 1) ? 1 : 0)),
      );
      frames.slice(1).forEach((frame, at) => expect(contains(frame, stuckSoFar[at]), label(grid)).toBe(true));
    });
  });

  it('starts as rain, with streams in more than one column', () => {
    const { frames } = generateRainReveal(SET_GRID, { glyph: 'check' });
    const litColumns = new Set(frames[0].flatMap((bit, index) => (bit === 1 ? [index % SET_GRID.cols] : [])));
    expect(litColumns.size).toBeGreaterThan(1);
  });

  it('shakes the decoded cross one column right, then left, before it holds', () => {
    gridsFrom(7).forEach((grid) => {
      const output = generateRainReveal(grid, { glyph: 'cross' });
      const mask = glyphMask('cross', grid);
      const tail = output.frames.slice(-3);
      const shift = (dx: number): Frame =>
        mask.map((_, index) => {
          const x = index % grid.cols;
          const from = x - dx;
          return from >= 0 && from < grid.cols ? mask[index - dx] : 0;
        });
      expect(tail, label(grid)).toEqual([shift(1), shift(-1), mask]);
      expect(output.durations.slice(-3), label(grid)).toEqual([SHAKE_MS, SHAKE_MS, HOLD_MS]);
      expect(countLit(tail[0]), label(grid)).toBe(countLit(mask));
    });
  });

  it('keeps the same frames for the same seed and changes them for another seed', () => {
    const first = generateRainReveal(SET_GRID, { glyph: 'check', seed: 3 });
    expect(generateRainReveal(SET_GRID, { glyph: 'check', seed: 3 })).toEqual(first);
    expect(generateRainReveal(SET_GRID, { glyph: 'check', seed: 4 }).frames).not.toEqual(first.frames);
  });

  it('runs on the smallest grids without throwing', () => {
    [3, 4].forEach((side) => {
      const grid = { cols: side, rows: side };
      expect(lastFrame(generateRainReveal(grid, {}))).toEqual(glyphMask('check', grid));
    });
  });

  it('rejects a glyph it cannot decode', () => {
    expect(() => generateRainReveal(SET_GRID, { glyph: 'heart' })).toThrow(
      'flickering-dots resolve: glyph "heart" is not a rain glyph; use one of check, cross, sparkle, plus',
    );
  });
});
