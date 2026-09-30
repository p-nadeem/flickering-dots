import type { IndicatorSet } from '../../core/types';
import { BUILTIN } from '../shared';

const ADDED_AT = '2026-09-29';
const IN_SYNC_LENGTH = 0;
const TRAVEL_LENGTH = 1;
const WAVE_LENGTH = 6;
const PLANETS_ONLY = 2;
const ALL_BODIES = 3;
const ORRERY_HALF_SPEED_FRAMES = 240;

export const PENDULUM_WAVE_SET = {
  id: 'pendulum-wave',
  name: 'Pendulum Wave',
  description:
    'A row of pendulums slips out of step into travelling waves and split rows, then snaps back into one line.',
  intent: 'thinking',
  cols: 12,
  rows: 7,
  states: {
    idle: { kind: 'recipe', recipe: 'columns', params: { variant: 'pendulum', length: IN_SYNC_LENGTH } },
    thinking: { kind: 'recipe', recipe: 'columns', params: { variant: 'pendulum', length: WAVE_LENGTH } },
    success: { kind: 'recipe', recipe: 'columns', params: { variant: 'pendulum-sync' } },
    error: { kind: 'recipe', recipe: 'columns', params: { variant: 'pendulum-drop' } },
    waiting: { kind: 'recipe', recipe: 'columns', params: { variant: 'pendulum', length: TRAVEL_LENGTH } },
  },
  transition: 'flip',
  tags: ['physics', 'pendulum', 'wave', 'order'],
  contexts: ['chat', 'card', 'page', 'splash', 'inline'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const CRADLE_SET = {
  id: 'cradle',
  name: 'Cradle',
  description:
    'Five balls in a row: an end ball swings out, clacks back, and the far ball flies out while the middle stays still.',
  intent: 'thinking',
  cols: 9,
  rows: 4,
  states: {
    idle: { kind: 'recipe', recipe: 'columns', params: { variant: 'cradle-rest' } },
    thinking: { kind: 'recipe', recipe: 'columns', params: { variant: 'cradle' } },
    success: { kind: 'recipe', recipe: 'columns', params: { variant: 'cradle-damp' } },
    error: { kind: 'recipe', recipe: 'columns', params: { variant: 'cradle-lost' } },
    waiting: { kind: 'recipe', recipe: 'columns', params: { variant: 'cradle-slow' } },
  },
  transition: 'cut',
  tags: ['physics', 'compact', 'rhythm', 'desk'],
  contexts: ['inline', 'button', 'chat', 'terminal', 'card'],
  collections: ['nature', 'term'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const HOURGLASS_SET = {
  id: 'hourglass',
  name: 'Hourglass',
  description:
    'Sand drains from a crater through a one-dot neck and piles into a cone below, then the glass turns over.',
  intent: 'progress',
  cols: 9,
  rows: 11,
  states: {
    idle: { kind: 'recipe', recipe: 'granular', params: { variant: 'hourglass-full' } },
    thinking: { kind: 'recipe', recipe: 'granular', params: { variant: 'hourglass' } },
    success: { kind: 'recipe', recipe: 'granular', params: { variant: 'hourglass-done' } },
    error: { kind: 'recipe', recipe: 'granular', params: { variant: 'hourglass-jam' } },
    progress: { kind: 'recipe', recipe: 'granular', params: { variant: 'hourglass-progress' } },
    'rate-limited': { kind: 'recipe', recipe: 'granular', params: { variant: 'hourglass-slow' } },
  },
  transition: 'cut',
  tags: ['hourglass', 'sand', 'timer', 'progress'],
  contexts: ['card', 'page', 'splash', 'button'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;

export const ORRERY_SET = {
  id: 'orrery',
  name: 'Orrery',
  description:
    'A tiny solar system: planets circle a sun at different speeds and a moon circles the outer planet.',
  intent: 'thinking',
  cols: 13,
  rows: 13,
  states: {
    idle: {
      kind: 'recipe',
      recipe: 'trace',
      params: { variant: 'orrery', length: PLANETS_ONLY, frames: ORRERY_HALF_SPEED_FRAMES },
    },
    thinking: { kind: 'recipe', recipe: 'trace', params: { variant: 'orrery', length: ALL_BODIES } },
    success: { kind: 'recipe', recipe: 'trace', params: { variant: 'orrery-align' } },
    error: { kind: 'recipe', recipe: 'trace', params: { variant: 'orrery-escape' } },
    waiting: { kind: 'recipe', recipe: 'trace', params: { variant: 'orrery-eclipse' } },
  },
  transition: 'crossfade',
  tags: ['planets', 'orbit', 'space', 'calm'],
  contexts: ['splash', 'page', 'card'],
  collections: ['nature'],
  addedAt: ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;
