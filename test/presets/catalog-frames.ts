import type {
  Bit,
  ContextId,
  Frame,
  FramesStateDef,
  Intent,
  RecipeId,
  RecipeParams,
  RecipeStateDef,
  StateDef,
  Transition,
} from '../../src/core/types';

export interface CatalogSet {
  id: string;
  name: string;
  description: string;
  intent: Intent;
  cols: number;
  rows: number;
  states: Readonly<Record<string, StateDef>>;
  transition: Transition;
  tags: readonly string[];
  contexts: readonly ContextId[];
  collections: readonly string[];
  addedAt: string;
}

export const NEW_SET_DATE = '2026-09-29';

const LIT = '#';
const STILL_MS = 1000;
const PAUSE_ON_MS = 1500;
const PAUSE_OFF_MS = 500;
const BLINK_MS = 600;
const LISTEN_MS = 500;
const CONNECT_MS = 500;
const WARNING_BLINK_MS = 250;
const WARNING_HOLD_MS = 1850;
const RING_STEP_MS = 90;
const RING_DONE_MS = 600;
const RING_REST_MS = 200;
const SPARKLE_REST_MS = 1500;
const SPARKLE_DOT_MS = 400;
const SPARKLE_STEP_MS = 110;
const SPARKLE_STAR_MS = 360;

export function toRecipe(recipe: RecipeId, params?: RecipeParams): RecipeStateDef {
  return params ? { kind: 'recipe', recipe, params } : { kind: 'recipe', recipe };
}

export function toFullStates(thinking: StateDef): Record<string, StateDef> {
  return { idle: toRecipe('idle'), thinking, success: toRecipe('check'), error: toRecipe('cross') };
}

export function draw(rows: readonly string[]): Frame {
  return rows.flatMap((row) => [...row].map((cell): Bit => (cell === LIT ? 1 : 0)));
}

function blank(cols: number, rows: number): Frame {
  return draw(Array.from({ length: rows }, () => '.'.repeat(cols)));
}

function toFrames(frames: readonly Frame[], durations: readonly number[]): FramesStateDef {
  return { kind: 'frames', frames, durations };
}

export const SHIMMER_IDLE = toFrames([draw(['#.#.#.#.#.#.', '.#.#.#.#.#.#', '#.#.#.#.#.#.'])], [STILL_MS]);

const SKELETON_REST = draw([
  '................',
  '.#.#.#.#.#.#.#.#',
  '................',
  '.#.#.#.#.#.#....',
  '................',
  '.#.#.#.#........',
  '................',
]);

export const SKELETON_IDLE = toFrames([SKELETON_REST], [STILL_MS]);

const EQ_BLANK = '.........';
const EQ_REST = '#.#.#.#.#';
const EQ_IDLE = draw([EQ_BLANK, EQ_BLANK, EQ_BLANK, EQ_REST, EQ_BLANK, EQ_BLANK, EQ_BLANK]);
const EQ_CENTRE = draw([EQ_BLANK, EQ_BLANK, '....#....', EQ_REST, '....#....', EQ_BLANK, EQ_BLANK]);
const EQ_OUTER = draw([EQ_BLANK, EQ_BLANK, '#.......#', EQ_REST, '#.......#', EQ_BLANK, EQ_BLANK]);
const EQ_INNER = draw([EQ_BLANK, EQ_BLANK, '..#...#..', EQ_REST, '..#...#..', EQ_BLANK, EQ_BLANK]);
const EQ_MIDDLE = draw([EQ_BLANK, '....#....', '....#....', EQ_REST, '....#....', '....#....', EQ_BLANK]);

export const EQUALIZER_STATES = {
  idle: toFrames([EQ_IDLE], [STILL_MS]),
  listening: toFrames([EQ_CENTRE, EQ_IDLE], [LISTEN_MS, LISTEN_MS]),
  connecting: toFrames(
    [EQ_OUTER, EQ_INNER, EQ_MIDDLE, EQ_INNER],
    [CONNECT_MS, CONNECT_MS, CONNECT_MS, CONNECT_MS],
  ),
};

const RING_SIDE = 5;
const RING_CENTRE = [2, 2] as const;
const RING_ORDER = [
  [2, 0],
  [3, 0],
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [3, 4],
  [2, 4],
  [1, 4],
  [0, 4],
  [0, 3],
  [0, 2],
  [0, 1],
  [0, 0],
  [1, 0],
] as const;

function lightCells(cells: readonly (readonly [number, number])[]): Frame {
  const lit = new Set(cells.map(([x, y]) => y * RING_SIDE + x));
  return blank(RING_SIDE, RING_SIDE).map((_, index): Bit => (lit.has(index) ? 1 : 0));
}

export const RING_FILL_THINKING = toFrames(
  [
    ...RING_ORDER.map((_, index) => lightCells(RING_ORDER.slice(0, index + 1))),
    lightCells([...RING_ORDER, RING_CENTRE]),
    blank(RING_SIDE, RING_SIDE),
  ],
  [...RING_ORDER.map(() => RING_STEP_MS), RING_DONE_MS, RING_REST_MS],
);

const TOOL_BLANK = blank(3, 3);

export const TOOL_CALL_STATES = {
  idle: toFrames([draw(['###', '#.#', '###'])], [STILL_MS]),
  thinking: toFrames([draw(['.#.', '###', '.#.']), draw(['...', '.#.', '...'])], [BLINK_MS, BLINK_MS]),
  success: toRecipe('check'),
  error: toRecipe('cross'),
  waiting: toFrames([draw(['#.#', '#.#', '#.#']), TOOL_BLANK], [PAUSE_ON_MS, PAUSE_OFF_MS]),
  cancelled: toFrames([draw(['...', '###', '...'])], [STILL_MS]),
};

const ATTENTION_BLANK = blank(5, 5);
const ATTENTION_MARK = draw(['..#..', '..#..', '..#..', '.....', '..#..']);

export const ATTENTION_STATES = {
  idle: toRecipe('idle'),
  success: toRecipe('check'),
  error: toRecipe('cross'),
  waiting: toFrames(
    [draw(['.#.#.', '.#.#.', '.#.#.', '.#.#.', '.#.#.']), ATTENTION_BLANK],
    [PAUSE_ON_MS, PAUSE_OFF_MS],
  ),
  warning: toFrames(
    [ATTENTION_BLANK, ATTENTION_MARK, ATTENTION_BLANK, ATTENTION_MARK],
    [WARNING_BLINK_MS, WARNING_BLINK_MS, WARNING_BLINK_MS, WARNING_HOLD_MS],
  ),
};

const SPARKLE_DOT = draw(['......#', '.......', '.......', '...#...', '.......', '.......', '.......']);
const SPARKLE_PLUS_GLINT = draw([
  '......#',
  '.......',
  '...#...',
  '..###..',
  '...#...',
  '.......',
  '.......',
]);
const SPARKLE_PLUS_SMALL = draw([
  '.......',
  '.......',
  '...#...',
  '..###..',
  '...#...',
  '.......',
  '.......',
]);
const SPARKLE_PLUS_LARGE = draw([
  '.......',
  '...#...',
  '...#...',
  '.#####.',
  '...#...',
  '...#...',
  '.......',
]);
const SPARKLE_STAR = draw(['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...']);

export const SPARKLE_STATES = {
  idle: toFrames([SPARKLE_STAR], [SPARKLE_REST_MS]),
  thinking: toFrames(
    [
      SPARKLE_DOT,
      SPARKLE_PLUS_GLINT,
      SPARKLE_PLUS_LARGE,
      SPARKLE_STAR,
      SPARKLE_PLUS_LARGE,
      SPARKLE_PLUS_SMALL,
    ],
    [SPARKLE_DOT_MS, SPARKLE_STEP_MS, SPARKLE_STEP_MS, SPARKLE_STAR_MS, SPARKLE_STEP_MS, SPARKLE_STEP_MS],
  ),
  success: toRecipe('check'),
};

export const HEART_IDLE = toFrames(
  [draw(['.......', '..#.#..', '.#####.', '..###..', '...#...', '.......'])],
  [STILL_MS],
);

export const SEND_IDLE = toFrames(
  [draw(['.......', '...#...', '....#..', '.#####.', '....#..', '...#...', '.......'])],
  [STILL_MS],
);

export const FILL_BAR_IDLE = toFrames([draw(['............', '############', '............'])], [STILL_MS]);

export const STEPS_IDLE = toFrames([draw(['.........', '#.#.#.#.#', '.........'])], [STILL_MS]);
