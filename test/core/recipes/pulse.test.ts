import { describe, expect, it } from 'vitest';

import { PULSE_DEFAULTS, generatePulse } from '../../../src/core/recipes/pulse';

import { toOutputText } from './frame-text';

describe('generatePulse', () => {
  it('reproduces the prototype frames on 7x7 with default params', () => {
    expect(toOutputText(generatePulse({ cols: 7, rows: 7 }, {}), 7)).toEqual({
      frames: [
        '0000000 0000000 0000000 0001000 0000000 0000000 0000000',
        '0000000 0000000 0001000 0011100 0001000 0000000 0000000',
        '0000000 0101010 0011100 0111110 0011100 0101010 0000000',
        '1001001 0101010 0011100 1111111 0011100 0101010 1001001',
        '0000000 0101010 0011100 0111110 0011100 0101010 0000000',
        '0000000 0000000 0001000 0011100 0001000 0000000 0000000',
      ],
      durations: [480, 80, 80, 400, 80, 80],
    });
  });

  it('reproduces the prototype frames on 5x5 with length 4', () => {
    expect(toOutputText(generatePulse({ cols: 5, rows: 5 }, { length: 4 }), 5)).toEqual({
      frames: ['00000 00000 00100 00000 00000', '00000 01110 01110 01110 00000'],
      durations: [480, 400],
    });
  });

  it('reproduces the prototype frames on 9x5 with default params', () => {
    expect(toOutputText(generatePulse({ cols: 9, rows: 5 }, {}), 9)).toEqual({
      frames: [
        '000000000 000000000 000010000 000000000 000000000',
        '000000000 000010000 000111000 000010000 000000000',
        '001010100 000111000 001111100 000111000 001010100',
        '000000000 000010000 000111000 000010000 000000000',
      ],
      durations: [480, 80, 400, 80],
    });
  });

  it('reproduces the prototype frames on 3x3 with default params', () => {
    expect(toOutputText(generatePulse({ cols: 3, rows: 3 }, {}), 3)).toEqual({
      frames: ['000 010 000', '111 111 111'],
      durations: [480, 400],
    });
  });

  it('treats a missing or zero length as the default length of 5', () => {
    const grid = { cols: 9, rows: 9 };
    const expected = generatePulse(grid, {});
    expect(PULSE_DEFAULTS).toEqual({ length: 5 });
    expect(generatePulse(grid, { length: 0 })).toEqual(expected);
    expect(generatePulse(grid, PULSE_DEFAULTS)).toEqual(expected);
  });

  it('keeps at least one ring for the shortest length', () => {
    expect(generatePulse({ cols: 16, rows: 16 }, { length: 1 }).durations).toEqual([480, 400]);
    expect(generatePulse({ cols: 16, rows: 16 }, { length: 2 }).frames).toHaveLength(6);
  });
});
