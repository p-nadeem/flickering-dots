import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateProjection } from '../../../../src/core/recipes/projection';

import { changedCells, litBox, toRows } from './clip-checks';

function componentCount(frame: readonly number[], cols: number): number {
  const lit = frame.flatMap((bit, index) => (bit === 1 ? [index] : []));
  const seen = new Set<number>();
  const visit = (start: number): void => {
    const stack = [start];
    while (stack.length > 0) {
      const cell = stack.pop() ?? 0;
      if (seen.has(cell)) continue;
      seen.add(cell);
      lit
        .filter(
          (other) =>
            Math.abs((other % cols) - (cell % cols)) <= 1 &&
            Math.abs(Math.floor(other / cols) - Math.floor(cell / cols)) <= 1,
        )
        .forEach((other) => stack.push(other));
    }
  };
  return lit.reduce((count, cell) => {
    if (seen.has(cell)) return count;
    visit(cell);
    return count + 1;
  }, 0);
}

const GRID = { cols: 12, rows: 12 };
const TURN_FRAMES = 8;
const BIG = 0.2 * 144;
const HOLD_MS = 1500;

describe('projection cube', () => {
  it('turns a quarter turn in 8 frames at 125 ms and names the resting three-quarter view as its still', () => {
    const { frames, durations, still } = generateProjection(GRID, { variant: 'cube' });

    expect(durations).toEqual(Array.from({ length: TURN_FRAMES }, () => 125));
    expect(frames[still ?? 0]).toEqual(generateProjection(GRID, { variant: 'cube-rest' }).frames[0]);
    expect(toRows(frames[0], GRID.cols)).toEqual([
      '............',
      '..########..',
      '############',
      '#..........#',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '.#........#.',
      '..#......#..',
      '..########..',
      '............',
      '............',
    ]);
  });

  it('takes the frame count per quarter turn from frames', () => {
    expect(generateProjection(GRID, { variant: 'cube', frames: 6 }).frames).toHaveLength(6);
  });

  it('draws the waiting spin with the same frames at 250 ms', () => {
    const spin = generateProjection(GRID, { variant: 'cube' });
    const wait = generateProjection(GRID, { variant: 'cube-wait' });

    expect(wait.frames).toEqual(spin.frames);
    expect(new Set(wait.durations)).toEqual(new Set([250]));
  });

  it('rests on a three-quarter view and makes an eased eighth turn every 3 s', () => {
    const { frames, durations, still } = generateProjection(GRID, { variant: 'cube-rest' });
    const cycleMs = durations.slice(0, durations.length / 2).reduce((sum, ms) => sum + ms, 0);

    expect(durations).toEqual([2600, 80, 80, 80, 80, 80, 2600, 80, 80, 80, 80, 80]);
    expect(cycleMs).toBe(3000);
    expect(still).toBe(0);
    expect(toRows(frames[0], GRID.cols)).toEqual([
      '............',
      '..#########.',
      '#####.....#.',
      '#....######.',
      '#........#..',
      '.#.......#..',
      '.#.......#..',
      '.#......##..',
      '.##.....##..',
      '...##...#...',
      '.....##.#...',
      '............',
    ]);
  });

  it('lands on the centred face-on square, then morphs into the shared check', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'cube-land' });

    expect(durations.slice(0, 5)).toEqual([120, 120, 150, 200, 260]);
    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(litBox(frames[4], GRID.cols)).toEqual({ left: 1, right: 10, top: 1, bottom: 10 });
    expect(frames.at(-1)).toEqual(glyphMask('check', GRID));
  });

  it('pulls the square edge by edge into the check with no scattered frames', () => {
    const { frames } = generateProjection(GRID, { variant: 'cube-land' });

    frames.slice(4).forEach((frame) => expect(componentCount(frame, GRID.cols)).toBe(1));
  });

  it('shakes gently through four eased poses, each step under a fifth of the grid', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'cube-shake' });

    expect(durations.slice(0, 5)).toEqual([120, 70, 70, 70, 70]);
    frames
      .slice(1, 5)
      .forEach((frame, index) => expect(changedCells(frames[index], frame)).toBeLessThan(BIG));
  });

  it('drops its leftmost upright edge after the shake and holds', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'cube-shake' });

    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(toRows(frames[5], GRID.cols)).toEqual([
      '............',
      '..#########.',
      '#####.....#.',
      '.....######.',
      '.........#..',
      '.........#..',
      '.........#..',
      '........##..',
      '.##.....##..',
      '...##...#...',
      '.....##.#...',
      '............',
    ]);
  });
});
