import { describe, expect, it } from 'vitest';

import { NOISE_DEFAULTS, generateNoise } from '../../../src/core/recipes/noise';

import { countLit, toOutputText } from './frame-text';

describe('generateNoise', () => {
  it('reproduces the prototype frames on 5x5 with default params', () => {
    expect(toOutputText(generateNoise({ cols: 5, rows: 5 }, {}), 5)).toEqual({
      frames: [
        '00011 10000 01000 00010 10000',
        '10001 00010 00010 00100 00100',
        '00000 00000 10100 10110 00011',
        '00001 11001 00010 00100 00000',
        '10000 10010 10101 01000 00000',
        '01000 10111 11100 00000 00000',
        '10000 00101 01110 00110 00010',
        '01011 10100 10100 01111 00000',
      ],
      durations: [90, 90, 90, 90, 90, 90, 90, 90],
    });
  });

  it('reproduces the prototype frames on 4x4 with seed 9, frames 3, density 0.5', () => {
    expect(
      toOutputText(generateNoise({ cols: 4, rows: 4 }, { seed: 9, frames: 3, density: 0.5 }), 4),
    ).toEqual({
      frames: ['1011 1010 1011 0010', '0101 0010 0110 1111', '0011 0100 0100 1101'],
      durations: [90, 90, 90],
    });
  });

  it('keeps the same frames for the same seed', () => {
    const grid = { cols: 8, rows: 8 };
    expect(NOISE_DEFAULTS).toEqual({ seed: 3, frames: 8, density: 0.3 });
    expect(generateNoise(grid, { seed: 21 })).toEqual(generateNoise(grid, { seed: 21 }));
    expect(generateNoise(grid, { frames: 0 })).toEqual(generateNoise(grid, NOISE_DEFAULTS));
  });

  it('covers the density edge values', () => {
    const grid = { cols: 4, rows: 4 };
    expect(generateNoise(grid, { density: 0 }).frames.map(countLit)).toEqual(
      Array.from({ length: 8 }, () => 0),
    );
    expect(generateNoise(grid, { density: 1 }).frames.map(countLit)).toEqual(
      Array.from({ length: 8 }, () => 16),
    );
  });
});
