import { describe, expect, it } from 'vitest';

import { WAVE_DEFAULTS, generateWave } from '../../../src/core/recipes/wave';

import { countLit, toOutputText } from './frame-text';

describe('generateWave', () => {
  it('reproduces the prototype frames on 8x5 with default params', () => {
    expect(toOutputText(generateWave({ cols: 8, rows: 5 }, {}), 8)).toEqual({
      frames: [
        '00000010 00000101 10001000 01010000 00100000',
        '00000100 00001010 00010001 10100000 01000000',
        '00001000 00010100 00100010 01000001 10000000',
        '00010000 00101000 01000100 10000010 00000001',
        '00100000 01010000 10001000 00000101 00000010',
        '01000000 10100000 00010001 00001010 00000100',
        '10000000 01000001 00100010 00010100 00001000',
        '00000001 10000010 01000100 00101000 00010000',
      ],
      durations: [70, 70, 70, 70, 70, 70, 70, 70],
    });
  });

  it('reproduces the prototype frames on 6x4 with frames 4, trail 1', () => {
    expect(toOutputText(generateWave({ cols: 6, rows: 4 }, { frames: 4, trail: 1 }), 6)).toEqual({
      frames: [
        '000011 000011 100100 111100',
        '000100 001110 011011 110001',
        '011000 011100 100100 100011',
        '100000 110001 011011 001110',
      ],
      durations: [70, 70, 70, 70],
    });
  });

  it('uses at least 8 frames, or one per column', () => {
    expect(WAVE_DEFAULTS).toEqual({ trail: 0 });
    expect(generateWave({ cols: 5, rows: 5 }, {}).frames).toHaveLength(8);
    expect(generateWave({ cols: 16, rows: 5 }, {}).frames).toHaveLength(16);
  });

  it('lights one dot per column without a trail', () => {
    const output = generateWave({ cols: 16, rows: 5 }, {});
    expect(output.frames.map(countLit)).toEqual(Array.from({ length: 16 }, () => 16));
  });
});
