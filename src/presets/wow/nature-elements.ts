import type { IndicatorSet } from '../../core/types';
import { BUILTIN } from '../shared';

const ADDED_AT = '2026-09-29';
const PILOT_DENSITY = 0.25;
const FLAME_DENSITY = 0.65;
const BLAZE_DENSITY = 0.85;
const BUBBLER_DENSITY = 0.3;
const STILL_SLOSH_AMPLITUDE = 0.3;
const FIREWORKS_CELEBRATE_SHELLS = 3;

export const CAMPFIRE_SET = {
  id: 'campfire',
  name: 'Campfire',
  description:
    'A living fire: a solid ember bed with ragged flame tongues that lick upward and throw sparks.',
  intent: 'thinking',
  cols: 8,
  rows: 8,
  states: {
    idle: { kind: 'recipe', recipe: 'automaton', params: { variant: 'fire', density: PILOT_DENSITY } },
    thinking: { kind: 'recipe', recipe: 'automaton', params: { variant: 'fire', density: FLAME_DENSITY } },
    success: { kind: 'recipe', recipe: 'automaton', params: { variant: 'fire-out' } },
    error: { kind: 'recipe', recipe: 'automaton', params: { variant: 'fire-gutter' } },
    'working-hard': {
      kind: 'recipe',
      recipe: 'automaton',
      params: { variant: 'fire', density: BLAZE_DENSITY },
    },
  },
  transition: 'crossfade',
  tags: ['fire', 'warm', 'compile', 'nature'],
  contexts: ['splash', 'page', 'card', 'terminal'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const FIREWORKS_SET = {
  id: 'fireworks',
  name: 'Fireworks',
  description: 'A spark climbs, pauses and bursts into a ring that droops under gravity and twinkles out.',
  intent: 'result',
  cols: 11,
  rows: 11,
  states: {
    idle: { kind: 'recipe', recipe: 'particles', params: { variant: 'ember' } },
    thinking: { kind: 'recipe', recipe: 'particles', params: { variant: 'fuse' } },
    success: { kind: 'recipe', recipe: 'particles', params: { variant: 'burst' } },
    error: { kind: 'recipe', recipe: 'particles', params: { variant: 'dud' } },
    celebrate: {
      kind: 'recipe',
      recipe: 'particles',
      params: { variant: 'burst', length: FIREWORKS_CELEBRATE_SHELLS },
    },
  },
  transition: 'cut',
  tags: ['celebrate', 'fireworks', 'launch', 'particles'],
  contexts: ['splash', 'page', 'card', 'chat'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const FOUNTAIN_SET = {
  id: 'fountain',
  name: 'Fountain',
  description:
    'A jet shoots up from a nozzle, arcs over on both sides and splashes into a basin, breathing with the pressure.',
  intent: 'loading',
  cols: 11,
  rows: 11,
  states: {
    idle: { kind: 'recipe', recipe: 'particles', params: { variant: 'jet', density: BUBBLER_DENSITY } },
    thinking: { kind: 'recipe', recipe: 'particles', params: { variant: 'jet' } },
    success: { kind: 'recipe', recipe: 'particles', params: { variant: 'jet-burst' } },
    error: { kind: 'recipe', recipe: 'particles', params: { variant: 'jet-sputter' } },
    progress: { kind: 'recipe', recipe: 'particles', params: { variant: 'jet-progress' } },
  },
  transition: 'crossfade',
  tags: ['water', 'fountain', 'particles', 'calm'],
  contexts: ['splash', 'card', 'page'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const SLOSH_SET = {
  id: 'slosh',
  name: 'Slosh',
  description:
    'A tank of liquid whose surface tilts and sloshes as the level rises, a fill bar with physics.',
  intent: 'progress',
  cols: 9,
  rows: 9,
  states: {
    idle: { kind: 'recipe', recipe: 'columns', params: { variant: 'slosh', density: STILL_SLOSH_AMPLITUDE } },
    thinking: { kind: 'recipe', recipe: 'columns', params: { variant: 'slosh-cycle' } },
    success: { kind: 'recipe', recipe: 'columns', params: { variant: 'slosh-full' } },
    error: { kind: 'recipe', recipe: 'columns', params: { variant: 'slosh-drain' } },
    progress: { kind: 'recipe', recipe: 'columns', params: { variant: 'slosh-progress' } },
  },
  transition: 'crossfade',
  tags: ['liquid', 'fill', 'progress', 'physics'],
  contexts: ['card', 'button', 'page', 'inline'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;
