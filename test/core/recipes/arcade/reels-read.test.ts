import { describe, expect, it } from 'vitest';

import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { GridSize } from '../../../../src/core/types';

import { frameText } from './arcade-b-checks';

const GRID: GridSize = { cols: 11, rows: 5 };
const EMPTY_ROW = '...........';

function play(variant: string) {
  return VARIANTS_B[variant](GRID, { variant });
}

function rowsOf(variant: string, index: number): string[] {
  return frameText(play(variant).frames[index], GRID.cols).split('|');
}

describe('reels show whole symbols when they stop', () => {
  it.each(['reels', 'reels-stagger', 'reels-rest'])('names a stopped still for %s', (variant) => {
    const { still } = play(variant);
    expect(still).toBeDefined();
    const rows = rowsOf(variant, still ?? 0);

    expect([rows[0], rows[GRID.rows - 1]]).toEqual([EMPTY_ROW, EMPTY_ROW]);
    expect(rows.slice(1, -1).join('')).toMatch(/#/);
  });

  it('droops the losing reels without fragments of the next symbols', () => {
    const { frames } = play('reels-lose');

    expect(rowsOf('reels-lose', frames.length - 1)[0]).toBe(EMPTY_ROW);
  });

  it('nudges the middle reel at rest without a stray dot above it', () => {
    play('reels-rest').frames.forEach((_, index) => expect(rowsOf('reels-rest', index)[0]).toBe(EMPTY_ROW));
  });
});
