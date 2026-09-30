import { describe, expect, it } from 'vitest';

import { FACE_DEFAULTS, FACE_VARIANTS, generateFace } from '../../../../src/core/recipes/face';

import {
  BLINK_1,
  BLINK_3,
  CENTRE,
  LEFT_1,
  LEFT_2,
  RIGHT_1,
  RIGHT_2,
  UP_CENTRE,
  UP_LEFT,
  UP_RIGHT,
} from './art-12x8';
import { toArt } from './frame-tools';

const GRID = { cols: 12, rows: 8 };
const LOOP_DURATIONS = [900, 80, 500, 400, 200, 80, 600, 400, 300, 60, 80, 60, 800];
const NAMED: Readonly<Record<string, readonly string[]>> = {
  C: CENTRE,
  L1: LEFT_1,
  L2: LEFT_2,
  R1: RIGHT_1,
  R2: RIGHT_2,
  UC: UP_CENTRE,
  UL: UP_LEFT,
  UR: UP_RIGHT,
  B3: BLINK_3,
  B1: BLINK_1,
};

function nameOf(art: readonly string[]): string {
  return Object.keys(NAMED).find((key) => NAMED[key].join() === art.join()) ?? art.join('/');
}

function names(seed?: number): string {
  return generateFace(GRID, { variant: 'glance', seed })
    .frames.map((frame) => nameOf(toArt(frame, GRID.cols)))
    .join(' ');
}

describe('generateFace glance', () => {
  it('lists its variants and defaults to a glance with seed 1', () => {
    expect(FACE_VARIANTS).toEqual(['glance', 'sleepy', 'wide', 'read', 'happy', 'angry']);
    expect(FACE_DEFAULTS).toEqual({ variant: 'glance', seed: 1 });
  });

  it('plays three seeded 13-frame glance loops on 12x8', () => {
    const output = generateFace(GRID, {});
    expect(names()).toBe(
      [
        'C L1 L2 L2 C R1 R2 UC C B3 B1 B3 C',
        'C R1 R2 R2 C L1 L2 UL C B3 B1 B3 C',
        'C R1 R2 R2 C L1 L2 UC C B3 B1 B3 C',
      ].join(' '),
    );
    expect(output.durations).toEqual([...LOOP_DURATIONS, ...LOOP_DURATIONS, ...LOOP_DURATIONS]);
    expect(output.still).toBe(0);
  });

  it('draws the rounded eyes exactly on 12x8', () => {
    const { frames } = generateFace(GRID, { variant: 'glance' });
    expect(toArt(frames[0], GRID.cols)).toEqual([
      '............',
      '..##....##..',
      '.####..####.',
      '.####..####.',
      '.####..####.',
      '.####..####.',
      '..##....##..',
      '............',
    ]);
    expect(toArt(frames[2], GRID.cols)).toEqual([
      '............',
      '.##...##....',
      '####.####...',
      '####.####...',
      '####.####...',
      '####.####...',
      '.##...##....',
      '............',
    ]);
  });

  it('looks up to the side of the second look when the seed says so', () => {
    expect(names(2).split(' ').slice(0, 13).join(' ')).toBe('C R1 R2 R2 C L1 L2 UL C B3 B1 B3 C');
  });

  it('gives the same frames for the same seed and different looks for another seed', () => {
    expect(generateFace(GRID, { seed: 4 })).toEqual(generateFace(GRID, { seed: 4 }));
    expect(names(1)).not.toBe(names(3));
  });

  it('rejects an unknown variant with a readable message', () => {
    expect(() => generateFace(GRID, { variant: 'wink' })).toThrow(
      'flickering-dots face: unknown variant "wink"; use one of glance, sleepy, wide, read, happy, angry',
    );
  });
});
