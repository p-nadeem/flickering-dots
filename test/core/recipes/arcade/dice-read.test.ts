import { describe, expect, it } from 'vitest';

import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import { MAX_BIG_CHANGES_PER_SECOND, peakBigChanges } from '../flash-budget';
import { allFrameTexts, frameText } from './arcade-b-checks';

const GRID: GridSize = { cols: 7, rows: 7 };
const FACE_ONE = '.......|.......|.......|...#...|.......|.......|.......';
const FACE_ONE_MS = 250;
const MAX_ROLL_MS = 120;

function play(variant: string, params: RecipeParams = {}, grid: GridSize = GRID) {
  return VARIANTS_B[variant](grid, { variant, ...params });
}

describe('dice faces read at 7x7', () => {
  it('lands six as two spaced columns of three pips', () => {
    const { frames } = play('dice', { glyph: 'six' });

    expect(frameText(frames[frames.length - 1], GRID.cols)).toBe(
      '.......|.#...#.|.......|.#...#.|.......|.#...#.|.......',
    );
  });

  it('never flashes an X between the landing faces', () => {
    const texts = allFrameTexts(play('dice', { glyph: 'six' }), GRID.cols);

    expect(texts).not.toContain('#######|#.....#|#.#.#.#|#..#..#|#.#.#.#|#.....#|#######');
  });

  it('shows face one centred for 250 ms before the error shake, and never rests idle on it', () => {
    const error = play('dice', { glyph: 'one' });
    const texts = allFrameTexts(error, GRID.cols);
    const landed = texts.indexOf(FACE_ONE);
    const idle = allFrameTexts(play('dice-rest'), GRID.cols);

    expect(landed).toBeGreaterThan(0);
    expect(error.durations[landed]).toBeGreaterThanOrEqual(FACE_ONE_MS);
    expect(texts[landed + 1]).not.toBe(FACE_ONE);
    expect(idle).not.toContain(texts[texts.length - 1]);
  });

  it('rolls at 120 ms a frame or faster and stays within the flash budget', () => {
    const output = play('dice');

    expect(Math.min(...output.durations)).toBeLessThanOrEqual(MAX_ROLL_MS);
    expect(peakBigChanges(output, GRID, true)).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_SECOND);
  });
});
