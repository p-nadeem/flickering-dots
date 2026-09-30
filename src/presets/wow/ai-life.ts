import type { IndicatorSet } from '../../core/types';
import { BUILTIN } from '../shared';
import { CRITTER_SET } from './ai-life-critter';
import { AILIFE_ADDED_AT, AILIFE_COLLECTION } from './ai-life-meta';

const BEAM_WIDTH = 2;
const PLANNING_BEAM_WIDTH = 3;
const SPARKLE_FRAMES = 5;

/** The AI life collection: eyes, neurons, search trees and a mascot that make an assistant feel alive. */
export const AILIFE_SETS = [
  {
    id: 'eyes',
    name: 'Robot Eyes',
    description:
      'Two rounded eyes dart left and right, glance up and blink, the product looking back at you.',
    intent: 'thinking',
    cols: 12,
    rows: 8,
    states: {
      idle: { kind: 'recipe', recipe: 'face', params: { variant: 'sleepy' } },
      thinking: { kind: 'recipe', recipe: 'face', params: { variant: 'glance' } },
      success: { kind: 'recipe', recipe: 'face', params: { variant: 'happy' } },
      error: { kind: 'recipe', recipe: 'face', params: { variant: 'angry' } },
      listening: { kind: 'recipe', recipe: 'face', params: { variant: 'wide' } },
      reading: { kind: 'recipe', recipe: 'face', params: { variant: 'read' } },
    },
    transition: 'cut',
    tags: ['eyes', 'face', 'character', 'companion'],
    contexts: ['chat', 'card', 'splash', 'button', 'page'],
    collections: [AILIFE_COLLECTION, 'ai', 'agent'],
    addedAt: AILIFE_ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'synapse',
    name: 'Synapse',
    description:
      'An impulse hops through a small layered network, and each node it reaches fires a spark before passing it on.',
    intent: 'thinking',
    cols: 11,
    rows: 9,
    states: {
      idle: { kind: 'recipe', recipe: 'network', params: { variant: 'synapse-rest' } },
      thinking: { kind: 'recipe', recipe: 'network', params: { variant: 'synapse' } },
      success: { kind: 'recipe', recipe: 'network', params: { variant: 'synapse-forward' } },
      error: { kind: 'recipe', recipe: 'network', params: { variant: 'synapse-drop' } },
      training: { kind: 'recipe', recipe: 'network', params: { variant: 'synapse-train' } },
    },
    transition: 'cut',
    tags: ['neural', 'network', 'ai', 'impulse'],
    contexts: ['chat', 'card', 'page', 'splash'],
    collections: [AILIFE_COLLECTION],
    addedAt: AILIFE_ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'beam-search',
    name: 'Beam Search',
    description:
      'A tree grows up from a root, weak branches retract to their forks, and one path climbs to the top.',
    intent: 'thinking',
    cols: 12,
    rows: 12,
    states: {
      idle: { kind: 'recipe', recipe: 'grow', params: { variant: 'beam-rest' } },
      thinking: { kind: 'recipe', recipe: 'grow', params: { variant: 'beam', length: BEAM_WIDTH } },
      success: { kind: 'recipe', recipe: 'grow', params: { variant: 'beam-win' } },
      error: { kind: 'recipe', recipe: 'grow', params: { variant: 'beam-fail' } },
      planning: { kind: 'recipe', recipe: 'grow', params: { variant: 'beam', length: PLANNING_BEAM_WIDTH } },
    },
    transition: 'flip',
    tags: ['reasoning', 'tree', 'search', 'ai'],
    contexts: ['page', 'splash', 'card'],
    collections: [AILIFE_COLLECTION],
    addedAt: AILIFE_ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'constellation',
    name: 'Constellation',
    description:
      'Stars sparkle into the sky one by one, then lines join them into a constellation before it dissolves.',
    intent: 'thinking',
    cols: 12,
    rows: 12,
    states: {
      idle: { kind: 'recipe', recipe: 'network', params: { variant: 'stars' } },
      thinking: {
        kind: 'recipe',
        recipe: 'network',
        params: { variant: 'constellation', length: SPARKLE_FRAMES },
      },
      success: { kind: 'recipe', recipe: 'network', params: { variant: 'constellation-lock' } },
      error: { kind: 'recipe', recipe: 'network', params: { variant: 'constellation-snap' } },
      idea: { kind: 'recipe', recipe: 'network', params: { variant: 'sparkle-grow' } },
    },
    transition: 'crossfade',
    tags: ['stars', 'connect', 'insight', 'ai'],
    contexts: ['splash', 'page', 'card'],
    collections: [AILIFE_COLLECTION, 'ai'],
    addedAt: AILIFE_ADDED_AT,
    ...BUILTIN,
  },
  CRITTER_SET,
  {
    id: 'morph',
    name: 'Morph',
    description:
      'The thinking dots fly apart along eased paths and become the check or the cross, so the answer grows out of the wait.',
    intent: 'result',
    cols: 9,
    rows: 9,
    states: {
      idle: { kind: 'recipe', recipe: 'idle' },
      thinking: { kind: 'recipe', recipe: 'hop' },
      success: { kind: 'recipe', recipe: 'resolve', params: { variant: 'morph', glyph: 'check' } },
      error: { kind: 'recipe', recipe: 'resolve', params: { variant: 'morph', glyph: 'cross' } },
      retry: { kind: 'recipe', recipe: 'resolve', params: { variant: 'morph', glyph: 'ellipsis' } },
    },
    transition: 'flip',
    tags: ['morph', 'result', 'ai', 'transition'],
    contexts: ['chat', 'button', 'inline', 'card', 'terminal'],
    collections: [AILIFE_COLLECTION, 'ai'],
    addedAt: AILIFE_ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'circuit',
    name: 'Circuit',
    description:
      'Packets of current race along a bent circuit trace to a pad, a picture of a tool call on its way.',
    intent: 'loading',
    cols: 12,
    rows: 7,
    states: {
      idle: { kind: 'recipe', recipe: 'network', params: { variant: 'trace-idle' } },
      thinking: { kind: 'recipe', recipe: 'network', params: { variant: 'circuit' } },
      success: { kind: 'recipe', recipe: 'network', params: { variant: 'circuit-lit' } },
      error: { kind: 'recipe', recipe: 'network', params: { variant: 'circuit-break' } },
      'tool-call': { kind: 'recipe', recipe: 'network', params: { variant: 'circuit-roundtrip' } },
    },
    transition: 'cut',
    tags: ['circuit', 'tool-call', 'signal', 'agent'],
    contexts: ['chat', 'terminal', 'inline', 'card', 'button'],
    collections: [AILIFE_COLLECTION, 'agent', 'term'],
    addedAt: AILIFE_ADDED_AT,
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
