import { describe, expect, it } from 'vitest';

import { GLYPH_NAMES, glyphMask, isGlyphName } from '../../src/core/glyphs';
import { generateCheck } from '../../src/core/recipes/check';
import { generateCross } from '../../src/core/recipes/cross';
import type { Frame, GridSize } from '../../src/core/types';

import { toFrameText } from './recipes/frame-text';
import { ALL_GRIDS, boundingBox, labelled, litCells } from './recipes/result-geometry';

const SYMMETRIC_GLYPHS = ['cross', 'sparkle', 'plus'] as const;

function lastFrame(frames: readonly Frame[]): Frame {
  return frames[frames.length - 1];
}

function mirrorX(frame: Frame, { cols, rows }: GridSize): Frame {
  return Array.from({ length: cols * rows }, (_, index) => {
    const x = index % cols;
    const y = Math.floor(index / cols);
    return frame[y * cols + (cols - 1 - x)];
  });
}

function transpose(frame: Frame, { cols, rows }: GridSize): Frame {
  return Array.from(
    { length: cols * rows },
    (_, index) => frame[(index % cols) * cols + Math.floor(index / cols)],
  );
}

function glyphText(name: (typeof GLYPH_NAMES)[number], grid: GridSize): string {
  return toFrameText(glyphMask(name, grid), grid.cols);
}

describe('glyphMask', () => {
  it('lists the four shared glyphs', () => {
    expect(GLYPH_NAMES).toEqual(['check', 'cross', 'sparkle', 'plus']);
    expect(isGlyphName('sparkle')).toBe(true);
    expect(isGlyphName('toString')).toBe(false);
  });

  it.each(labelled(ALL_GRIDS))('matches the final check and cross recipe frames on %s', (_, grid) => {
    expect(glyphMask('check', grid)).toEqual(lastFrame(generateCheck(grid).frames));
    expect(glyphMask('cross', grid)).toEqual(lastFrame(generateCross(grid).frames));
  });

  it('draws the plus in the result square and the sparkle across the short side', () => {
    expect(glyphText('plus', { cols: 7, rows: 7 })).toBe(
      '0000000 0001000 0001000 0111110 0001000 0001000 0000000',
    );
    expect(glyphText('sparkle', { cols: 7, rows: 7 })).toBe(
      '0001000 0001000 0011100 1111111 0011100 0001000 0001000',
    );
    expect(glyphText('sparkle', { cols: 5, rows: 5 })).toBe('00100 01110 11111 01110 00100');
    expect(glyphText('sparkle', { cols: 3, rows: 3 })).toBe('010 111 010');
  });

  it('doubles the centre lines when the glyph square is even', () => {
    expect(glyphText('sparkle', { cols: 6, rows: 6 })).toBe('001100 001100 111111 111111 001100 001100');
    expect(glyphText('sparkle', { cols: 8, rows: 8 })).toBe(
      '00011000 00011000 00111100 11111111 11111111 00111100 00011000 00011000',
    );
    expect(glyphText('plus', { cols: 8, rows: 8 })).toBe(
      '00000000 00011000 00011000 01111110 01111110 00011000 00011000 00000000',
    );
  });

  it.each(labelled(ALL_GRIDS))('lights every glyph and keeps it inside the grid on %s', (_, grid) => {
    GLYPH_NAMES.forEach((name) => {
      const mask = glyphMask(name, grid);
      expect(mask, name).toHaveLength(grid.cols * grid.rows);
      expect(
        mask.some((bit) => bit === 1),
        name,
      ).toBe(true);
    });
  });

  it.each(labelled(ALL_GRIDS.filter(({ cols, rows }) => cols === rows)))(
    'keeps the cross, sparkle and plus symmetric and centred on %s',
    (_, grid) => {
      SYMMETRIC_GLYPHS.forEach((name) => {
        const mask = glyphMask(name, grid);
        const box = boundingBox(litCells(mask, grid.cols));
        expect(mirrorX(mask, grid), name).toEqual(mask);
        expect(transpose(mask, grid), name).toEqual(mask);
        expect(box.left, name).toBe(grid.cols - box.left - box.width);
      });
    },
  );

  it.each(labelled(ALL_GRIDS.filter(({ cols, rows }) => cols !== rows)))(
    'centres the sparkle and plus to within half a dot on %s',
    (_, grid) => {
      (['sparkle', 'plus'] as const).forEach((name) => {
        const box = boundingBox(litCells(glyphMask(name, grid), grid.cols));
        expect(Math.abs(box.left - (grid.cols - box.left - box.width)), name).toBeLessThanOrEqual(1);
        expect(Math.abs(box.top - (grid.rows - box.top - box.height)), name).toBeLessThanOrEqual(1);
      });
    },
  );

  it('returns a fresh mask on every call', () => {
    const grid = { cols: 7, rows: 7 };
    expect(glyphMask('check', grid)).not.toBe(glyphMask('check', grid));
  });

  it('rejects an unknown glyph and an invalid grid with a readable error', () => {
    const parse = (text: string): (typeof GLYPH_NAMES)[number] => JSON.parse(text);
    expect(() => glyphMask(parse('"heart"'), { cols: 7, rows: 7 })).toThrow(
      'flickering-dots glyphMask: unknown glyph "heart"; use one of check, cross, sparkle, plus',
    );
    expect(() => glyphMask('plus', { cols: 2, rows: 7 })).toThrow(
      'grid.cols must be a whole number from 3 to 16',
    );
  });
});
