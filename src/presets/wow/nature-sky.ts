import type { IndicatorSet } from '../../core/types';
import { BUILTIN } from '../shared';

const ADDED_AT = '2026-09-29';
const FEW_RAYS_DENSITY = 0.3;
const LIGHT_SNOW_DENSITY = 0.2;

export const DROPLET_SET = {
  id: 'droplet',
  name: 'Droplet',
  description:
    'A drop stretches off a tap, falls faster and faster, and plinks into a surface with a small splash crown.',
  intent: 'loading',
  cols: 9,
  rows: 9,
  states: {
    idle: { kind: 'recipe', recipe: 'particles', params: { variant: 'drip-form' } },
    thinking: { kind: 'recipe', recipe: 'particles', params: { variant: 'drip' } },
    success: { kind: 'recipe', recipe: 'particles', params: { variant: 'drip-fill' } },
    error: { kind: 'recipe', recipe: 'particles', params: { variant: 'drip-miss' } },
  },
  transition: 'cut',
  tags: ['water', 'drop', 'plink', 'nature'],
  contexts: ['chat', 'card', 'inline', 'splash'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const LIGHTNING_SET = {
  id: 'lightning',
  name: 'Lightning',
  description:
    'A jagged leader creeps down feeling for the ground, and when it connects the channel strikes solid.',
  intent: 'thinking',
  cols: 9,
  rows: 13,
  states: {
    idle: { kind: 'recipe', recipe: 'grow', params: { variant: 'leader-crackle' } },
    thinking: { kind: 'recipe', recipe: 'grow', params: { variant: 'leader' } },
    success: { kind: 'recipe', recipe: 'grow', params: { variant: 'leader-strike' } },
    error: { kind: 'recipe', recipe: 'grow', params: { variant: 'leader-strike-out' } },
  },
  transition: 'cut',
  tags: ['lightning', 'power', 'search', 'nature'],
  contexts: ['splash', 'card', 'page', 'chat'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const AURORA_SET = {
  id: 'aurora',
  name: 'Aurora',
  description: 'Curtains of light hang from the top and sway slowly, their tails shimmering as sparse dots.',
  intent: 'thinking',
  cols: 16,
  rows: 9,
  states: {
    idle: { kind: 'recipe', recipe: 'columns', params: { variant: 'aurora', density: FEW_RAYS_DENSITY } },
    thinking: { kind: 'recipe', recipe: 'columns', params: { variant: 'aurora' } },
    success: { kind: 'recipe', recipe: 'columns', params: { variant: 'aurora-full' } },
    error: { kind: 'recipe', recipe: 'columns', params: { variant: 'aurora-fade' } },
    listening: { kind: 'recipe', recipe: 'columns', params: { variant: 'aurora-level' } },
  },
  transition: 'crossfade',
  tags: ['aurora', 'ambient', 'calm', 'sky'],
  contexts: ['splash', 'page', 'card'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const SNOWFALL_SET = {
  id: 'snowfall',
  name: 'Snowfall',
  description: 'Flakes sway down and settle into a lumpy drift that slowly builds, then melts away.',
  intent: 'loading',
  cols: 12,
  rows: 9,
  states: {
    idle: { kind: 'recipe', recipe: 'granular', params: { variant: 'drift', density: LIGHT_SNOW_DENSITY } },
    thinking: { kind: 'recipe', recipe: 'granular', params: { variant: 'drift' } },
    success: { kind: 'recipe', recipe: 'granular', params: { variant: 'drift-settle' } },
    error: { kind: 'recipe', recipe: 'granular', params: { variant: 'drift-blizzard' } },
    progress: { kind: 'recipe', recipe: 'granular', params: { variant: 'drift-progress' } },
  },
  transition: 'crossfade',
  tags: ['snow', 'winter', 'calm', 'accumulate'],
  contexts: ['card', 'chat', 'page', 'splash'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;
