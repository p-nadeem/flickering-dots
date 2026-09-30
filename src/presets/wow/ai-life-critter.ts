import type { IndicatorSet } from '../../core/types';
import { BUILTIN } from '../shared';
import {
  CRITTER_ERR_HURT,
  CRITTER_ERR_LAND,
  CRITTER_ERR_MELT_2,
  CRITTER_ERR_MELT_3,
  CRITTER_ERR_MELT_4,
  CRITTER_ERR_PUDDLE,
  CRITTER_ERR_SWEAT,
  CRITTER_WIN_GLINT,
  CRITTER_WIN_HOLD,
  CRITTER_WIN_JUMP,
  CRITTER_WIN_LAND,
  CRITTER_WIN_SPARKLE,
} from './ai-life-critter-moods';
import {
  CRITTER_GRID,
  CRITTER_IDLE_AIR,
  CRITTER_IDLE_NORMAL,
  CRITTER_IDLE_SQUASH,
  CRITTER_IDLE_STRETCH,
  CRITTER_THINK_TAP,
  CRITTER_THINK_TAP_Q,
  CRITTER_THINK_UP,
  CRITTER_THINK_UP_Q,
  CRITTER_WAIT_0,
  CRITTER_WAIT_1,
  CRITTER_WAIT_2,
  CRITTER_WAIT_3,
  CRITTER_WAIT_NONE,
} from './ai-life-critter-moves';
import { AILIFE_ADDED_AT, AILIFE_COLLECTION } from './ai-life-meta';

const REST_MS = 300;
const SQUASH_MS = 100;
const STRETCH_MS = 100;
const AIRBORNE_MS = 150;
const TAP_MS = 200;
const DRIFT_MS = 400;
const JUMP_SQUASH_MS = 80;
const JUMP_MS = 120;
const RESULT_HOLD_MS = 1200;
const HURT_MS = 300;
const SWEAT_MS = 120;
const MELT_MS = 90;

/** The Critter mascot: a blob that hops, ponders, dozes, jumps for joy or melts, drawn as explicit 12x12 frames. */
export const CRITTER_SET = {
  id: 'critter',
  name: 'Critter',
  description:
    'A small blob mascot that hops, scratches its head over a question mark, jumps for joy or melts on error.',
  intent: 'playful',
  ...CRITTER_GRID,
  states: {
    idle: {
      kind: 'frames',
      frames: [CRITTER_IDLE_NORMAL, CRITTER_IDLE_SQUASH, CRITTER_IDLE_STRETCH, CRITTER_IDLE_AIR],
      durations: [REST_MS, SQUASH_MS, STRETCH_MS, AIRBORNE_MS],
    },
    thinking: {
      kind: 'frames',
      frames: [
        CRITTER_THINK_TAP_Q,
        CRITTER_THINK_UP_Q,
        CRITTER_THINK_TAP,
        CRITTER_THINK_UP_Q,
        CRITTER_THINK_TAP_Q,
        CRITTER_THINK_UP,
      ],
      durations: [TAP_MS, TAP_MS, TAP_MS, TAP_MS, TAP_MS, TAP_MS],
    },
    success: {
      kind: 'frames',
      frames: [
        CRITTER_IDLE_SQUASH,
        CRITTER_WIN_JUMP,
        CRITTER_WIN_GLINT,
        CRITTER_WIN_SPARKLE,
        CRITTER_WIN_LAND,
        CRITTER_WIN_HOLD,
      ],
      durations: [JUMP_SQUASH_MS, JUMP_MS, JUMP_MS, JUMP_MS, JUMP_SQUASH_MS, RESULT_HOLD_MS],
    },
    error: {
      kind: 'frames',
      frames: [
        CRITTER_ERR_HURT,
        CRITTER_ERR_SWEAT,
        CRITTER_ERR_MELT_4,
        CRITTER_ERR_MELT_3,
        CRITTER_ERR_MELT_2,
        CRITTER_ERR_LAND,
        CRITTER_ERR_PUDDLE,
      ],
      durations: [HURT_MS, SWEAT_MS, MELT_MS, MELT_MS, MELT_MS, MELT_MS, RESULT_HOLD_MS],
    },
    waiting: {
      kind: 'frames',
      frames: [CRITTER_WAIT_3, CRITTER_WAIT_2, CRITTER_WAIT_1, CRITTER_WAIT_0, CRITTER_WAIT_NONE],
      durations: [DRIFT_MS, DRIFT_MS, DRIFT_MS, DRIFT_MS, DRIFT_MS],
    },
  },
  transition: 'cut',
  tags: ['mascot', 'character', 'cute', 'pet'],
  contexts: ['chat', 'card', 'page', 'splash'],
  collections: [AILIFE_COLLECTION],
  addedAt: AILIFE_ADDED_AT,
  ...BUILTIN,
} as const satisfies IndicatorSet;
