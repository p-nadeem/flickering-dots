import { describe, expect, it } from 'vitest';

import { generateIdle } from '../../../src/core/recipes/idle';

import { toOutputText } from './frame-text';

describe('generateIdle', () => {
  it('reproduces the prototype frames on 7x7', () => {
    expect(toOutputText(generateIdle({ cols: 7, rows: 7 }), 7)).toEqual({
      frames: [
        '0000000 0000000 0000000 0001000 0000000 0000000 0000000',
        '0000000 0000000 0000000 0000000 0000000 0000000 0000000',
      ],
      durations: [1500, 420],
    });
  });

  it('reproduces the prototype frames on 4x4', () => {
    expect(toOutputText(generateIdle({ cols: 4, rows: 4 }), 4)).toEqual({
      frames: ['0000 0110 0110 0000', '0000 0000 0000 0000'],
      durations: [1500, 420],
    });
  });
});
