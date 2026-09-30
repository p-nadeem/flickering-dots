import { createFrameFromPattern } from '../core/recipes/helpers';
import type { FramesStateDef, GridSize, IndicatorSet } from '../core/types';
import { BUILTIN, CHECK_STATE, CROSS_STATE, IDLE_STATE } from './shared';

const NEW_SET_DATE = '2026-09-29';

const TOOL_GRID: GridSize = { cols: 3, rows: 3 };
const TOOL_RING = createFrameFromPattern(['111', '101', '111'], TOOL_GRID);
const TOOL_PLUS = createFrameFromPattern(['010', '111', '010'], TOOL_GRID);
const TOOL_DOT = createFrameFromPattern(['000', '010', '000'], TOOL_GRID);
const TOOL_PAUSE = createFrameFromPattern(['101', '101', '101'], TOOL_GRID);
const TOOL_DASH = createFrameFromPattern(['000', '111', '000'], TOOL_GRID);
const TOOL_BLANK = createFrameFromPattern(['000', '000', '000'], TOOL_GRID);

const ATTENTION_GRID: GridSize = { cols: 5, rows: 5 };
const ATTENTION_PAUSE = createFrameFromPattern(['01010', '01010', '01010', '01010', '01010'], ATTENTION_GRID);
const ATTENTION_MARK = createFrameFromPattern(['00100', '00100', '00100', '00000', '00100'], ATTENTION_GRID);
const ATTENTION_BLANK = createFrameFromPattern(['00000', '00000', '00000', '00000', '00000'], ATTENTION_GRID);

const STATIC_MS = 1000;
const BLINK_MS = 600;
const PAUSE_ON_MS = 1500;
const PAUSE_OFF_MS = 500;
const WARNING_BLINK_MS = 250;
const WARNING_HOLD_MS = 1850;

const TOOL_IDLE: FramesStateDef = { kind: 'frames', frames: [TOOL_RING], durations: [STATIC_MS] };
const TOOL_RUNNING: FramesStateDef = {
  kind: 'frames',
  frames: [TOOL_PLUS, TOOL_DOT],
  durations: [BLINK_MS, BLINK_MS],
};
const TOOL_WAITING: FramesStateDef = {
  kind: 'frames',
  frames: [TOOL_PAUSE, TOOL_BLANK],
  durations: [PAUSE_ON_MS, PAUSE_OFF_MS],
};
const TOOL_CANCELLED: FramesStateDef = { kind: 'frames', frames: [TOOL_DASH], durations: [STATIC_MS] };

const ATTENTION_WAITING: FramesStateDef = {
  kind: 'frames',
  frames: [ATTENTION_PAUSE, ATTENTION_BLANK],
  durations: [PAUSE_ON_MS, PAUSE_OFF_MS],
};
const ATTENTION_WARNING: FramesStateDef = {
  kind: 'frames',
  frames: [ATTENTION_BLANK, ATTENTION_MARK, ATTENTION_BLANK, ATTENTION_MARK],
  durations: [WARNING_BLINK_MS, WARNING_BLINK_MS, WARNING_BLINK_MS, WARNING_HOLD_MS],
};

export const RESULT_PRESETS = [
  {
    id: 'okfail',
    name: 'Done / Failed',
    description: 'A check or a cross drawn stroke by stroke to show how a task ended.',
    intent: 'result',
    cols: 7,
    rows: 7,
    states: {
      idle: IDLE_STATE,
      success: CHECK_STATE,
      error: CROSS_STATE,
    },
    transition: 'flip',
    tags: ['result', 'icons'],
    contexts: ['button', 'inline', 'chat'],
    collections: [],
    addedAt: '2026-08-21',
    ...BUILTIN,
  },
  {
    id: 'tool-call',
    name: 'Tool Call',
    description:
      'A tiny bullet that blinks while a tool runs, then shows done, failed, waiting or cancelled.',
    intent: 'result',
    ...TOOL_GRID,
    states: {
      idle: TOOL_IDLE,
      thinking: TOOL_RUNNING,
      success: CHECK_STATE,
      error: CROSS_STATE,
      waiting: TOOL_WAITING,
      cancelled: TOOL_CANCELLED,
    },
    transition: 'cut',
    tags: ['agent', 'tool', 'terminal', 'status'],
    contexts: ['terminal', 'chat', 'inline'],
    collections: ['agent', 'term'],
    addedAt: NEW_SET_DATE,
    ...BUILTIN,
  },
  {
    id: 'attention',
    name: 'Attention',
    description:
      'A calm set for when an agent needs you: pause bars while waiting, a blinking mark for warnings.',
    intent: 'result',
    ...ATTENTION_GRID,
    states: {
      idle: IDLE_STATE,
      success: CHECK_STATE,
      error: CROSS_STATE,
      waiting: ATTENTION_WAITING,
      warning: ATTENTION_WARNING,
    },
    transition: 'cut',
    tags: ['agent', 'waiting', 'warning', 'status'],
    contexts: ['terminal', 'chat', 'card', 'inline'],
    collections: ['agent'],
    addedAt: NEW_SET_DATE,
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
