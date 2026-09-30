import { describe, expect, it } from 'vitest';

import { BOUNCE_DEFAULTS, generateBounce } from '../../../src/core/recipes/bounce';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toOutputText } from './frame-text';

type Cell = readonly [x: number, y: number];

const FRAME_MS = 85;

const GRIDS: readonly GridSize[] = [
  { cols: 8, rows: 6 },
  { cols: 5, rows: 5 },
  { cols: 7, rows: 7 },
  { cols: 12, rows: 5 },
  { cols: 9, rows: 3 },
  { cols: 3, rows: 3 },
];

function litCells(frame: Frame, cols: number): Cell[] {
  return frame.flatMap((bit, index) =>
    bit === 1 ? [[index % cols, Math.floor(index / cols)] as const] : [],
  );
}

function getBalls(grid: GridSize, frames: number): Cell[] {
  return generateBounce(grid, { frames }).frames.map((frame) => litCells(frame, grid.cols)[0]);
}

function getExpectedCells(ball: Cell, previous: Cell): Cell[] {
  const [dx, dy] = [Math.sign(previous[0] - ball[0]), Math.sign(previous[1] - ball[1])];
  if (dx === 0 && dy === 0) return [ball];
  return [ball, [ball[0] + dx, ball[1] + dy]];
}

function defaultCount(grid: GridSize): number {
  return 2 * (grid.cols - 1);
}

function sortCells(cells: readonly Cell[]): Cell[] {
  return [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

describe('generateBounce', () => {
  it('moves one column per frame on 8x6 with trail 1, mirror-symmetric with one apex pair', () => {
    const output = generateBounce({ cols: 8, rows: 6 }, { trail: 1 });
    expect(toOutputText(output, 8)).toEqual({
      frames: [
        '00000000 00000000 00000000 00000000 01000000 10000000',
        '00000000 00000000 00000000 01000000 10000000 00000000',
        '00000000 00100000 01000000 00000000 00000000 00000000',
        '00010000 00100000 00000000 00000000 00000000 00000000',
        '00011000 00000000 00000000 00000000 00000000 00000000',
        '00001000 00000100 00000000 00000000 00000000 00000000',
        '00000000 00000000 00000100 00000010 00000000 00000000',
        '00000000 00000000 00000000 00000000 00000010 00000001',
        '00000000 00000000 00000000 00000010 00000001 00000000',
        '00000000 00000100 00000010 00000000 00000000 00000000',
        '00001000 00000100 00000000 00000000 00000000 00000000',
        '00011000 00000000 00000000 00000000 00000000 00000000',
        '00010000 00100000 00000000 00000000 00000000 00000000',
        '00000000 00000000 00100000 01000000 00000000 00000000',
      ],
      durations: Array.from({ length: 14 }, () => FRAME_MS),
    });
  });

  it('draws the frames on 5x5 with frames 6', () => {
    expect(toOutputText(generateBounce({ cols: 5, rows: 5 }, { frames: 6 }), 5)).toEqual({
      frames: [
        '00000 00000 00000 00000 10000',
        '00000 01000 00000 00000 00000',
        '00000 00010 00000 00000 00000',
        '00000 00000 00000 00000 00001',
        '00000 00010 00000 00000 00000',
        '00000 01000 00000 00000 00000',
      ],
      durations: [85, 85, 85, 85, 85, 85],
    });
  });

  it('draws the frames on 5x5 with frames 6 and trail 1', () => {
    expect(toOutputText(generateBounce({ cols: 5, rows: 5 }, { frames: 6, trail: 1 }), 5).frames).toEqual([
      '00000 00000 00000 01000 10000',
      '00000 01000 10000 00000 00000',
      '00000 00110 00000 00000 00000',
      '00000 00000 00000 00010 00001',
      '00000 00010 00001 00000 00000',
      '00000 01100 00000 00000 00000',
    ]);
  });

  it('moves one column per frame with one ball by default', () => {
    const output = generateBounce({ cols: 8, rows: 6 }, {});
    expect(BOUNCE_DEFAULTS).toEqual({ trail: 0 });
    expect(output.frames.map(countLit)).toEqual(Array.from({ length: 14 }, () => 1));
    expect(generateBounce({ cols: 8, rows: 6 }, { frames: 0 })).toEqual(output);
  });

  it('names a mid-flight frame as its still frame', () => {
    const output = generateBounce({ cols: 8, rows: 6 }, { trail: 1 });
    expect(toOutputText(output, 8).frames[output.still ?? -1]).toBe(
      '00000000 00100000 01000000 00000000 00000000 00000000',
    );
  });

  it.each(GRIDS)('never leaves the ball on the same cell for two frames on $cols x $rows', (grid) => {
    const balls = getBalls(grid, defaultCount(grid));
    balls.forEach((ball, index) => expect(balls.at(index - 1)).not.toEqual(ball));
  });

  it.each(GRIDS)(
    'lights the trail one step from the ball, towards its previous cell, on $cols x $rows',
    (grid) => {
      const balls = getBalls(grid, defaultCount(grid));
      const frames = generateBounce(grid, { trail: 1 }).frames;
      frames.forEach((frame, index) => {
        const previous = balls[(index + balls.length - 1) % balls.length];
        expect(sortCells(litCells(frame, grid.cols))).toEqual(
          sortCells(getExpectedCells(balls[index], previous)),
        );
      });
    },
  );

  it.each(GRIDS)('keeps the trail touching the ball on $cols x $rows', (grid) => {
    const balls = getBalls(grid, defaultCount(grid));
    generateBounce(grid, { trail: 1 }).frames.forEach((frame, index) => {
      const cells = litCells(frame, grid.cols);
      expect(cells.length).toBeLessThanOrEqual(2);
      cells.forEach(([x, y]) => {
        expect(Math.max(Math.abs(x - balls[index][0]), Math.abs(y - balls[index][1]))).toBeLessThanOrEqual(1);
      });
    });
  });

  it.each(GRIDS)('bounces out and back along the same arc on $cols x $rows', (grid) => {
    const count = defaultCount(grid);
    const balls = getBalls(grid, count);
    const half = count / 2;
    expect(balls[0]).toEqual([0, grid.rows - 1]);
    expect(balls[half]).toEqual([grid.cols - 1, grid.rows - 1]);
    expect(Math.min(...balls.map(([, y]) => y))).toBe(0);
    balls.forEach((ball, index) => {
      expect(balls[(count - index) % count]).toEqual(ball);
    });
  });

  it.each(GRIDS)('sweeps right then left without stepping back on $cols x $rows', (grid) => {
    const count = defaultCount(grid);
    const xs = getBalls(grid, count).map(([x]) => x);
    xs.forEach((x, index) => {
      const next = xs[(index + 1) % count];
      if (index < count / 2) expect(next).toBeGreaterThanOrEqual(x);
      else expect(next).toBeLessThanOrEqual(x);
    });
  });
});
