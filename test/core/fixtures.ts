import type { Bit, Frame, IndicatorSet } from '../../src/core/types';

export function toFrame(text: string): Frame {
  return text
    .replaceAll(' ', '')
    .split('')
    .map((cell): Bit => (cell === '1' ? 1 : 0));
}

export const CENTRE_3 = toFrame('000 010 000');
export const PLUS_3 = toFrame('010 111 010');
export const FULL_3 = toFrame('111 111 111');
export const CROSS_3 = toFrame('101 010 101');

export const FRAMES_SET: IndicatorSet = {
  id: 'blink',
  name: 'Blink',
  cols: 3,
  rows: 3,
  states: {
    wave: { kind: 'frames', frames: [PLUS_3, CENTRE_3], durations: [150, 250] },
    error: { kind: 'frames', frames: [CROSS_3], durations: [400] },
    thinking: { kind: 'frames', frames: [CENTRE_3, PLUS_3, FULL_3], durations: [100, 200, 300] },
    idle: { kind: 'frames', frames: [CENTRE_3], durations: [1000] },
  },
  transition: 'flip',
  tags: ['blink', 'tiny'],
  author: 'you',
  source: 'mine',
};

export const COLOURED_SET: IndicatorSet = {
  ...FRAMES_SET,
  id: 'coloured',
  states: {
    thinking: { kind: 'frames', frames: [CENTRE_3, PLUS_3], durations: [100, 200], on: '#ff5a1f' },
    success: { kind: 'recipe', recipe: 'check', on: '#3ecf8e' },
    idle: { kind: 'frames', frames: [CENTRE_3], durations: [1000] },
  },
};

export const RECIPE_SET: IndicatorSet = {
  id: 'pulse',
  name: 'Thinking Pulse',
  intent: 'thinking',
  cols: 7,
  rows: 7,
  states: {
    idle: { kind: 'recipe', recipe: 'idle' },
    thinking: { kind: 'recipe', recipe: 'pulse' },
    success: { kind: 'recipe', recipe: 'check' },
    error: { kind: 'recipe', recipe: 'cross' },
  },
  transition: 'flip',
  tags: ['pulse', 'asterisk', 'chat'],
  author: 'Flickering Dots',
  source: 'builtin',
  contexts: ['chat', 'terminal', 'button'],
  collections: ['ai'],
  addedAt: '2026-08-19',
};

export const PARAMS_SET: IndicatorSet = {
  id: 'ember',
  name: 'Ember Pulse',
  cols: 5,
  rows: 5,
  states: {
    thinking: { kind: 'recipe', recipe: 'pulse', params: { length: 4 } },
    success: { kind: 'recipe', recipe: 'check' },
  },
  transition: 'crossfade',
  tags: ['pulse'],
  author: 'Flickering Dots',
  source: 'builtin',
};

export const WIDE_SET: IndicatorSet = {
  id: 'dots3',
  name: 'Three Dot',
  cols: 9,
  rows: 3,
  states: { thinking: { kind: 'recipe', recipe: 'ellipsis' } },
  transition: 'cut',
  tags: ['minimal'],
  author: 'Flickering Dots',
  source: 'builtin',
};

export const NO_THINKING_SET: IndicatorSet = {
  ...FRAMES_SET,
  id: 'okfail',
  states: {
    success: { kind: 'frames', frames: [PLUS_3, FULL_3], durations: [300, 500] },
    error: { kind: 'frames', frames: [CROSS_3], durations: [700] },
  },
};

export const EMPTY_SET: IndicatorSet = { ...FRAMES_SET, id: 'empty', states: {} };
