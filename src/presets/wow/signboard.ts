import type { IndicatorSet } from '../../core/types';
import { BUILTIN } from '../shared';

const ADDED_AT = '2026-09-29';
const SIGNBOARD = 'signboard';
const DECODE_IDLE_SEED = 12;

const SPLIT_FLAP: IndicatorSet = {
  id: 'split-flap',
  name: 'Split Flap',
  description:
    'A flutter band sweeps across the grid and columns lock one after another onto the final glyph.',
  intent: 'result',
  cols: 9,
  rows: 9,
  states: {
    idle: { kind: 'recipe', recipe: 'resolve', params: { variant: 'flap-rest', glyph: 'sparkle' } },
    thinking: { kind: 'recipe', recipe: 'resolve', params: { variant: 'flap-band' } },
    success: { kind: 'recipe', recipe: 'resolve', params: { variant: 'flap', glyph: 'check' } },
    error: { kind: 'recipe', recipe: 'resolve', params: { variant: 'flap-rtl', glyph: 'cross' } },
    'answer-ready': { kind: 'recipe', recipe: 'resolve', params: { variant: 'flap', glyph: 'sparkle' } },
  },
  transition: 'flip',
  tags: ['split-flap', 'board', 'reveal', 'mechanical'],
  contexts: ['button', 'card', 'page', 'splash', 'inline'],
  collections: [SIGNBOARD],
  addedAt: ADDED_AT,
  ...BUILTIN,
};

const DEPARTURE_BOARD: IndicatorSet = {
  id: 'departure-board',
  name: 'Departure Board',
  description:
    'Short status words flip through letters top half first, then settle left to right like a station board.',
  intent: 'progress',
  cols: 16,
  rows: 7,
  states: {
    idle: { kind: 'recipe', recipe: 'resolve', params: { variant: 'font', glyph: '----' } },
    thinking: {
      kind: 'recipe',
      recipe: 'resolve',
      params: { variant: 'font', glyph: 'PLAN|READ|CODE|TEST' },
    },
    waiting: { kind: 'recipe', recipe: 'resolve', params: { variant: 'font-wait', glyph: 'WAIT' } },
    success: { kind: 'recipe', recipe: 'resolve', params: { variant: 'font-done', glyph: 'DONE' } },
    error: { kind: 'recipe', recipe: 'resolve', params: { variant: 'font-fail', glyph: 'FAIL' } },
  },
  transition: 'flip',
  tags: ['words', 'board', 'status', 'terminal'],
  contexts: ['terminal', 'card', 'page', 'splash'],
  collections: [SIGNBOARD],
  addedAt: ADDED_AT,
  ...BUILTIN,
};

const DECODE: IndicatorSet = {
  id: 'decode',
  name: 'Decode',
  description:
    'Digital rain falls, and every dot a stream passes that belongs to the answer sticks, decoding it out of the rain.',
  intent: 'result',
  cols: 7,
  rows: 7,
  states: {
    idle: { kind: 'recipe', recipe: 'rain', params: { density: 0.15, seed: DECODE_IDLE_SEED } },
    thinking: { kind: 'recipe', recipe: 'rain' },
    success: { kind: 'recipe', recipe: 'resolve', params: { variant: 'rain', glyph: 'check' } },
    error: {
      kind: 'recipe',
      recipe: 'resolve',
      params: { variant: 'rain', glyph: 'cross' },
    },
    'answer-ready': { kind: 'recipe', recipe: 'resolve', params: { variant: 'rain', glyph: 'sparkle' } },
  },
  transition: 'cut',
  tags: ['rain', 'decode', 'terminal', 'reveal'],
  contexts: ['chat', 'terminal', 'card', 'page'],
  collections: [SIGNBOARD, 'ai'],
  addedAt: ADDED_AT,
  ...BUILTIN,
};

const COUNTDOWN: IndicatorSet = {
  id: 'countdown',
  name: 'Countdown',
  description:
    'Digits count down with segments that shrink and grow into the next number, then burst at zero.',
  intent: 'progress',
  cols: 5,
  rows: 7,
  states: {
    idle: { kind: 'recipe', recipe: 'resolve', params: { variant: 'segments', glyph: '0', density: 0.5 } },
    thinking: { kind: 'recipe', recipe: 'resolve', params: { variant: 'segments', glyph: '0-9' } },
    retrying: { kind: 'recipe', recipe: 'resolve', params: { variant: 'segments', glyph: '5-1' } },
    success: { kind: 'recipe', recipe: 'resolve', params: { variant: 'segments-done', glyph: '0' } },
    error: { kind: 'recipe', recipe: 'resolve', params: { variant: 'segments-fail', glyph: '0' } },
  },
  transition: 'cut',
  tags: ['digits', 'countdown', 'retry', 'timer'],
  contexts: ['button', 'inline', 'card', 'terminal', 'splash'],
  collections: [SIGNBOARD],
  addedAt: ADDED_AT,
  ...BUILTIN,
};

const ECG_TRACE: IndicatorSet = {
  id: 'ecg-trace',
  name: 'Heartbeat Trace',
  description: 'A monitor pen sweeps a flat line with a sharp spike, erasing the old trace just ahead of it.',
  intent: 'thinking',
  cols: 16,
  rows: 7,
  states: {
    idle: { kind: 'recipe', recipe: 'columns', params: { variant: 'ecg-slow' } },
    thinking: { kind: 'recipe', recipe: 'columns', params: { variant: 'ecg' } },
    waiting: { kind: 'recipe', recipe: 'columns', params: { variant: 'ecg-skip' } },
    overloaded: { kind: 'recipe', recipe: 'columns', params: { variant: 'ecg-irregular' } },
    success: { kind: 'recipe', recipe: 'columns', params: { variant: 'ecg-rise' } },
    error: { kind: 'recipe', recipe: 'columns', params: { variant: 'ecg-flat' } },
  },
  transition: 'cut',
  tags: ['heartbeat', 'monitor', 'alive', 'terminal'],
  contexts: ['chat', 'card', 'terminal', 'page'],
  collections: [SIGNBOARD, 'term'],
  addedAt: ADDED_AT,
  ...BUILTIN,
};

const SCOPE: IndicatorSet = {
  id: 'scope',
  name: 'Scope',
  description:
    'An oscilloscope dot traces loops and figure-eights with a short trail as the frequency ratio shifts.',
  intent: 'thinking',
  cols: 7,
  rows: 7,
  states: {
    idle: { kind: 'recipe', recipe: 'trace', params: { variant: 'lissajous-1-1', trail: 4 } },
    thinking: { kind: 'recipe', recipe: 'trace', params: { variant: 'lissajous-3-2', trail: 8 } },
    listening: { kind: 'recipe', recipe: 'trace', params: { variant: 'lissajous-1-1-level' } },
    success: { kind: 'recipe', recipe: 'trace', params: { variant: 'lissajous-collapse' } },
    error: { kind: 'recipe', recipe: 'trace', params: { variant: 'flatline' } },
  },
  transition: 'cut',
  tags: ['oscilloscope', 'signal', 'lissajous', 'compact'],
  contexts: ['chat', 'terminal', 'button', 'card', 'inline'],
  collections: [SIGNBOARD, 'term'],
  addedAt: ADDED_AT,
  ...BUILTIN,
};

const SPIROGRAPH: IndicatorSet = {
  id: 'spirograph',
  name: 'Spirograph',
  description:
    'A rosette draws itself dot by dot and un-draws in the same order, a progress bar that becomes a flower.',
  intent: 'progress',
  cols: 9,
  rows: 9,
  states: {
    idle: { kind: 'recipe', recipe: 'trace', params: { variant: 'spiro-rest' } },
    thinking: { kind: 'recipe', recipe: 'trace', params: { variant: 'spiro' } },
    progress: { kind: 'recipe', recipe: 'trace', params: { variant: 'spiro-progress' } },
    success: { kind: 'recipe', recipe: 'trace', params: { variant: 'spiro-complete' } },
    error: { kind: 'recipe', recipe: 'trace', params: { variant: 'spiro-crumble' } },
  },
  transition: 'cut',
  tags: ['spirograph', 'rosette', 'progress', 'generative'],
  contexts: ['card', 'page', 'splash', 'button'],
  collections: [SIGNBOARD],
  addedAt: ADDED_AT,
  ...BUILTIN,
};

/** The Signboard collection's sets: split flaps, word boards, rain decoders, digits and monitor traces. */
export const SIGNBOARD_SETS: readonly IndicatorSet[] = [
  SPLIT_FLAP,
  DEPARTURE_BOARD,
  DECODE,
  COUNTDOWN,
  ECG_TRACE,
  SCOPE,
  SPIROGRAPH,
];
