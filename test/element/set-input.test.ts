import { describe, expect, it } from 'vitest';

import { DEFAULT_FRAME_MS, encodeSet, getPreset, RECIPES } from '../../src/index';
import type { Frame, IndicatorSet } from '../../src/index';
import { toClip, toIndicatorSet } from '../../src/element/set-input';

const PLUS: Frame = [0, 1, 0, 1, 1, 1, 0, 1, 0];
const DOT: Frame = [0, 0, 0, 0, 1, 0, 0, 0, 0];

const CUSTOM_SET = {
  id: 'blink',
  name: 'Blink',
  cols: 3,
  rows: 3,
  transition: 'crossfade',
  transitions: { success: 'flip' },
  tags: ['mine'],
  author: 'you',
  source: 'mine',
  states: {
    thinking: { kind: 'frames', frames: [PLUS, DOT], durations: [200, 300], on: '#ff0000' },
    success: { kind: 'recipe', recipe: 'check', params: { frames: 4 } },
  },
} satisfies IndicatorSet;

describe('toIndicatorSet', () => {
  it('looks up a preset by id', () => {
    expect(toIndicatorSet('pulse')).toBe(getPreset('pulse'));
  });

  it('names the preset it cannot find', () => {
    expect(() => toIndicatorSet('spinner')).toThrow(
      'flickering-dots element: there is no preset called "spinner"',
    );
  });

  it('keeps a valid set object as the same set', () => {
    expect(toIndicatorSet(CUSTOM_SET)).toEqual(CUSTOM_SET);
  });

  it('reads a set given as JSON text', () => {
    expect(toIndicatorSet(JSON.stringify(CUSTOM_SET))).toEqual(CUSTOM_SET);
  });

  it('reads pretty-printed set JSON with state colours and per-state transitions', () => {
    const set = toIndicatorSet(`\n  ${JSON.stringify(CUSTOM_SET, null, 2)}\n`);

    expect(set).toEqual(CUSTOM_SET);
  });

  it('decodes the plain JSON set format', () => {
    const data = encodeSet(CUSTOM_SET);

    const set = toIndicatorSet(JSON.stringify(data));

    expect(set.source).toBe('mine');
    expect(set.states.thinking).toEqual({
      kind: 'frames',
      frames: [PLUS, DOT],
      durations: [200, 300],
      on: '#ff0000',
    });
    expect(set.transitions).toEqual({ success: 'flip' });
  });

  it('passes on the decoder message for a broken JSON set', () => {
    expect(() => toIndicatorSet({ version: 1, grid: [3, 3], states: {} })).toThrow(
      'flickering-dots element: The set has no states.',
    );
  });

  it('fills in what a hand-written set object leaves out', () => {
    const set = toIndicatorSet({
      cols: 3,
      rows: 3,
      states: { thinking: { kind: 'recipe', recipe: 'pulse' } },
    });

    expect(set).toEqual({
      id: 'custom',
      name: 'custom',
      cols: 3,
      rows: 3,
      transition: 'cut',
      tags: [],
      author: '',
      source: 'mine',
      states: { thinking: { kind: 'recipe', recipe: 'pulse' } },
    });
  });

  it('rejects input that is neither an id nor a set', () => {
    expect(() => toIndicatorSet(42)).toThrow(
      'flickering-dots element: set must be a preset id, a set object or set JSON',
    );
    expect(() => toIndicatorSet(['pulse'])).toThrow(
      'flickering-dots element: set must be a preset id, a set object or set JSON',
    );
  });

  it('reports set JSON that does not parse', () => {
    expect(() => toIndicatorSet('{"cols":3')).toThrow(/^flickering-dots element: set is not valid JSON/);
  });

  it('rejects a grid outside 3 to 16', () => {
    expect(() => toIndicatorSet({ ...CUSTOM_SET, cols: 2 })).toThrow(
      'flickering-dots element: set cols must be a whole number from 3 to 16, got 2',
    );
    expect(() => toIndicatorSet({ ...CUSTOM_SET, rows: 17 })).toThrow(
      'flickering-dots element: set rows must be a whole number from 3 to 16, got 17',
    );
  });

  it('rejects a set without states', () => {
    expect(() => toIndicatorSet({ ...CUSTOM_SET, states: {} })).toThrow(
      'flickering-dots element: set has no states',
    );
    expect(() => toIndicatorSet({ ...CUSTOM_SET, states: [] })).toThrow(
      'flickering-dots element: set states must be an object of named states',
    );
  });

  it('rejects a transition it does not know', () => {
    expect(() => toIndicatorSet({ ...CUSTOM_SET, transition: 'slide' })).toThrow(
      'flickering-dots element: set transition must be cut, flip or crossfade, got "slide"',
    );
  });

  it('drops per-state transitions it does not know', () => {
    const set = toIndicatorSet({ ...CUSTOM_SET, transitions: { success: 'slide', error: 'cut' } });

    expect(set.transitions).toEqual({ error: 'cut' });
  });

  it('rejects a state of unknown kind', () => {
    expect(() => toIndicatorSet({ ...CUSTOM_SET, states: { thinking: { recipe: 'pulse' } } })).toThrow(
      'flickering-dots element: state "thinking" must have kind "recipe" or "frames"',
    );
  });

  it.each(RECIPES.map((info) => info.id))('accepts a custom set whose state uses the %s recipe', (recipe) => {
    const states = { thinking: { kind: 'recipe', recipe } };

    expect(toIndicatorSet({ ...CUSTOM_SET, states }).states.thinking).toEqual({ kind: 'recipe', recipe });
  });

  it('rejects a recipe it does not know', () => {
    const states = { thinking: { kind: 'recipe', recipe: 'spin' } };

    expect(() => toIndicatorSet({ ...CUSTOM_SET, states })).toThrow(
      'flickering-dots element: state "thinking" uses the unknown recipe "spin"',
    );
  });

  it('rejects recipe params out of range', () => {
    const states = { thinking: { kind: 'recipe', recipe: 'pulse', params: { density: 3 } } };

    expect(() => toIndicatorSet({ ...CUSTOM_SET, states })).toThrow(/params\.density/);
  });

  it('rejects a frame of the wrong size', () => {
    const states = { thinking: { kind: 'frames', frames: [PLUS, [1, 0]], durations: [90, 90] } };

    expect(() => toIndicatorSet({ ...CUSTOM_SET, states })).toThrow(
      'flickering-dots element: state "thinking", frame 2 must be 9 dots, each 0 or 1',
    );
  });

  it('rejects a state colour that is not text', () => {
    const states = { thinking: { kind: 'recipe', recipe: 'pulse', on: 5 } };

    expect(() => toIndicatorSet({ ...CUSTOM_SET, states })).toThrow(
      'flickering-dots element: state "thinking" colour must be text',
    );
  });
});

describe('toClip', () => {
  it('reads a clip object', () => {
    expect(toClip({ cols: 3, rows: 3, frames: [PLUS, DOT], durations: [100, 200] })).toEqual({
      cols: 3,
      rows: 3,
      frames: [PLUS, DOT],
      durations: [100, 200],
    });
  });

  it('reads a clip given as JSON text', () => {
    const clip = toClip(JSON.stringify({ cols: 3, rows: 3, frames: [PLUS], durations: [500] }));

    expect(clip.frames).toEqual([PLUS]);
  });

  it('gives missing or unusable durations the default frame time', () => {
    expect(toClip({ cols: 3, rows: 3, frames: [PLUS, DOT] }).durations).toEqual([
      DEFAULT_FRAME_MS,
      DEFAULT_FRAME_MS,
    ]);
    expect(toClip({ cols: 3, rows: 3, frames: [PLUS, DOT], durations: [0, 'x'] }).durations).toEqual([
      DEFAULT_FRAME_MS,
      DEFAULT_FRAME_MS,
    ]);
  });

  it('rejects input that is not a clip', () => {
    expect(() => toClip('[1,0]')).toThrow(
      'flickering-dots element: frames must be an object with frames, cols and rows',
    );
  });

  it('rejects a clip grid outside 3 to 16', () => {
    expect(() => toClip({ cols: 1, rows: 3, frames: [[1, 0, 1]] })).toThrow(
      'flickering-dots element: frames cols must be a whole number from 3 to 16, got 1',
    );
  });

  it('rejects a clip with no frames', () => {
    expect(() => toClip({ cols: 3, rows: 3, frames: [] })).toThrow(
      'flickering-dots element: frames needs at least one frame',
    );
  });

  it('rejects dots other than 0 and 1', () => {
    expect(() => toClip({ cols: 3, rows: 3, frames: [[0, 1, 0, 1, 2, 1, 0, 1, 0]] })).toThrow(
      'flickering-dots element: frames, frame 1 must be 9 dots, each 0 or 1',
    );
  });
});
