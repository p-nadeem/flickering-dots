import type { IndicatorSet } from '../../../src/core/types';

type ExpectedSet = Omit<IndicatorSet, 'author' | 'source' | 'addedAt'>;

const EYES = { kind: 'recipe', recipe: 'face' } as const;
const NETWORK = { kind: 'recipe', recipe: 'network' } as const;
const GROW = { kind: 'recipe', recipe: 'grow' } as const;
const RESOLVE = { kind: 'recipe', recipe: 'resolve' } as const;

export const EXPECTED_AILIFE: readonly ExpectedSet[] = [
  {
    id: 'eyes',
    name: 'Robot Eyes',
    intent: 'thinking',
    cols: 12,
    rows: 8,
    transition: 'cut',
    states: {
      idle: { ...EYES, params: { variant: 'sleepy' } },
      thinking: { ...EYES, params: { variant: 'glance' } },
      success: { ...EYES, params: { variant: 'happy' } },
      error: { ...EYES, params: { variant: 'angry' } },
      listening: { ...EYES, params: { variant: 'wide' } },
      reading: { ...EYES, params: { variant: 'read' } },
    },
    tags: ['eyes', 'face', 'character', 'companion'],
    contexts: ['chat', 'card', 'splash', 'button', 'page'],
    collections: ['ai-life', 'ai', 'agent'],
  },
  {
    id: 'synapse',
    name: 'Synapse',
    intent: 'thinking',
    cols: 11,
    rows: 9,
    transition: 'cut',
    states: {
      idle: { ...NETWORK, params: { variant: 'synapse-rest' } },
      thinking: { ...NETWORK, params: { variant: 'synapse' } },
      success: { ...NETWORK, params: { variant: 'synapse-forward' } },
      error: { ...NETWORK, params: { variant: 'synapse-drop' } },
      training: { ...NETWORK, params: { variant: 'synapse-train' } },
    },
    tags: ['neural', 'network', 'ai', 'impulse'],
    contexts: ['chat', 'card', 'page', 'splash'],
    collections: ['ai-life'],
  },
  {
    id: 'beam-search',
    name: 'Beam Search',
    intent: 'thinking',
    cols: 12,
    rows: 12,
    transition: 'flip',
    states: {
      idle: { ...GROW, params: { variant: 'beam-rest' } },
      thinking: { ...GROW, params: { variant: 'beam', length: 2 } },
      success: { ...GROW, params: { variant: 'beam-win' } },
      error: { ...GROW, params: { variant: 'beam-fail' } },
      planning: { ...GROW, params: { variant: 'beam', length: 3 } },
    },
    tags: ['reasoning', 'tree', 'search', 'ai'],
    contexts: ['page', 'splash', 'card'],
    collections: ['ai-life'],
  },
  {
    id: 'constellation',
    name: 'Constellation',
    intent: 'thinking',
    cols: 12,
    rows: 12,
    transition: 'crossfade',
    states: {
      idle: { ...NETWORK, params: { variant: 'stars' } },
      thinking: { ...NETWORK, params: { variant: 'constellation', length: 5 } },
      success: { ...NETWORK, params: { variant: 'constellation-lock' } },
      error: { ...NETWORK, params: { variant: 'constellation-snap' } },
      idea: { ...NETWORK, params: { variant: 'sparkle-grow' } },
    },
    tags: ['stars', 'connect', 'insight', 'ai'],
    contexts: ['splash', 'page', 'card'],
    collections: ['ai-life', 'ai'],
  },
  {
    id: 'critter',
    name: 'Critter',
    intent: 'playful',
    cols: 12,
    rows: 12,
    transition: 'cut',
    states: {},
    tags: ['mascot', 'character', 'cute', 'pet'],
    contexts: ['chat', 'card', 'page', 'splash'],
    collections: ['ai-life'],
  },
  {
    id: 'morph',
    name: 'Morph',
    intent: 'result',
    cols: 9,
    rows: 9,
    transition: 'flip',
    states: {
      idle: { kind: 'recipe', recipe: 'idle' },
      thinking: { kind: 'recipe', recipe: 'hop' },
      success: { ...RESOLVE, params: { variant: 'morph', glyph: 'check' } },
      error: { ...RESOLVE, params: { variant: 'morph', glyph: 'cross' } },
      retry: { ...RESOLVE, params: { variant: 'morph', glyph: 'ellipsis' } },
    },
    tags: ['morph', 'result', 'ai', 'transition'],
    contexts: ['chat', 'button', 'inline', 'card', 'terminal'],
    collections: ['ai-life', 'ai'],
  },
  {
    id: 'circuit',
    name: 'Circuit',
    intent: 'loading',
    cols: 12,
    rows: 7,
    transition: 'cut',
    states: {
      idle: { ...NETWORK, params: { variant: 'trace-idle' } },
      thinking: { ...NETWORK, params: { variant: 'circuit' } },
      success: { ...NETWORK, params: { variant: 'circuit-lit' } },
      error: { ...NETWORK, params: { variant: 'circuit-break' } },
      'tool-call': { ...NETWORK, params: { variant: 'circuit-roundtrip' } },
    },
    tags: ['circuit', 'tool-call', 'signal', 'agent'],
    contexts: ['chat', 'terminal', 'inline', 'card', 'button'],
    collections: ['ai-life', 'agent', 'term'],
  },
];

export const CRITTER_STATE_NAMES = ['idle', 'thinking', 'success', 'error', 'waiting'];
