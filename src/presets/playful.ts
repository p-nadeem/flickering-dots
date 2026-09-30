import type { IndicatorSet } from '../core/types';
import { BUILTIN, CHECK_STATE, CROSS_STATE, IDLE_STATE } from './shared';

const LIFE_GLIDER_FLEET = 0;
const LIFE_LOOP_FRAMES = 48;

export const PLAYFUL_PRESETS = [
  {
    id: 'bounce',
    name: 'Bounce',
    description: 'A ball that bounces across the grid with a dot trailing behind it.',
    intent: 'playful',
    cols: 8,
    rows: 6,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'bounce', params: { trail: 1 } },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['ball', 'fun'],
    contexts: ['button', 'card', 'splash'],
    collections: [],
    addedAt: '2026-09-26',
    ...BUILTIN,
  },
  {
    id: 'life',
    name: 'Life',
    description: "Conway's Game of Life playing out on a 12×12 grid.",
    intent: 'playful',
    cols: 12,
    rows: 12,
    states: {
      thinking: {
        kind: 'recipe',
        recipe: 'life',
        params: { density: LIFE_GLIDER_FLEET, frames: LIFE_LOOP_FRAMES },
      },
    },
    transition: 'cut',
    tags: ['generative', 'conway'],
    contexts: ['page', 'splash'],
    collections: [],
    addedAt: '2026-09-14',
    ...BUILTIN,
  },
  {
    id: 'rain',
    name: 'Rain',
    description: 'Drops that fall down every column at different speeds.',
    intent: 'playful',
    cols: 8,
    rows: 8,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'rain' },
    },
    transition: 'crossfade',
    tags: ['weather', 'ambient'],
    contexts: ['page', 'splash', 'card'],
    collections: [],
    addedAt: '2026-09-25',
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
