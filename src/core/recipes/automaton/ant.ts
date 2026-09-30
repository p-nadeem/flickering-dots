import type { Frame, GridSize } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { drawAnt, rewindAnt, runAnt } from './ant-sim';
import type { AntState } from './ant-sim';
import { RESULT_HOLD_MS, withPoints } from './frames';

const STEPS_PER_CELL = 0.6;
const FORWARD_MS = 40;
const REWIND_MS = 25;
const BLINK_FRAMES = 2;
const REST_BLINK_MS = 500;
const REDRAW_STRIDE = 4;
const HOME_SHARE = 1 / 3;
const HOME_STRIDE = 2;
const PULSE_MS = 160;
const FREEZE_SHARE = 1 / 2;
const FREEZE_RUN_UP = 8;
const FREEZE_BLINK_MS = 200;
const FREEZE_BLINKS = 2;
const PLUS_OFFSETS: readonly Point[] = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];

/** Forward steps of the loop: about 1.2 per cell, rounded to an even count so the blink meets itself at the seam. */
export function getAntSteps(grid: GridSize): number {
  return 2 * Math.round(STEPS_PER_CELL * grid.cols * grid.rows);
}

function isBlinkOn(frameIndex: number): boolean {
  return Math.floor(frameIndex / BLINK_FRAMES) % 2 === 0;
}

function toBlinking(states: readonly AntState[], grid: GridSize): Frame[] {
  return states.map((state, index) => drawAnt(state, grid, isBlinkOn(index)));
}

/** The ant draws for about 1.2 steps per cell, then time runs backward to the empty grid; the ant dot blinks every 2 frames. */
export function generateAnt(grid: GridSize): RecipeOutput {
  const steps = getAntSteps(grid);
  const states = runAnt(grid, steps);
  const rewind = rewindAnt(states[steps], grid, steps - 1);
  const frames = toBlinking([...states.slice(0, steps), ...rewind], grid);
  const durations = frames.map((_, index) => (index < steps ? FORWARD_MS : REWIND_MS));
  return { frames, durations, still: steps };
}

/** The ant alone on the empty grid, blinking slowly. */
export function generateAntRest(grid: GridSize): RecipeOutput {
  const [start] = runAnt(grid, 0);
  return {
    frames: [drawAnt(start, grid, true), drawAnt(start, grid, false)],
    durations: [REST_BLINK_MS, REST_BLINK_MS],
    still: 0,
  };
}

function strideIndexes(last: number, stride: number): number[] {
  const count = Math.ceil(last / stride);
  return [...Array.from({ length: count }, (_, index) => index * stride), last];
}

/** Undo: the pattern is quickly redrawn, then rewound one step per frame back to the empty grid. */
export function generateAntUndo(grid: GridSize): RecipeOutput {
  const steps = getAntSteps(grid);
  const states = runAnt(grid, steps);
  const redraw = strideIndexes(steps, REDRAW_STRIDE)
    .slice(0, -1)
    .map((index) => drawAnt(states[index], grid, true));
  const rewind = toBlinking(rewindAnt(states[steps], grid, steps - 1), grid);
  const frames = [...redraw, ...rewind];
  return { frames, durations: frames.map(() => REWIND_MS), still: redraw.length };
}

function evenSteps(steps: number, share: number): number {
  return 2 * Math.round((steps * share) / 2);
}

/** Success: the rewind finishes early at double speed, then the ant pulses as a plus and settles as a dot. */
export function generateAntHome(grid: GridSize): RecipeOutput {
  const from = evenSteps(getAntSteps(grid), HOME_SHARE);
  const states = runAnt(grid, from);
  const backward = rewindAnt(states[from], grid, from);
  const rewind = strideIndexes(from, HOME_STRIDE).map((index) => drawAnt(backward[index], grid, true));
  const home = rewind[rewind.length - 1];
  const [start] = states;
  const plus = withPoints(
    home,
    grid,
    PLUS_OFFSETS.map(([dx, dy]): Point => [start.x + dx, start.y + dy]),
  );
  const durations = [...rewind.map(() => REWIND_MS), PULSE_MS, RESULT_HOLD_MS];
  return { frames: [...rewind, plus, home], durations };
}

function pickFreezeStep(states: readonly AntState[], grid: GridSize, near: number): number {
  const isVisible = (state: AntState): boolean => state.cells[state.y * grid.cols + state.x] === 0;
  const earlier = Array.from({ length: near + 1 }, (_, offset) => near - offset);
  return earlier.find((step) => isVisible(states[step])) ?? near;
}

/** Error: the scribble stops mid-way, the ant blinks twice and vanishes, leaving the frozen pattern. */
export function generateAntFreeze(grid: GridSize): RecipeOutput {
  const steps = getAntSteps(grid);
  const states = runAnt(grid, steps);
  const stop = pickFreezeStep(states, grid, Math.round(steps * FREEZE_SHARE));
  const runUp = states
    .slice(Math.max(0, stop - FREEZE_RUN_UP), stop + 1)
    .map((state) => drawAnt(state, grid, true));
  const frozen = drawAnt(states[stop], grid, false);
  const blinks = Array.from({ length: FREEZE_BLINKS }, () => [frozen, runUp[runUp.length - 1]]).flat();
  const durations = [...runUp.map(() => FORWARD_MS), ...blinks.map(() => FREEZE_BLINK_MS), RESULT_HOLD_MS];
  return { frames: [...runUp, ...blinks, frozen], durations };
}
