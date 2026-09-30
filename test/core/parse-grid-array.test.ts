import { describe, expect, it } from 'vitest';

import { parseGridArray } from '../../src/core/codec';
import { DEFAULT_FRAME_MS } from '../../src/core/constants';

import { CENTRE_3, CROSS_3, PLUS_3 } from './fixtures';

const PLUS_ROWS = [
  [0, 1, 0],
  [1, 1, 1],
  [0, 1, 0],
];
const CROSS_ROWS = ['101', '010', '101'];
const EXPECTED = {
  cols: 3,
  rows: 3,
  frames: [PLUS_3, CROSS_3],
  durations: [DEFAULT_FRAME_MS, DEFAULT_FRAME_MS],
};

describe('parseGridArray', () => {
  it('reads frames whose rows are arrays of 0 and 1', () => {
    expect(parseGridArray([PLUS_ROWS, CROSS_ROWS.map((row) => row.split('').map(Number))])).toEqual(EXPECTED);
  });

  it('reads rows written as strings of 0 and 1', () => {
    expect(parseGridArray([['010', '111', '010'], CROSS_ROWS])).toEqual(EXPECTED);
  });

  it('reads a frame that mixes string rows and array rows', () => {
    expect(parseGridArray([[[0, 1, 0], '111', [0, 1, 0]], CROSS_ROWS])).toEqual(EXPECTED);
  });

  it('reads an object with a frames list', () => {
    expect(parseGridArray({ frames: [PLUS_ROWS, CROSS_ROWS] })).toEqual(EXPECTED);
  });

  it('reads JSON text of either form', () => {
    expect(parseGridArray(JSON.stringify([PLUS_ROWS, CROSS_ROWS]))).toEqual(EXPECTED);
    expect(parseGridArray(`  ${JSON.stringify({ frames: [PLUS_ROWS, CROSS_ROWS] })}\n`)).toEqual(EXPECTED);
  });

  it('reads the Docs example of two 3x3 frames', () => {
    const clip = parseGridArray([
      ['000', '010', '000'],
      ['010', '111', '010'],
    ]);

    expect(clip.frames).toEqual([CENTRE_3, PLUS_3]);
  });

  it('reads non-square grids at the size limits', () => {
    const wide = Array.from({ length: 3 }, () => '1'.repeat(16));

    expect(parseGridArray([wide])).toMatchObject({ cols: 16, rows: 3 });
  });

  it('never mutates the input', () => {
    const input = [PLUS_ROWS.map((row) => [...row])];
    const clip = parseGridArray(input);

    expect(input).toEqual([PLUS_ROWS]);
    expect(clip.frames[0]).not.toBe(input[0]);
  });
});

describe('parseGridArray rejects', () => {
  const NOT_FRAMES = 'Expected an array of frames, each an array of rows.';

  it.each([null, 7, {}, { frames: 'x' }, [], { frames: [] }, '"text"'])(
    'rejects %j as not frames',
    (input) => {
      expect(() => parseGridArray(input)).toThrow(NOT_FRAMES);
    },
  );

  it('rejects text that is not JSON', () => {
    expect(() => parseGridArray('[[0,1],')).toThrow(/^This isn't valid JSON: /);
  });

  it('rejects a frame that is not a list of rows, naming the frame', () => {
    expect(() => parseGridArray([PLUS_ROWS, 5])).toThrow(
      'Frame 2 is not a list of rows. Rows are arrays of 0 and 1, or strings like "01110".',
    );
  });

  it('rejects a row that is neither an array nor a string, naming frame and row', () => {
    expect(() => parseGridArray([[[0, 1, 0], 7, [0, 1, 0]]])).toThrow(
      'Frame 1, row 2 is not a row. Rows are arrays of 0 and 1, or strings like "01110".',
    );
  });

  it('rejects a dot that is not 0 or 1, naming frame, row and dot', () => {
    expect(() =>
      parseGridArray([
        PLUS_ROWS,
        [
          [0, 1, 0],
          [1, 2, 1],
          [0, 1, 0],
        ],
      ]),
    ).toThrow('Frame 2, row 2 has 2 at dot 2. Use 0 for off and 1 for on.');
    expect(() => parseGridArray([['010', '1x1', '010']])).toThrow('Frame 1, row 2 has "x" at dot 2.');
    expect(() =>
      parseGridArray([
        [
          [0, 1, 0],
          [true, 1, 1],
          [0, 1, 0],
        ],
      ]),
    ).toThrow('Frame 1, row 2 has true at dot 1.');
  });

  it('rejects frames of different sizes with the prototype message', () => {
    const input = '[\n  [[0,1,0],[1,1,1]],\n  [[1,0],[0,1],[1,0]]\n]';

    expect(() => parseGridArray(input)).toThrow(
      'Frame 2 is 2×3 but frame 1 is 3×2. Every frame must have the same size, between 3 and 16 per side.',
    );
  });

  it('rejects a frame whose rows have different widths', () => {
    expect(() => parseGridArray([['010', '1111', '010']])).toThrow(
      'Frame 1, row 2 has 4 dots but row 1 has 3. Every row must be the same width.',
    );
  });

  it('rejects grids smaller than 3 or larger than 16 per side', () => {
    expect(() => parseGridArray([['01', '10']])).toThrow(
      'Grids are 2×2. Flickering Dots supports 3 to 16 dots per side.',
    );
    expect(() => parseGridArray([['0'.repeat(17), '0'.repeat(17), '0'.repeat(17)]])).toThrow(
      'Grids are 17×3. Flickering Dots supports 3 to 16 dots per side.',
    );
    expect(() => parseGridArray([[]])).toThrow('Grids are 0×0.');
  });
});
