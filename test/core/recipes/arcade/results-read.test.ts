import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { VARIANTS_A } from '../../../../src/core/recipes/arcade/variants-a';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countChanged, countLit } from './arcade-b-checks';

const STACK: GridSize = { cols: 6, rows: 8 };
const SNAKE: GridSize = { cols: 8, rows: 8 };
const BIG_SHARE = 0.2;
const RESULT_HOLD_MS = 1500;

function play(variant: string, grid: GridSize) {
  return VARIANTS_A[variant](grid, { variant });
}

function last<T>(items: readonly T[]): T {
  return items[items.length - 1];
}

function fullRows(frame: Frame, { cols, rows }: GridSize): number {
  return Array.from({ length: rows }, (_, y) => frame.slice(y * cols, (y + 1) * cols)).filter((row) =>
    row.every((bit) => bit === 1),
  ).length;
}

describe('arcade result states end on a mark', () => {
  it('stack-done draws the check after the wipe', () => {
    const { frames } = play('stack-done', STACK);

    expect(last(frames)).toEqual(glyphMask('check', STACK));
  });

  it('hunt-fill drains around the check and leaves it', () => {
    const { frames } = play('hunt-fill', SNAKE);

    expect(last(frames)).toEqual(glyphMask('check', SNAKE));
  });

  it('hunt-crash keeps the crashed snake on the grid and holds it', () => {
    const { frames, durations } = play('hunt-crash', SNAKE);

    expect(countLit(last(frames))).toBeGreaterThan(1);
    expect(last(durations)).toBeGreaterThanOrEqual(RESULT_HOLD_MS);
  });
});

describe('stack loops read as the game', () => {
  it('rests idle before the clearing piece lands, so the clearing rows are never all full', () => {
    play('stack-rest', STACK).frames.forEach((frame) => expect(fullRows(frame, STACK)).toBeLessThan(2));
  });

  it('empties the progress stack without a single big cut', () => {
    const { frames } = play('stack-progress', STACK);

    frames.forEach((frame, index) => {
      const next = frames[(index + 1) % frames.length];
      expect(countChanged(frame, next)).toBeLessThan(BIG_SHARE * STACK.cols * STACK.rows);
    });
  });
});
