import { frameFromRows } from '../core/codec';
import type { IndicatorSet } from '../core/types';
import { BUILTIN, CHECK_STATE, CROSS_STATE, IDLE_STATE } from './shared';

const ADDED_AT = '2026-09-29';
const STILL_MS = 1000;
const LISTEN_MS = 500;
const CONNECT_MS = 500;
const SHIMMER_BAND = 4;
const ARC_TRAIL = 6;

const SKELETON_COLS = 16;
const SKELETON_LONG = 0b0101010101010101;
const SKELETON_MID = 0b0101010101010000;
const SKELETON_SHORT = 0b0101010100000000;
const SKELETON_IDLE = frameFromRows([0, SKELETON_LONG, 0, SKELETON_MID, 0, SKELETON_SHORT, 0], SKELETON_COLS);

const EQ_COLS = 9;
const EQ_REST = 0b101010101;
const EQ_IDLE = frameFromRows([0, 0, 0, EQ_REST, 0, 0, 0], EQ_COLS);
const EQ_CENTRE = frameFromRows([0, 0, 0b000010000, EQ_REST, 0b000010000, 0, 0], EQ_COLS);
const EQ_OUTER = frameFromRows([0, 0, 0b100000001, EQ_REST, 0b100000001, 0, 0], EQ_COLS);
const EQ_INNER = frameFromRows([0, 0, 0b001000100, EQ_REST, 0b001000100, 0, 0], EQ_COLS);
const EQ_MIDDLE = frameFromRows([0, 0b000010000, 0b000010000, EQ_REST, 0b000010000, 0b000010000, 0], EQ_COLS);

export const LOADING_PRESETS = [
  {
    id: 'braille',
    name: 'Braille Spinner',
    description: 'Three dots chase around a tiny ring, the classic terminal spinner redrawn in dots.',
    intent: 'loading',
    cols: 3,
    rows: 3,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'snake' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'cut',
    tags: ['spinner', 'terminal', 'compact', 'braille'],
    contexts: ['terminal', 'inline', 'button', 'chat'],
    collections: ['term', 'minimal'],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'arc',
    name: 'Arc Spinner',
    description: 'A long arc that turns around a round ring, the everyday loading spinner in dots.',
    intent: 'loading',
    cols: 9,
    rows: 9,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'orbit', params: { trail: ARC_TRAIL } },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['spinner', 'ring', 'loop'],
    contexts: ['button', 'card', 'page', 'chat'],
    collections: [],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'orbit',
    name: 'Orbit',
    description: 'A dot with a short tail that circles a round ring.',
    intent: 'loading',
    cols: 7,
    rows: 7,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'orbit' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['spinner', 'loop'],
    contexts: ['button', 'page', 'card'],
    collections: [],
    addedAt: '2026-08-14',
    ...BUILTIN,
  },
  {
    id: 'scanner',
    name: 'Scanner',
    description: 'A bright bar with a short tail glides left and right, pausing at each end.',
    intent: 'loading',
    cols: 10,
    rows: 3,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'scanner' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['scanner', 'bar', 'terminal', 'indeterminate'],
    contexts: ['terminal', 'button', 'inline', 'page'],
    collections: ['term'],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'equalizer',
    name: 'Equalizer',
    description:
      'Bars that rise and fall like a level meter, with listening and connecting states for voice.',
    intent: 'loading',
    cols: EQ_COLS,
    rows: 7,
    states: {
      idle: { kind: 'frames', frames: [EQ_IDLE], durations: [STILL_MS] },
      thinking: { kind: 'recipe', recipe: 'bars' },
      listening: { kind: 'frames', frames: [EQ_CENTRE, EQ_IDLE], durations: [LISTEN_MS, LISTEN_MS] },
      connecting: {
        kind: 'frames',
        frames: [EQ_OUTER, EQ_INNER, EQ_MIDDLE, EQ_INNER],
        durations: [CONNECT_MS, CONNECT_MS, CONNECT_MS, CONNECT_MS],
      },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'crossfade',
    tags: ['voice', 'audio', 'bars', 'agent'],
    contexts: ['chat', 'card', 'button', 'page'],
    collections: ['agent'],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'skeleton',
    name: 'Skeleton Lines',
    description: 'Three ragged lines of dots with a shimmer passing over them while content loads.',
    intent: 'loading',
    cols: SKELETON_COLS,
    rows: 7,
    states: {
      idle: { kind: 'frames', frames: [SKELETON_IDLE], durations: [STILL_MS] },
      thinking: { kind: 'recipe', recipe: 'shimmer', params: { trail: SHIMMER_BAND } },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'crossfade',
    tags: ['skeleton', 'placeholder', 'wide', 'content'],
    contexts: ['card', 'page', 'chat'],
    collections: [],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'grid-wave',
    name: 'Grid Wave',
    description: 'A three by three grid of blocks that blinks out and back in a diagonal wave.',
    intent: 'loading',
    cols: 8,
    rows: 8,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'cascade' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'crossfade',
    tags: ['grid', 'cube', 'wave'],
    contexts: ['card', 'page', 'chat', 'button'],
    collections: [],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'A short snake that runs around the border of a 5×5 grid.',
    intent: 'loading',
    cols: 5,
    rows: 5,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'snake' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['terminal', 'spinner', 'compact'],
    contexts: ['terminal', 'button', 'inline'],
    collections: ['term'],
    addedAt: '2026-08-24',
    ...BUILTIN,
  },
  {
    id: 'ripple',
    name: 'Ripple',
    description: 'Rings that spread out from the centre one at a time, then a short pause.',
    intent: 'loading',
    cols: 9,
    rows: 9,
    states: {
      idle: IDLE_STATE,
      thinking: { kind: 'recipe', recipe: 'ripple' },
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'crossfade',
    tags: ['ring', 'splash'],
    contexts: ['page', 'splash', 'card'],
    collections: [],
    addedAt: '2026-08-31',
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
