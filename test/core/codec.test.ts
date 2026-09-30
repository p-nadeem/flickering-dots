import { describe, expect, it } from 'vitest';

import { decodeSet, encodeSet, frameFromRows, rowsOf } from '../../src/core/codec';
import { createFrame } from '../../src/core/frame';
import { MARK } from '../../src/core/mark';
import { resolve } from '../../src/core/resolve';
import { createRng } from '../../src/core/rng';
import { stateNames } from '../../src/core/state-names';
import type { IndicatorSet } from '../../src/core/types';
import { PRESETS } from '../../src/presets';

import {
  CENTRE_3,
  COLOURED_SET,
  CROSS_3,
  FRAMES_SET,
  FULL_3,
  PARAMS_SET,
  PLUS_3,
  RECIPE_SET,
  toFrame,
  WIDE_SET,
} from './fixtures';

const RESOLVABLE_SETS: readonly IndicatorSet[] = [
  FRAMES_SET,
  COLOURED_SET,
  RECIPE_SET,
  PARAMS_SET,
  WIDE_SET,
  MARK,
  ...PRESETS,
];

describe('rowsOf', () => {
  it('encodes each row with the most significant bit on the left', () => {
    expect(rowsOf(toFrame('0001000 1000000 0000001'), 7)).toEqual([8, 64, 1]);
  });

  it('encodes the 3x3 plus as 2 7 2', () => {
    expect(rowsOf(PLUS_3, 3)).toEqual([2, 7, 2]);
    expect(rowsOf(FULL_3, 3)).toEqual([7, 7, 7]);
  });

  it('encodes a full 16-wide row as 65535', () => {
    expect(
      rowsOf(
        createFrame({ cols: 16, rows: 3 }, () => true),
        16,
      ),
    ).toEqual([65535, 65535, 65535]);
  });

  it('rejects a frame that does not split into rows of cols cells', () => {
    expect(() => rowsOf(PLUS_3, 4)).toThrow(
      'flickering-dots rowsOf: a frame of 9 cells does not split into rows of 4',
    );
  });

  it('rejects cols that are not a whole number from 1 to 16', () => {
    expect(() => rowsOf(PLUS_3, 0)).toThrow(
      'flickering-dots rowsOf: cols must be a whole number from 1 to 16, got 0',
    );
    expect(() => rowsOf(PLUS_3, 1.5)).toThrow('cols must be a whole number from 1 to 16, got 1.5');
  });
});

describe('frameFromRows', () => {
  it('decodes bitmask rows with the most significant bit on the left', () => {
    expect(frameFromRows([2, 7, 2], 3)).toEqual(PLUS_3);
    expect(frameFromRows([5, 2, 5], 3)).toEqual(CROSS_3);
  });

  it('reads the centre dot of a 7-wide row from 8', () => {
    expect(frameFromRows([8], 7)).toEqual(toFrame('0001000'));
  });

  it('is the inverse of rowsOf for random frames on many grids', () => {
    const random = createRng(42);
    const grids = [
      { cols: 3, rows: 3 },
      { cols: 9, rows: 3 },
      { cols: 16, rows: 5 },
      { cols: 16, rows: 16 },
    ];
    grids.forEach((grid) => {
      const frame = createFrame(grid, () => random() > 0.5);

      expect(frameFromRows(rowsOf(frame, grid.cols), grid.cols)).toEqual(frame);
    });
  });

  it('rejects a row that does not fit the width', () => {
    expect(() => frameFromRows([2, 8, 2], 3)).toThrow(
      'flickering-dots frameFromRows: rows[1] is 8, but rows 3 wide are whole numbers from 0 to 7',
    );
  });

  it('rejects negative, fractional and non-number rows', () => {
    expect(() => frameFromRows([-1], 3)).toThrow('rows[0] is -1');
    expect(() => frameFromRows([1.5], 3)).toThrow('rows[0] is 1.5');
    expect(() => frameFromRows(['2' as unknown as number], 3)).toThrow('rows[0] is "2"');
  });

  it('rejects cols that are not a whole number from 1 to 16', () => {
    expect(() => frameFromRows([1], 17)).toThrow(
      'flickering-dots frameFromRows: cols must be a whole number from 1 to 16, got 17',
    );
  });
});

describe('encodeSet', () => {
  it('writes the plain JSON form with rows as bitmasks', () => {
    expect(encodeSet(FRAMES_SET)).toEqual({
      version: 1,
      id: 'blink',
      name: 'Blink',
      grid: [3, 3],
      transition: 'flip',
      encoding: 'rows-bitmask-msb-left',
      states: {
        idle: { durations: [1000], frames: [[0, 2, 0]] },
        thinking: {
          durations: [100, 200, 300],
          frames: [
            [0, 2, 0],
            [2, 7, 2],
            [7, 7, 7],
          ],
        },
        error: { durations: [400], frames: [[5, 2, 5]] },
        wave: {
          durations: [150, 250],
          frames: [
            [2, 7, 2],
            [0, 2, 0],
          ],
        },
      },
      tags: ['blink', 'tiny'],
      author: 'you',
    });
  });

  it('orders states as stateNames does', () => {
    expect(Object.keys(encodeSet(FRAMES_SET).states)).toEqual(['idle', 'thinking', 'error', 'wave']);
  });

  it('resolves recipe states to frames on the set grid', () => {
    const data = encodeSet(RECIPE_SET);
    const thinking = resolve(RECIPE_SET, 'thinking');

    expect(data.grid).toEqual([7, 7]);
    expect(data.states.thinking).toEqual({
      durations: thinking.durations,
      frames: thinking.frames.map((frame) => rowsOf(frame, 7)),
    });
  });

  it('leaves out Library-only fields', () => {
    const data = encodeSet(RECIPE_SET);

    expect(Object.keys(data)).toEqual([
      'version',
      'id',
      'name',
      'grid',
      'transition',
      'encoding',
      'states',
      'tags',
      'author',
    ]);
  });

  it('returns arrays that do not share memory with the set', () => {
    const data = encodeSet(FRAMES_SET);
    data.tags?.push('changed');
    data.states.idle.durations.push(1);

    expect(FRAMES_SET.tags).toEqual(['blink', 'tiny']);
    expect(FRAMES_SET.states.idle).toEqual({ kind: 'frames', frames: [CENTRE_3], durations: [1000] });
  });
});

describe('codec round trips', () => {
  it('decodes an encoded frames set back to the same set', () => {
    expect(decodeSet(encodeSet(FRAMES_SET))).toEqual(FRAMES_SET);
  });

  it('survives a trip through JSON text', () => {
    expect(decodeSet(JSON.parse(JSON.stringify(encodeSet(FRAMES_SET))))).toEqual(FRAMES_SET);
    expect(decodeSet(JSON.stringify(encodeSet(FRAMES_SET)))).toEqual(FRAMES_SET);
  });

  it.each(RESOLVABLE_SETS.map((set) => [set.id, set] as const))(
    'decodes %s to states that resolve to the same frames',
    (_id, set) => {
      const decoded = decodeSet(encodeSet(set));

      expect(stateNames(decoded)).toEqual(stateNames(set));
      stateNames(set).forEach((name) => {
        const { frames, durations, cols, rows } = resolve(set, name);

        expect(resolve(decoded, name)).toMatchObject({ state: name, frames, durations, cols, rows });
      });
    },
  );

  it('encodes a decoded set to the same data it came from', () => {
    RESOLVABLE_SETS.forEach((set) => {
      const data = encodeSet(set);

      expect(encodeSet(decodeSet(data))).toEqual(data);
    });
  });

  it('marks a decoded preset as the user own frames set', () => {
    const decoded = decodeSet(encodeSet(RECIPE_SET));

    expect(decoded.source).toBe('mine');
    expect(Object.values(decoded.states).every((state) => state.kind === 'frames')).toBe(true);
  });

  it('keeps per-state colours through the JSON form', () => {
    const data = encodeSet(COLOURED_SET);
    const decoded = decodeSet(data);

    expect(data.states.thinking.on).toBe('#ff5a1f');
    expect('on' in data.states.idle).toBe(false);
    expect(decoded.states.thinking.on).toBe('#ff5a1f');
    expect(decoded.states.success.on).toBe('#3ecf8e');
    expect('on' in decoded.states.idle).toBe(false);
  });

  it('keeps per-state transitions for the states it writes', () => {
    const set: IndicatorSet = {
      ...COLOURED_SET,
      transitions: { success: 'flip', idle: 'crossfade', gone: 'flip' },
    };
    const data = encodeSet(set);

    expect(data.transitions).toEqual({ success: 'flip', idle: 'crossfade' });
    expect(decodeSet(data).transitions).toEqual({ success: 'flip', idle: 'crossfade' });
  });

  it('writes no transitions field when the set has none', () => {
    const data = encodeSet(COLOURED_SET);

    expect('transitions' in data).toBe(false);
    expect('transitions' in decodeSet(data)).toBe(false);
  });
});
