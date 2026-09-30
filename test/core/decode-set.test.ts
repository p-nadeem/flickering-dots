import { describe, expect, it } from 'vitest';

import { decodeSet } from '../../src/core/codec';

import { CENTRE_3, PLUS_3 } from './fixtures';

const VALID = {
  version: 1,
  id: 'blink',
  name: 'Blink',
  grid: [3, 3],
  transition: 'crossfade',
  encoding: 'rows-bitmask-msb-left',
  states: {
    thinking: {
      durations: [120, 80],
      frames: [
        [0, 2, 0],
        [2, 7, 2],
      ],
    },
  },
  tags: ['tiny'],
  author: 'ada.w',
};

function withState(state: unknown): Record<string, unknown> {
  return { ...VALID, states: { thinking: state } };
}

function withFrames(frames: unknown, durations: unknown = [100, 100]): Record<string, unknown> {
  return withState({ frames, durations });
}

describe('decodeSet', () => {
  it('returns a frames set of the user own', () => {
    expect(decodeSet(VALID)).toEqual({
      id: 'blink',
      name: 'Blink',
      cols: 3,
      rows: 3,
      states: { thinking: { kind: 'frames', frames: [CENTRE_3, PLUS_3], durations: [120, 80] } },
      transition: 'crossfade',
      tags: ['tiny'],
      author: 'ada.w',
      source: 'mine',
    });
  });

  it('fills in the optional fields a hand-written set may leave out', () => {
    const {
      version: _version,
      id: _id,
      name: _name,
      transition: _transition,
      encoding: _encoding,
      ...rest
    } = VALID;
    const { tags: _tags, author: _author, ...bare } = rest;

    expect(decodeSet(bare)).toMatchObject({
      id: 'imported',
      name: 'Imported set',
      transition: 'cut',
      tags: [],
      author: 'you',
      source: 'mine',
    });
  });

  it('keeps states in the order they were written', () => {
    const states = { error: VALID.states.thinking, idle: VALID.states.thinking };

    expect(Object.keys(decodeSet({ ...VALID, states }).states)).toEqual(['error', 'idle']);
  });

  it('reads a JSON string', () => {
    expect(decodeSet(JSON.stringify(VALID))).toEqual(decodeSet(VALID));
  });

  it('never shares arrays with the input', () => {
    const input = structuredClone(VALID);
    const decoded = decodeSet(input);
    input.states.thinking.durations[0] = 999;
    input.tags.push('changed');

    expect(decoded.states.thinking).toMatchObject({ durations: [120, 80] });
    expect(decoded.tags).toEqual(['tiny']);
  });
});

describe('decodeSet rejects the envelope', () => {
  it.each([null, 42, [VALID], {}, { grid: [3, 3] }, { states: VALID.states }])(
    'rejects %j as not a set',
    (input) => {
      expect(() => decodeSet(input)).toThrow('Expected a Flickering Dots set with "grid" and "states".');
    },
  );

  it('rejects text that is not JSON', () => {
    expect(() => decodeSet('{ nope')).toThrow(/^This isn't valid JSON: /);
  });

  it('rejects a version other than 1', () => {
    expect(() => decodeSet({ ...VALID, version: 2 })).toThrow(
      'This set uses format version 2, which this version of Flickering Dots cannot open.',
    );
  });

  it('rejects an unknown encoding', () => {
    expect(() => decodeSet({ ...VALID, encoding: 'rows-bitmask-lsb-left' })).toThrow(
      'This set uses the encoding "rows-bitmask-lsb-left". Flickering Dots reads "rows-bitmask-msb-left".',
    );
  });

  it('rejects a grid that is not a pair of numbers', () => {
    expect(() => decodeSet({ ...VALID, grid: [3] })).toThrow('The grid must be [columns, rows], got [3].');
    expect(() => decodeSet({ ...VALID, grid: '3x3' })).toThrow(
      'The grid must be [columns, rows], got "3x3".',
    );
  });

  it('describes a missing, circular or long grid value without failing', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => decodeSet({ ...VALID, grid: undefined })).toThrow(
      'The grid must be [columns, rows], got undefined.',
    );
    expect(() => decodeSet({ ...VALID, grid: circular })).toThrow(
      'The grid must be [columns, rows], got [object Object].',
    );
    expect(() => decodeSet({ ...VALID, grid: [3, 'x'.repeat(100)] })).toThrow(
      `The grid is 3×"${'x'.repeat(39)}.... Flickering Dots supports 3 to 16 dots per side.`,
    );
  });

  it('rejects a grid outside 3 to 16 per side', () => {
    expect(() => decodeSet({ ...VALID, grid: [2, 3] })).toThrow(
      'The grid is 2×3. Flickering Dots supports 3 to 16 dots per side.',
    );
    expect(() => decodeSet({ ...VALID, grid: [3, 17] })).toThrow('The grid is 3×17.');
    expect(() => decodeSet({ ...VALID, grid: [3.5, 3] })).toThrow('The grid is 3.5×3.');
  });

  it('rejects a name, id or author that is not text', () => {
    expect(() => decodeSet({ ...VALID, name: '  ' })).toThrow('The set name must be non-empty text.');
    expect(() => decodeSet({ ...VALID, id: 7 })).toThrow('The set id must be non-empty text.');
    expect(() => decodeSet({ ...VALID, author: ['me'] })).toThrow('The author must be text.');
  });

  it('rejects an unknown transition', () => {
    expect(() => decodeSet({ ...VALID, transition: 'slide' })).toThrow(
      'The transition "slide" is not one of cut, flip or crossfade.',
    );
  });

  it('reads a per-state colour and per-state transitions', () => {
    const decoded = decodeSet({
      ...VALID,
      states: { thinking: { ...VALID.states.thinking, on: '#3fb950' } },
      transitions: { thinking: 'flip' },
    });

    expect(decoded.states.thinking.on).toBe('#3fb950');
    expect(decoded.transitions).toEqual({ thinking: 'flip' });
  });

  it('rejects a per-state colour that is not a hex colour, naming the state', () => {
    expect(() => decodeSet(withState({ ...VALID.states.thinking, on: 'red' }))).toThrow(
      'State "thinking" has the colour "red". Use a hex colour like #1a2b3c.',
    );
  });

  it('rejects transitions that are not an object, name no state or are unknown', () => {
    expect(() => decodeSet({ ...VALID, transitions: ['flip'] })).toThrow(
      'Transitions must be an object of state names.',
    );
    expect(() => decodeSet({ ...VALID, transitions: { success: 'flip' } })).toThrow(
      'The transition into "success" names no state of the set.',
    );
    expect(() => decodeSet({ ...VALID, transitions: { thinking: 'spin' } })).toThrow(
      'The transition "spin" is not one of cut, flip or crossfade.',
    );
  });

  it('leaves out an empty transitions object', () => {
    expect('transitions' in decodeSet({ ...VALID, transitions: {} })).toBe(false);
  });

  it('rejects tags that are not a list of text', () => {
    expect(() => decodeSet({ ...VALID, tags: 'tiny' })).toThrow('Tags must be a list of text.');
    expect(() => decodeSet({ ...VALID, tags: ['tiny', 3] })).toThrow('Tags must be a list of text.');
  });
});

describe('decodeSet rejects states', () => {
  it('rejects states that are not an object', () => {
    expect(() => decodeSet({ ...VALID, states: [] })).toThrow('States must be an object of named states.');
  });

  it('rejects a set without states', () => {
    expect(() => decodeSet({ ...VALID, states: {} })).toThrow('The set has no states.');
  });

  it('rejects an empty state name', () => {
    expect(() => decodeSet({ ...VALID, states: { '': VALID.states.thinking } })).toThrow(
      'State names must not be empty.',
    );
  });

  it('rejects a state that is not an object', () => {
    expect(() => decodeSet(withState('pulse'))).toThrow(
      'State "thinking" must have "frames" and "durations".',
    );
  });

  it('rejects a state without frames', () => {
    expect(() => decodeSet(withFrames([], []))).toThrow('State "thinking" has no frames.');
    expect(() => decodeSet(withFrames('0,2,0'))).toThrow('State "thinking" has no frames.');
  });

  it('rejects a frame that is not a list of rows, naming the frame', () => {
    expect(() => decodeSet(withFrames([[0, 2, 0], 'x']))).toThrow(
      'State "thinking", frame 2 must be a list of row numbers.',
    );
  });

  it('rejects a frame with the wrong number of rows', () => {
    expect(() =>
      decodeSet(
        withFrames([
          [0, 2, 0],
          [2, 7],
        ]),
      ),
    ).toThrow('State "thinking", frame 2 has 2 rows but the grid has 3.');
  });

  it('rejects a row that does not fit the grid width, naming frame and row', () => {
    expect(() =>
      decodeSet(
        withFrames([
          [0, 2, 0],
          [2, 8, 2],
        ]),
      ),
    ).toThrow('State "thinking", frame 2, row 2 is 8. Rows of a 3-dot grid are whole numbers from 0 to 7.');
    expect(() =>
      decodeSet(
        withFrames([
          [0, -1, 0],
          [2, 7, 2],
        ]),
      ),
    ).toThrow('frame 1, row 2 is -1.');
    expect(() =>
      decodeSet(
        withFrames([
          [0, '2', 0],
          [2, 7, 2],
        ]),
      ),
    ).toThrow('frame 1, row 2 is "2".');
  });

  it('rejects durations that are missing or not one per frame', () => {
    expect(() => decodeSet(withState({ frames: VALID.states.thinking.frames }))).toThrow(
      'State "thinking" needs one duration per frame.',
    );
    expect(() => decodeSet(withFrames(VALID.states.thinking.frames, [100]))).toThrow(
      'State "thinking" has 2 frames but 1 duration. Give one duration per frame.',
    );
  });

  it('rejects a duration that is not a positive number, naming the frame', () => {
    const frames = VALID.states.thinking.frames;

    expect(() => decodeSet(withFrames(frames, [100, 0]))).toThrow(
      'State "thinking", frame 2 has a duration of 0. Durations are positive numbers of milliseconds.',
    );
    expect(() => decodeSet(withFrames(frames, [-5, 100]))).toThrow('frame 1 has a duration of -5.');
    expect(() => decodeSet(withFrames(frames, ['90', 100]))).toThrow('frame 1 has a duration of "90".');
    expect(() => decodeSet(withFrames(frames, [100, Number.POSITIVE_INFINITY]))).toThrow(
      'frame 2 has a duration of Infinity.',
    );
  });
});
