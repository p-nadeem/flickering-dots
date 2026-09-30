import { describe, expect, it } from 'vitest';

import { RADAR_DEFAULTS, generateRadar } from '../../../src/core/recipes/radar';

import { toOutputText } from './frame-text';

describe('generateRadar', () => {
  it('reproduces the prototype frames on 7x7 with default params', () => {
    expect(toOutputText(generateRadar({ cols: 7, rows: 7 }, {}), 7)).toEqual({
      frames: [
        '0011000 0111000 0011000 0001000 0000000 0000000 0000000',
        '0011100 0011000 0001000 0001000 0000000 0000000 0000000',
        '0001100 0001110 0001100 0001000 0000000 0000000 0000000',
        '0000100 0000110 0000110 0001000 0000000 0000000 0000000',
        '0000000 0000010 0000111 0001111 0000000 0000000 0000000',
        '0000000 0000000 0000011 0001111 0000001 0000000 0000000',
        '0000000 0000000 0000000 0001111 0000111 0000010 0000000',
        '0000000 0000000 0000000 0001000 0000111 0000110 0000000',
        '0000000 0000000 0000000 0001000 0001100 0001110 0001100',
        '0000000 0000000 0000000 0001000 0001000 0001100 0011100',
        '0000000 0000000 0000000 0001000 0011000 0111000 0011000',
        '0000000 0000000 0000000 0001000 0110000 0110000 0010000',
        '0000000 0000000 0000000 1111000 1110000 0100000 0000000',
        '0000000 0000000 1000000 1111000 1100000 0000000 0000000',
        '0000000 0100000 1110000 1111000 0000000 0000000 0000000',
        '0000000 0110000 1110000 0001000 0000000 0000000 0000000',
      ],
      durations: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60],
    });
  });

  it('reproduces the prototype frames on 5x5 with frames 8, trail 0', () => {
    expect(toOutputText(generateRadar({ cols: 5, rows: 5 }, { frames: 8, trail: 0 }), 5)).toEqual({
      frames: [
        '00100 00100 00100 00000 00000',
        '00010 00010 00100 00000 00000',
        '00000 00000 00111 00000 00000',
        '00000 00000 00100 00011 00000',
        '00000 00000 00100 00100 00100',
        '00000 00000 00100 01000 01000',
        '00000 00000 11100 00000 00000',
        '00000 11000 00100 00000 00000',
      ],
      durations: [60, 60, 60, 60, 60, 60, 60, 60],
    });
  });

  it('uses 16 frames and a trail of 2 by default', () => {
    const grid = { cols: 7, rows: 7 };
    expect(RADAR_DEFAULTS).toEqual({ frames: 16, trail: 2 });
    expect(generateRadar(grid, { frames: 0 })).toEqual(generateRadar(grid, RADAR_DEFAULTS));
  });

  it('always lights the centre', () => {
    const output = generateRadar({ cols: 9, rows: 9 }, { trail: 0 });
    expect(output.frames.every((frame) => frame[4 * 9 + 4] === 1)).toBe(true);
  });
});
