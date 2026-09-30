import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateEllipsis } from '../../../../src/core/recipes/ellipsis';
import { generateHop } from '../../../../src/core/recipes/hop';
import { generateMorph, morphMasks } from '../../../../src/core/recipes/resolve/morph';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit } from '../frame-text';
import { expectFlashSafe, expectWellFormed, gridsFrom, label, lastFrame } from './support-a';

const SET_GRID = { cols: 9, rows: 9 };
const STEPS = 6;
const STEP_MS = 60;
const SAMPLE_MS = 20;
const SHAKE_MS = 80;
const HOLD_MS = 1500;

function lastOf(frames: readonly Frame[]): Frame {
  return frames[frames.length - 1];
}

function hopEnd(grid: GridSize): Frame {
  return lastOf(generateHop(grid).frames);
}

function dots(grid: GridSize): Frame {
  return lastOf(generateEllipsis(grid).frames);
}

describe('resolve morph', () => {
  it.each(['check', 'sparkle', 'plus'] as const)('flies the last hop frame into %s and holds it', (glyph) => {
    gridsFrom(5).forEach((grid) => {
      const output = generateMorph(grid, { glyph });
      const name = `${glyph} ${label(grid)}`;
      expectWellFormed(output, grid, name);
      expect(output.frames[0], name).toEqual(hopEnd(grid));
      expect(lastFrame(output), name).toEqual(glyphMask(glyph, grid));
      const flight = output.durations.slice(0, -1);
      expect(
        flight.reduce((sum, ms) => sum + ms, 0),
        name,
      ).toBeLessThanOrEqual(STEPS * STEP_MS);
      expect(Math.min(...flight), name).toBeGreaterThanOrEqual(SAMPLE_MS);
      expect(output.durations[output.durations.length - 1], name).toBe(HOLD_MS);
      expect(
        output.frames.slice(1).every((frame, index) => frame.join('') !== output.frames[index].join('')),
        name,
      ).toBe(true);
      expectFlashSafe(output, false, name);
    });
  });

  it('shows several distinct eased frames between the hop and the check on the set grid', () => {
    const output = generateMorph(SET_GRID, { glyph: 'check' });

    expect(output.frames.length).toBeGreaterThanOrEqual(4);
    expect(output.durations[0]).toBeGreaterThan(output.durations[1]);
  });

  it('flies into the cross, then shakes it one column each way before it holds', () => {
    gridsFrom(7).forEach((grid) => {
      const output = generateMorph(grid, { glyph: 'cross' });
      const mask = glyphMask('cross', grid);
      expect(output.frames[0], label(grid)).toEqual(hopEnd(grid));
      expect(lastFrame(output), label(grid)).toEqual(mask);
      expect(output.durations.slice(-3), label(grid)).toEqual([SHAKE_MS, SHAKE_MS, HOLD_MS]);
      expect(output.frames.slice(-3).map(countLit), label(grid)).toEqual([1, 1, 1].map(() => countLit(mask)));
      expectFlashSafe(output, false, label(grid));
    });
  });

  it('flows the cross back into three dots for the retry glyph', () => {
    gridsFrom(5).forEach((grid) => {
      const output = generateMorph(grid, { glyph: 'ellipsis' });
      expect(output.frames[0], label(grid)).toEqual(glyphMask('cross', grid));
      expect(lastFrame(output), label(grid)).toEqual(dots(grid));
      expectFlashSafe(output, false, label(grid));
    });
  });

  it('eases from the source mask to the target in 6 steps, never lighting more dots than the larger mask', () => {
    const from = hopEnd(SET_GRID);
    const to = glyphMask('check', SET_GRID);
    const frames = morphMasks(SET_GRID, from, to);
    expect(frames).toHaveLength(STEPS + 1);
    expect(frames[0]).toEqual(from);
    expect(lastOf(frames)).toEqual(to);
    frames.forEach((frame) =>
      expect(countLit(frame)).toBeLessThanOrEqual(Math.max(countLit(from), countLit(to))),
    );
  });

  it('returns the target alone when either mask is empty', () => {
    const blank = glyphMask('check', SET_GRID).map(() => 0 as const);
    expect(morphMasks(SET_GRID, blank, glyphMask('check', SET_GRID))).toEqual([glyphMask('check', SET_GRID)]);
  });

  it('keeps the same frames on every call', () => {
    expect(generateMorph(SET_GRID, { glyph: 'check' })).toEqual(generateMorph(SET_GRID, { glyph: 'check' }));
  });

  it('runs on the smallest grids without throwing', () => {
    [3, 4].forEach((side) => {
      const grid = { cols: side, rows: side };
      expect(lastFrame(generateMorph(grid, {}))).toEqual(glyphMask('check', grid));
    });
  });

  it('rejects a glyph it cannot morph into', () => {
    expect(() => generateMorph(SET_GRID, { glyph: 'PLAN' })).toThrow(
      'flickering-dots resolve: glyph "PLAN" is not a morph glyph; use one of check, cross, sparkle, plus, ellipsis',
    );
  });
});
