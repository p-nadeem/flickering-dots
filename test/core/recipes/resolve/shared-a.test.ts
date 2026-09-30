import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import {
  easeInOut,
  joinOutputs,
  noiseFrame,
  readGlyph,
  RESULT_HOLD_MS,
  resultMask,
  resultTail,
} from '../../../../src/core/recipes/resolve/shared';

const GRID = { cols: 9, rows: 9 };

describe('resolve shared helpers', () => {
  it('falls back to the default glyph and names the allowed list when a glyph is unknown', () => {
    expect(readGlyph(undefined, ['check', 'cross'], 'rain', 'check')).toBe('check');
    expect(readGlyph('cross', ['check', 'cross'], 'rain', 'check')).toBe('cross');
    expect(() => readGlyph('heart', ['check'], 'rain', 'check')).toThrow(
      'flickering-dots resolve: glyph "heart" is not a rain glyph; use one of check',
    );
  });

  it('draws only the shared result glyphs', () => {
    expect(resultMask('plus', GRID)).toEqual(glyphMask('plus', GRID));
    expect(() => resultMask('ellipsis', GRID)).toThrow(
      'flickering-dots resolve: unknown result glyph "ellipsis"',
    );
  });

  it('holds a check, and shakes a cross only when it has a free column on each side', () => {
    const check = glyphMask('check', GRID);
    expect(resultTail(GRID, check, 'check')).toEqual({ frames: [check], durations: [RESULT_HOLD_MS] });
    expect(resultTail(GRID, glyphMask('cross', GRID), 'cross').frames).toHaveLength(3);
    const tight = { cols: 5, rows: 5 };
    expect(resultTail(tight, glyphMask('cross', tight), 'cross').frames).toHaveLength(1);
  });

  it('keeps noise the same for the same seed and slot', () => {
    expect(noiseFrame(GRID, 3, 1, 0.5)).toEqual(noiseFrame(GRID, 3, 1, 0.5));
    expect(noiseFrame(GRID, 3, 2, 0.5)).not.toEqual(noiseFrame(GRID, 3, 1, 0.5));
    expect(noiseFrame(GRID, 3, 1, 0).includes(1)).toBe(false);
  });

  it('eases from 0 to 1 through the midpoint and joins clips end to end', () => {
    expect([0, 0.5, 1].map(easeInOut)).toEqual([0, 0.5, 1]);
    const blank = glyphMask('check', GRID).map(() => 0 as const);
    expect(
      joinOutputs({ frames: [blank], durations: [10] }, { frames: [blank], durations: [20] }).durations,
    ).toEqual([10, 20]);
  });
});
