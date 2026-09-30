import { describe, expect, it } from 'vitest';

import { SCAN_DEFAULTS, generateScan } from '../../../src/core/recipes/scan';

import { toOutputText } from './frame-text';

describe('generateScan', () => {
  it('reproduces the prototype frames on 5x5 with default params', () => {
    expect(toOutputText(generateScan({ cols: 5, rows: 5 }, {}), 5)).toEqual({
      frames: [
        '10000 10000 10000 10000 10000',
        '11000 11000 11000 11000 11000',
        '01100 01100 01100 01100 01100',
        '00110 00110 00110 00110 00110',
        '00011 00011 00011 00011 00011',
      ],
      durations: [70, 70, 70, 70, 240],
    });
  });

  it('reproduces the prototype frames on 5x3 with trail 0', () => {
    expect(toOutputText(generateScan({ cols: 5, rows: 3 }, { trail: 0 }), 5)).toEqual({
      frames: [
        '10000 10000 10000',
        '01000 01000 01000',
        '00100 00100 00100',
        '00010 00010 00010',
        '00001 00001 00001',
      ],
      durations: [70, 70, 70, 70, 240],
    });
  });

  it('uses one frame per column and ignores the frames param', () => {
    const output = generateScan({ cols: 12, rows: 5 }, { frames: 4 });
    expect(SCAN_DEFAULTS).toEqual({ trail: 1 });
    expect(output.frames).toHaveLength(12);
    expect(output.durations.at(-1)).toBe(240);
  });
});
