import { createFrameFromPattern } from '../core/recipes/helpers';
import type { FramesStateDef, Frame, GridSize, IndicatorSet } from '../core/types';
import { BUILTIN, CHECK_STATE, CROSS_STATE, IDLE_STATE } from './shared';

const NEW_SET_DATE = '2026-09-29';
const RING_CELLS = 16;
const RING_STEP_MS = 90;
const RING_DONE_MS = 600;
const RING_REST_MS = 200;
const TRACK_IDLE_MS = 1000;

const FILL_BAR_GRID: GridSize = { cols: 12, rows: 3 };
const STEPS_GRID: GridSize = { cols: 9, rows: 3 };

const FILL_BAR_IDLE: FramesStateDef = {
  kind: 'frames',
  frames: [createFrameFromPattern(['000000000000', '111111111111', '000000000000'], FILL_BAR_GRID)],
  durations: [TRACK_IDLE_MS],
};

const STEPS_IDLE: FramesStateDef = {
  kind: 'frames',
  frames: [createFrameFromPattern(['000000000', '101010101', '000000000'], STEPS_GRID)],
  durations: [TRACK_IDLE_MS],
};

const RING_FILL_FRAMES = [
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
] as const satisfies readonly Frame[];

const RING_FILL_DURATIONS = [
  ...Array.from({ length: RING_CELLS }, () => RING_STEP_MS),
  RING_DONE_MS,
  RING_REST_MS,
] as const satisfies readonly number[];

export const PROGRESS_PRESETS = [
  {
    id: 'fill-bar',
    name: 'Progress Bar',
    description: 'A thin track that fills column by column, flashes when full, then starts again.',
    intent: 'progress',
    ...FILL_BAR_GRID,
    states: {
      idle: FILL_BAR_IDLE,
      thinking: { kind: 'recipe', recipe: 'fill' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'cut',
    tags: ['progress', 'bar', 'determinate', 'terminal'],
    contexts: ['terminal', 'card', 'page', 'button'],
    collections: ['term'],
    addedAt: NEW_SET_DATE,
    ...BUILTIN,
  },
  {
    id: 'type',
    name: 'Typewriter',
    description: 'Dot-words stream out behind a steady caret, like a reply being written.',
    intent: 'progress',
    cols: 10,
    rows: 3,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'typewriter' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'cut',
    tags: ['progress', 'text', 'terminal'],
    contexts: ['terminal', 'inline', 'chat'],
    collections: ['term'],
    addedAt: '2026-09-22',
    ...BUILTIN,
  },
  {
    id: 'steps',
    name: 'Steps',
    description: 'A row of step dots: finished steps stand tall, the current one blinks.',
    intent: 'progress',
    ...STEPS_GRID,
    states: {
      idle: STEPS_IDLE,
      thinking: { kind: 'recipe', recipe: 'fill', params: { length: 5 } },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'cut',
    tags: ['steps', 'progress', 'agent', 'multi-step'],
    contexts: ['terminal', 'chat', 'inline', 'card'],
    collections: ['minimal', 'agent'],
    addedAt: NEW_SET_DATE,
    ...BUILTIN,
  },
  {
    id: 'ring-fill',
    name: 'Ring Fill',
    description: 'Dots light clockwise around a small ring until it closes, then a centre dot marks done.',
    intent: 'progress',
    cols: 5,
    rows: 5,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'frames', frames: RING_FILL_FRAMES, durations: RING_FILL_DURATIONS },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['progress', 'ring', 'determinate', 'compact'],
    contexts: ['button', 'inline', 'chat', 'card'],
    collections: [],
    addedAt: NEW_SET_DATE,
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
