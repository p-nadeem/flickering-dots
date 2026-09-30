import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { VARIANTS_A } from '../../../../src/core/recipes/arcade/variants-a';
import type { Frame, GridSize } from '../../../../src/core/types';

import { toOutputText } from '../frame-text';
import type { OutputText } from '../frame-text';
import { gridsFrom, label } from './arcade-checks';

const GRID = { cols: 9, rows: 5 };
const RALLY_MIN = { cols: 7, rows: 5 };
const GRIDS = gridsFrom(RALLY_MIN);

function isLit(frame: Frame, cols: number, x: number, y: number): boolean {
  return frame[y * cols + x] === 1;
}

function ballOf(frame: Frame, { cols, rows }: GridSize): [number, number] | null {
  const cells = Array.from(
    { length: cols * rows },
    (_, index) => [index % cols, Math.floor(index / cols)] as const,
  );
  const ball = cells.find(([x, y]) => x > 0 && x < cols - 1 && isLit(frame, cols, x, y));
  return ball ? [ball[0], ball[1]] : null;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const PINNED: Readonly<Record<string, OutputText>> = {
  rally: {
    frames: [
      '110000000 100000001 100000001 000000001 000000000',
      '000000000 101000001 100000001 100000001 000000000',
      '000000000 100000001 100100001 100000001 000000000',
      '000000000 100000001 100000001 100010001 000000000',
      '000000000 100000001 100000001 100000001 000001000',
      '000000000 100000001 100000001 100000101 000000000',
      '000000000 100000001 100000011 100000001 000000000',
      '000000000 000000101 100000001 100000001 100000000',
      '000001000 000000001 100000001 100000001 100000000',
      '000000000 000010001 100000001 100000001 100000000',
      '000000000 000000001 100100001 100000001 100000000',
      '000000000 000000001 100000001 101000001 100000000',
      '000000000 000000001 100000001 100000001 110000000',
      '000000000 100000001 100000001 101000001 000000000',
      '000000000 100000001 100100001 100000001 000000000',
      '000000000 100010001 100000001 100000001 000000000',
      '000001000 100000001 100000001 100000001 000000000',
      '000000000 100000101 100000001 100000001 000000000',
      '000000000 100000001 100000011 100000001 000000000',
      '100000000 100000001 100000001 000000101 000000000',
      '100000000 100000001 100000001 000000001 000001000',
      '100000000 100000001 100000001 000010001 000000000',
      '100000000 100000001 100100001 000000001 000000000',
      '100000000 101000001 100000001 000000001 000000000',
    ],
    durations: Array.from({ length: 24 }, () => 90),
  },
  'rally-serve': {
    frames: [
      '000000000 100000001 110000001 100000001 000000000',
      '000000000 110000001 100000001 100000001 000000000',
    ],
    durations: Array.from({ length: 2 }, () => 600),
  },
  'rally-wait': {
    frames: [
      '000000000 100000001 100000011 100000001 000000000',
      '000000000 100000001 100000001 100000001 000000000',
    ],
    durations: [400, 300],
  },
  'rally-rest': {
    frames: [
      '110000000 100000001 100000001 000000001 000000000',
      '000000000 101000001 100000001 100000001 000000000',
      '000000000 100000001 100100001 100000001 000000000',
      '000000000 100000001 100010001 100000001 000000000',
      '000000000 000000000 000000000 000000000 000000000',
      '000000000 000000000 000000000 001000000 000000000',
      '000000000 000000000 000000000 001000000 000100000',
      '000000000 000000000 000000000 001010000 000100000',
      '000000000 000000000 000001000 001010000 000100000',
      '000000000 000000100 000001000 001010000 000100000',
    ],
    durations: [90, 130, 170, 300, 80, 45, 45, 45, 45, 1500],
  },
  'rally-miss': {
    frames: [
      '100000000 110000001 100000001 000000001 000000000',
      '000000000 100000000 101000001 100000001 000000001',
      '000000000 100000000 100000001 100100001 000000001',
      '000000000 100000000 100000001 100000001 000010001',
      '000000000 100000000 100000001 100001001 000000001',
      '000000000 100000000 100000101 100000001 000000001',
      '000000000 100000010 100000001 100000001 000000001',
      '000000001 100000000 100000001 100000001 000000001',
      '000000000 100000000 100000001 100000001 000000001',
      '000000000 100000001 100000001 100000001 000000000',
      '000000000 100000000 100000001 100000001 000000001',
      '000000000 100000001 100000001 100000001 000000000',
      '000000000 100000000 100000001 100000001 000000001',
    ],
    durations: [90, 90, 90, 90, 90, 90, 90, 90, 200, 100, 100, 100, 600],
  },
};

describe('rally on its 9x5 grid', () => {
  it.each(Object.keys(PINNED))('keeps the approved %s frames', (variant) => {
    expect(toOutputText(VARIANTS_A[variant](GRID, { variant }), GRID.cols)).toEqual(PINNED[variant]);
  });
});

describe('rally variants', () => {
  it('meet the ball with a paddle at every return', () => {
    const misses = GRIDS.filter((grid) => {
      const { frames } = VARIANTS_A.rally(grid, { variant: 'rally' });
      return frames.some((frame) => {
        const ball = ballOf(frame, grid);
        if (ball === null) return true;
        const [x, y] = ball;
        if (x === 1) return !isLit(frame, grid.cols, 0, y);
        if (x === grid.cols - 2) return !isLit(frame, grid.cols, grid.cols - 1, y);
        return false;
      });
    });
    expect(misses.map(label)).toEqual([]);
  });

  it('loop over the least common multiple of the two bounce periods', () => {
    GRIDS.forEach((grid) => {
      const spanX = 2 * (grid.cols - 3);
      const spanY = 2 * (grid.rows - 1);
      const { frames } = VARIANTS_A.rally(grid, { variant: 'rally' });
      expect(frames).toHaveLength((spanX * spanY) / gcd(spanX, spanY));
    });
  });

  it('end the rest state on the shared check glyph', () => {
    GRIDS.forEach((grid) => {
      const { frames } = VARIANTS_A['rally-rest'](grid, { variant: 'rally-rest' });
      expect(frames[frames.length - 1]).toEqual(glyphMask('check', grid));
    });
  });

  it('let the ball leave the court on a miss', () => {
    GRIDS.forEach((grid) => {
      const { frames } = VARIANTS_A['rally-miss'](grid, { variant: 'rally-miss' });
      expect(ballOf(frames[frames.length - 1], grid)).toBeNull();
    });
  });
});
