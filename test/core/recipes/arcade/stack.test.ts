import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { VARIANTS_A } from '../../../../src/core/recipes/arcade/variants-a';
import {
  getStackScript,
  placementPoints,
  playPlacements,
} from '../../../../src/core/recipes/arcade/stack-script';
import type { Point } from '../../../../src/core/recipes/helpers';

import { countLit, toOutputText } from '../frame-text';
import type { OutputText } from '../frame-text';
import { gridsFrom, label } from './arcade-checks';

const GRID = { cols: 6, rows: 8 };
const STACK_MIN = { cols: 4, rows: 6 };
const GRIDS = gridsFrom(STACK_MIN);

function keys(points: readonly Point[]): string[] {
  return points.map(([x, y]) => `${x},${y}`);
}

const PINNED: Readonly<Record<string, OutputText>> = {
  stack: {
    frames: [
      '010000 011100 000000 000000 000000 000000 000000 000000',
      '000000 100000 111000 000000 000000 000000 000000 000000',
      '000000 000000 100000 111000 000000 000000 000000 000000',
      '000000 000000 000000 100000 111000 000000 000000 000000',
      '000000 000000 000000 000000 100000 111000 000000 000000',
      '000000 000000 000000 000000 000000 100000 111000 000000',
      '000000 000000 000000 000000 000000 000000 100000 111000',
      '000100 011100 000000 000000 000000 000000 100000 111000',
      '000000 000010 001110 000000 000000 000000 100000 111000',
      '000000 000000 000001 000111 000000 000000 100000 111000',
      '000000 000000 000000 000001 000111 000000 100000 111000',
      '000000 000000 000000 000000 000001 000111 100000 111000',
      '000000 000000 000000 000000 000000 000001 100111 111000',
      '000000 000000 000000 000000 000000 000000 100001 111111',
      '011110 000000 000000 000000 000000 000000 100001 111111',
      '000000 011110 000000 000000 000000 000000 100001 111111',
      '000000 000000 011110 000000 000000 000000 100001 111111',
      '000000 000000 000000 011110 000000 000000 100001 111111',
      '000000 000000 000000 000000 011110 000000 100001 111111',
      '000000 000000 000000 000000 000000 011110 100001 111111',
      '000000 000000 000000 000000 000000 000000 111111 111111',
      '000000 000000 000000 000000 000000 000000 000000 000000',
      '000000 000000 000000 000000 000000 000000 111111 111111',
      '000000 000000 000000 000000 000000 000000 000000 000000',
      '000000 000000 000000 000000 000000 000000 111111 111111',
      '000000 000000 000000 000000 000000 000000 000000 000000',
    ],
    durations: [
      70, 70, 70, 70, 70, 70, 160, 70, 70, 70, 70, 70, 70, 160, 70, 70, 70, 70, 70, 70, 160, 200, 200, 200,
      200, 300,
    ],
  },
  'stack-rest': {
    frames: [
      '000000 000000 000000 000000 000000 000000 100001 111111',
      '000000 000000 000000 000000 000000 000000 100000 111000',
    ],
    durations: [900, 300],
  },
  'stack-progress': {
    frames: [
      '000000 000000 000000 000000 000000 000000 000000 101111',
      '000000 000000 000000 000000 000000 000000 111011 101111',
      '000000 000000 000000 000000 000000 111110 111011 101111',
      '000000 000000 000000 000000 101111 111110 111011 101111',
      '000000 000000 000000 111011 101111 111110 111011 101111',
      '000000 000000 111110 111011 101111 111110 111011 101111',
      '000000 101111 111110 111011 101111 111110 111011 101111',
      '111011 101111 111110 111011 101111 111110 111011 101111',
      '000000 101111 111110 111011 101111 111110 111011 101111',
      '000000 000000 111110 111011 101111 111110 111011 101111',
      '000000 000000 000000 111011 101111 111110 111011 101111',
      '000000 000000 000000 000000 101111 111110 111011 101111',
      '000000 000000 000000 000000 000000 111110 111011 101111',
      '000000 000000 000000 000000 000000 000000 111011 101111',
      '000000 000000 000000 000000 000000 000000 000000 101111',
      '000000 000000 000000 000000 000000 000000 000000 000000',
    ],
    durations: [300, 300, 300, 300, 300, 300, 300, 700, 80, 80, 80, 80, 80, 80, 80, 400],
  },
  'stack-done': {
    frames: [
      '000001 000001 000001 000001 111110 111110 111110 111110',
      '000000 000001 000001 000001 111111 111110 111110 111110',
      '000000 000000 000001 000001 111111 111111 111110 111110',
      '000000 000000 000000 000001 111111 111111 111111 111110',
      '000000 000000 000000 000000 111111 111111 111111 111111',
      '000000 000000 000000 000000 111111 111111 111111 000000',
      '000000 000000 000000 000000 111111 111111 000000 000000',
      '000000 000000 000000 000000 111111 000000 000000 000000',
      '000000 000000 000000 000000 000000 000000 000000 000000',
      '000000 000000 000000 000000 010000 000000 000000 000000',
      '000000 000000 000000 000000 010000 001000 000000 000000',
      '000000 000000 000000 000000 010100 001000 000000 000000',
      '000000 000000 000000 000010 010100 001000 000000 000000',
      '000000 000000 000001 000010 010100 001000 000000 000000',
    ],
    durations: [70, 70, 70, 70, 160, 80, 80, 80, 160, 45, 45, 45, 45, 1500],
  },
  'stack-topout': {
    frames: [
      '001100 001100 000000 000000 101111 111110 111011 101111',
      '000000 001100 001100 000000 101111 111110 111011 101111',
      '000000 000000 001100 001100 101111 111110 111011 101111',
      '001100 001100 001100 001100 101111 111110 111011 101111',
      '000000 000000 000000 000000 000000 000000 000000 000000',
      '001100 001100 001100 001100 101111 111110 111011 101111',
      '000000 000000 000000 000000 000000 000000 000000 000000',
      '001100 001100 001100 001100 101111 111110 111011 101111',
    ],
    durations: [70, 70, 160, 300, 250, 250, 250, 600],
  },
};

describe('stack-clear on its 6x8 grid', () => {
  it.each(Object.keys(PINNED))('keeps the approved %s frames', (variant) => {
    expect(toOutputText(VARIANTS_A[variant](GRID, { variant }), GRID.cols)).toEqual(PINNED[variant]);
  });
});

describe('stack pieces', () => {
  it('tile exactly the rows they clear, 2 rows on even widths and 4 on odd ones', () => {
    const broken = GRIDS.filter((grid) => {
      const { placements, clearRows } = getStackScript(grid);
      const cells = keys(placements.flatMap(placementPoints));
      const expected = clearRows.flatMap((y) => Array.from({ length: grid.cols }, (_, x) => `${x},${y}`));
      const rowCount = grid.cols % 2 === 0 ? 2 : 4;
      return (
        clearRows.length !== rowCount ||
        new Set(cells).size !== cells.length ||
        [...cells].sort().join() !== [...expected].sort().join()
      );
    });
    expect(broken.map(label)).toEqual([]);
  });

  it('never fall through the stack', () => {
    const broken = GRIDS.filter((grid) => {
      const { steps } = playPlacements(grid, [], getStackScript(grid).placements);
      return steps.some(({ points }) => new Set(keys(points)).size !== points.length);
    });
    expect(broken.map(label)).toEqual([]);
  });
});

describe('stack variants', () => {
  it('blink the full rows off and on twice, then hold an empty grid', () => {
    const { frames, durations } = VARIANTS_A.stack(GRID, { variant: 'stack' });
    expect(durations.slice(-5)).toEqual([200, 200, 200, 200, 300]);
    expect(frames.slice(-5).map(countLit)).toEqual([0, 12, 0, 12, 0]);
  });

  it('grow the progress stack a row at a time without ever completing a row, then wipe it from the top', () => {
    GRIDS.forEach((grid) => {
      const { frames } = VARIANTS_A['stack-progress'](grid, { variant: 'stack-progress' });
      expect(frames.map(countLit)).toEqual([
        ...Array.from({ length: grid.rows }, (_, index) => (index + 1) * (grid.cols - 1)),
        ...Array.from({ length: grid.rows }, (_, row) => (grid.rows - 1 - row) * (grid.cols - 1)),
      ]);
    });
  });

  it('pile the top-out to the top row and end on the frozen stack', () => {
    GRIDS.forEach((grid) => {
      const { frames } = VARIANTS_A['stack-topout'](grid, { variant: 'stack-topout' });
      const last = frames[frames.length - 1];
      expect(last.slice(0, grid.cols).some((bit) => bit === 1)).toBe(true);
    });
  });

  it('fill every row of the stack, wipe it away, then draw the check', () => {
    GRIDS.forEach((grid) => {
      const { frames } = VARIANTS_A['stack-done'](grid, { variant: 'stack-done' });
      expect(Math.max(...frames.map(countLit))).toBe(4 * grid.cols);
      expect(frames[frames.length - 1]).toEqual(glyphMask('check', grid));
    });
  });
});
