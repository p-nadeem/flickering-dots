import { describe, expect, it } from 'vitest';

import { generateFace } from '../../../../src/core/recipes/face';
import type { GridSize } from '../../../../src/core/types';

import { BLINK_1 } from './art-12x8';
import { toArt } from './frame-tools';

const GRID: GridSize = { cols: 12, rows: 8 };
const BLANK = '............';

function arts(variant: string): string[][] {
  return generateFace(GRID, { variant }).frames.map((frame) => toArt(frame, GRID.cols));
}

function place(top: number, rows: readonly string[]): string[] {
  const filled = [...Array.from({ length: top }, () => BLANK), ...rows];
  return [...filled, ...Array.from({ length: 8 - filled.length }, () => BLANK)];
}

describe('generateFace happy', () => {
  it('blinks shut, opens into happy arcs that bounce up twice and holds on 12x8', () => {
    const arcs = ['..##....##..', '.####..####.', '.#..#..#..#.', '.#..#..#..#.'];
    const output = generateFace(GRID, { variant: 'happy' });
    expect(arts('happy')).toEqual([
      BLINK_1,
      place(2, arcs),
      place(1, arcs),
      place(2, arcs),
      place(1, arcs),
      place(2, arcs),
    ]);
    expect(output.durations).toEqual([80, 120, 140, 140, 140, 1200]);
    expect(output.still).toBe(5);
  });
});

describe('generateFace angry', () => {
  it('blinks shut, glares with inner slants, shakes 1 column 3 times and holds on 12x8', () => {
    const centre = place(1, [
      '.#........#.',
      '.##......##.',
      '.###....###.',
      '.####..####.',
      '.####..####.',
      '..##....##..',
    ]);
    const left = place(1, [
      '#........#..',
      '##......##..',
      '###....###..',
      '####..####..',
      '####..####..',
      '.##....##...',
    ]);
    const right = place(1, [
      '..#........#',
      '..##......##',
      '..###....###',
      '..####..####',
      '..####..####',
      '...##....##.',
    ]);
    const output = generateFace(GRID, { variant: 'angry' });
    expect(arts('angry')).toEqual([BLINK_1, centre, left, centre, right, centre, left, centre]);
    expect(output.durations).toEqual([80, 600, 80, 80, 80, 80, 80, 1200]);
    expect(output.still).toBe(7);
  });
});
