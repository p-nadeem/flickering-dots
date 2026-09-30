import { describe, expect, it } from 'vitest';

import { VARIANTS_B } from '../../../../src/core/recipes/resolve/variants-b';
import type { GridSize, RecipeParams } from '../../../../src/core/types';

import { hashFrames, rowsOf } from './support-b';

interface Pin {
  name: string;
  grid: GridSize;
  params: RecipeParams & { variant: string };
  hash: string;
  durations: number[];
}

const BOARD = { cols: 16, rows: 7 };
const COUNTER = { cols: 5, rows: 7 };
const WORD_FLIP = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
const SPIN = [220, 60, 60, 60];
const COUNT = [820, 60, 60, 60];

const PINS: Pin[] = [
  {
    name: 'board thinking',
    grid: BOARD,
    params: { variant: 'font', glyph: 'PLAN|READ|CODE|TEST' },
    hash: '48d6d7a9',
    durations: [WORD_FLIP, WORD_FLIP, WORD_FLIP, WORD_FLIP].flatMap((flip) => [...flip, 900]),
  },
  {
    name: 'board waiting',
    grid: BOARD,
    params: { variant: 'font-wait', glyph: 'WAIT' },
    hash: '20a0db61',
    durations: [1200, 50, 50, 50, 50, 50, 50, 50],
  },
  {
    name: 'board success',
    grid: BOARD,
    params: { variant: 'font-done', glyph: 'DONE' },
    hash: '63874284',
    durations: [...WORD_FLIP, 200, ...Array.from({ length: 14 }, () => 40), 1500],
  },
  {
    name: 'board error',
    grid: BOARD,
    params: { variant: 'font-fail', glyph: 'FAIL' },
    hash: 'b6a90647',
    durations: [...WORD_FLIP, 600, 80, 80, 80, 1500],
  },
  {
    name: 'countdown thinking',
    grid: COUNTER,
    params: { variant: 'segments', glyph: '0-9' },
    hash: '949d2c35',
    durations: [
      ...SPIN,
      ...SPIN,
      ...SPIN,
      ...SPIN,
      ...SPIN,
      220,
      120,
      280,
      60,
      60,
      60,
      220,
      60,
      60,
      60,
      280,
      120,
      220,
      120,
      60,
    ],
  },
  {
    name: 'countdown retrying',
    grid: COUNTER,
    params: { variant: 'segments', glyph: '5-1' },
    hash: 'd87c1b26',
    durations: [...COUNT, ...COUNT, ...COUNT, ...COUNT, ...COUNT],
  },
  {
    name: 'countdown success',
    grid: COUNTER,
    params: { variant: 'segments-done', glyph: '0' },
    hash: '57161f99',
    durations: [400, 120, 120, 120, 80, 45, 45, 45, 45, 1500],
  },
  {
    name: 'countdown error',
    grid: COUNTER,
    params: { variant: 'segments-fail', glyph: '0' },
    hash: '89568a72',
    durations: [180, 60, 60, 60, 1500],
  },
];

describe('resolve part b pinned frames at the set grids', () => {
  it.each(PINS)('keeps the $name frames and timing', ({ grid, params, hash, durations }) => {
    const output = VARIANTS_B[params.variant](grid, params);
    expect(hashFrames(output.frames)).toBe(hash);
    expect(output.durations).toEqual(durations);
  });

  it('flies the countdown 0 into the cross through three frames', () => {
    const output = VARIANTS_B['segments-fail'](COUNTER, { variant: 'segments-fail', glyph: '0' });
    expect(output.frames.map((frame) => rowsOf(frame, COUNTER.cols))).toEqual([
      ['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'],
      ['####.', '....#', '#...#', '#...#', '#...#', '###.#', '...##'],
      ['.....', '##.#.', '...#.', '.#..#', '##.##', '##..#', '....#'],
      ['.....', '#...#', '#####', '.#.#.', '#####', '#...#', '.....'],
      ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
    ]);
  });
});
