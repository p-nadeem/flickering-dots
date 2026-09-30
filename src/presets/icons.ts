import { createFrameFromPattern } from '../core/recipes/helpers';
import type { GridSize, IndicatorSet } from '../core/types';
import { BUILTIN, CHECK_STATE, CROSS_STATE } from './shared';

const SPARKLE_GRID: GridSize = { cols: 7, rows: 7 };
const SPARKLE_REST_MS = 1500;
const SPARKLE_DOT_MS = 400;
const SPARKLE_STEP_MS = 110;
const SPARKLE_STAR_MS = 360;
const ICON_IDLE_MS = 1000;

const HEART_GRID: GridSize = { cols: 7, rows: 6 };
const HEART_SMALL = createFrameFromPattern(
  ['0000000', '0010100', '0111110', '0011100', '0001000', '0000000'],
  HEART_GRID,
);

const SEND_GRID: GridSize = { cols: 7, rows: 7 };
const SEND_ARROW = createFrameFromPattern(
  ['0000000', '0001000', '0000100', '0111110', '0000100', '0001000', '0000000'],
  SEND_GRID,
);

const SPARKLE_DOT_GLINT = createFrameFromPattern(
  ['0000001', '0000000', '0000000', '0001000', '0000000', '0000000', '0000000'],
  SPARKLE_GRID,
);
const SPARKLE_PLUS_GLINT = createFrameFromPattern(
  ['0000001', '0000000', '0001000', '0011100', '0001000', '0000000', '0000000'],
  SPARKLE_GRID,
);
const SPARKLE_PLUS_SMALL = createFrameFromPattern(
  ['0000000', '0000000', '0001000', '0011100', '0001000', '0000000', '0000000'],
  SPARKLE_GRID,
);
const SPARKLE_PLUS_LARGE = createFrameFromPattern(
  ['0000000', '0001000', '0001000', '0111110', '0001000', '0001000', '0000000'],
  SPARKLE_GRID,
);
const SPARKLE_STAR = createFrameFromPattern(
  ['0001000', '0001000', '0011100', '1111111', '0011100', '0001000', '0001000'],
  SPARKLE_GRID,
);

export const ICON_PRESETS = [
  {
    id: 'sparkle',
    name: 'Sparkle',
    description:
      'A four-point star that swells and twinkles with a small glint in the corner, the AI mark in dots.',
    intent: 'icons',
    ...SPARKLE_GRID,
    states: {
      idle: { kind: 'frames', frames: [SPARKLE_STAR], durations: [SPARKLE_REST_MS] },
      thinking: {
        kind: 'frames',
        frames: [
          SPARKLE_DOT_GLINT,
          SPARKLE_PLUS_GLINT,
          SPARKLE_PLUS_LARGE,
          SPARKLE_STAR,
          SPARKLE_PLUS_LARGE,
          SPARKLE_PLUS_SMALL,
        ],
        durations: [
          SPARKLE_DOT_MS,
          SPARKLE_STEP_MS,
          SPARKLE_STEP_MS,
          SPARKLE_STAR_MS,
          SPARKLE_STEP_MS,
          SPARKLE_STEP_MS,
        ],
      },
      success: CHECK_STATE,
    },
    transition: 'crossfade',
    tags: ['ai', 'sparkle', 'icon', 'star'],
    contexts: ['button', 'inline', 'chat', 'card'],
    collections: ['ai'],
    addedAt: '2026-09-29',
    ...BUILTIN,
  },
  {
    id: 'heart',
    name: 'Heartbeat',
    description: 'A heart that beats twice and rests, for likes and favourites.',
    intent: 'icons',
    ...HEART_GRID,
    states: {
      idle: { kind: 'frames', frames: [HEART_SMALL], durations: [ICON_IDLE_MS] },
      thinking: { kind: 'recipe', recipe: 'heart' },
      success: CHECK_STATE,
    },
    transition: 'crossfade',
    tags: ['icon', 'like'],
    contexts: ['button', 'inline', 'chat'],
    collections: [],
    addedAt: '2026-09-06',
    ...BUILTIN,
  },
  {
    id: 'send',
    name: 'Sending',
    description: 'An arrow that slides to the right while a message sends.',
    intent: 'icons',
    ...SEND_GRID,
    states: {
      idle: { kind: 'frames', frames: [SEND_ARROW], durations: [ICON_IDLE_MS] },
      thinking: { kind: 'recipe', recipe: 'arrow' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['icon', 'send', 'chat'],
    contexts: ['button', 'chat', 'inline'],
    collections: [],
    addedAt: '2026-09-12',
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
