import type { GridSize } from '../../types';
import { generateCheck } from '../check';
import type { Point, RecipeFn, RecipeOutput } from '../helpers';
import { defineVariant, lcm, stepsToOutput, triangle } from './shared';
import type { ArcadeStep } from './shared';

interface Court {
  cols: number;
  rows: number;
  spanX: number;
  spanY: number;
  phase: number;
  centre: number;
}

interface Paddles {
  left: number;
  right: number;
}

const RALLY_MIN: GridSize = { cols: 7, rows: 5 };
const PADDLE_REACH = 1;
const BALL_LEFT = 1;
const STEP_MS = 90;
const SERVE_BOB_MS = 600;
const WAIT_ON_MS = 400;
const WAIT_OFF_MS = 300;
const SLOWDOWN_MS = 40;
const SLOW_STEPS = 3;
const REST_HOLD_MS = 300;
const EXIT_GONE_MS = 200;
const SHAKE_MS = 100;
const MISS_HOLD_MS = 600;
const SHAKES = [-1, 0, -1, 0];

function getCourt({ cols, rows }: GridSize): Court {
  const spanX = ballRight(cols) - BALL_LEFT;
  const spanY = rows - 1;
  return {
    cols,
    rows,
    spanX,
    spanY,
    phase: spanX === spanY ? 1 : 0,
    centre: clampPaddle(rows, (rows - 1) / 2),
  };
}

function ballRight(cols: number): number {
  return cols - 1 - BALL_LEFT;
}

function clampPaddle(rows: number, y: number): number {
  return Math.min(rows - 1 - PADDLE_REACH, Math.max(PADDLE_REACH, Math.floor(y)));
}

function moveToward(from: number, to: number, step: number): number {
  return from + Math.sign(to - from) * Math.min(step, Math.abs(to - from));
}

function scene(court: Court, paddles: Paddles, ball: Point | null): Point[] {
  const reach = [-PADDLE_REACH, 0, PADDLE_REACH];
  const left = reach.map((dy): Point => [0, paddles.left + dy]);
  const right = reach.map((dy): Point => [court.cols - 1, paddles.right + dy]);
  return [...left, ...right, ...(ball === null ? [] : [ball])];
}

function ballAt(court: Court, frame: number): Point {
  return [BALL_LEFT + triangle(frame, court.spanX), triangle(frame + court.phase, court.spanY)];
}

function framesToHit(court: Court, frame: number, side: 'left' | 'right'): number | null {
  const lap = 2 * court.spanX;
  const u = ((frame % lap) + lap) % lap;
  if (side === 'right') return u > 0 && u <= court.spanX ? court.spanX - u : null;
  return u === 0 ? 0 : u > court.spanX ? lap - u : null;
}

function nextPaddle(court: Court, frame: number, side: 'left' | 'right', from: number): number {
  const ahead = framesToHit(court, frame, side);
  if (ahead === null) return moveToward(from, court.centre, 1);
  const target = clampPaddle(court.rows, ballAt(court, frame + ahead)[1]);
  return moveToward(from, target, Math.ceil(Math.abs(target - from) / (ahead + 1)));
}

function playRally(court: Court, period: number, start: Paddles): { steps: ArcadeStep[]; end: Paddles } {
  return Array.from({ length: period }, (_, frame) => frame).reduce<{ steps: ArcadeStep[]; end: Paddles }>(
    ({ steps, end }, frame) => {
      const paddles = {
        left: nextPaddle(court, frame, 'left', end.left),
        right: nextPaddle(court, frame, 'right', end.right),
      };
      return {
        steps: [...steps, { points: scene(court, paddles, ballAt(court, frame)), ms: STEP_MS }],
        end: paddles,
      };
    },
    { steps: [], end: start },
  );
}

function rallyThinking(grid: GridSize): RecipeOutput {
  const court = getCourt(grid);
  const period = lcm(2 * court.spanX, 2 * court.spanY);
  const warmUp = playRally(court, period, { left: court.centre, right: court.centre });
  return stepsToOutput(grid, playRally(court, period, warmUp.end).steps);
}

function rallyServe(grid: GridSize): RecipeOutput {
  const court = getCourt(grid);
  const paddles = { left: court.centre, right: court.centre };
  return stepsToOutput(grid, [
    { points: scene(court, paddles, [BALL_LEFT, court.centre]), ms: SERVE_BOB_MS },
    { points: scene(court, paddles, [BALL_LEFT, court.centre - 1]), ms: SERVE_BOB_MS },
  ]);
}

function rallyWait(grid: GridSize): RecipeOutput {
  const court = getCourt(grid);
  const paddles = { left: court.centre, right: court.centre };
  return stepsToOutput(grid, [
    { points: scene(court, paddles, [ballRight(grid.cols), court.centre]), ms: WAIT_ON_MS },
    { points: scene(court, paddles, null), ms: WAIT_OFF_MS },
  ]);
}

function rallyRest(grid: GridSize): RecipeOutput {
  const court = getCourt(grid);
  const [startX, startY] = ballAt(court, 0);
  const start = { left: clampPaddle(grid.rows, startY), right: court.centre };
  const target: Point = [Math.floor((grid.cols - 1) / 2), Math.floor((grid.rows - 1) / 2)];
  const count = Math.max(
    target[0] - startX,
    Math.abs(target[1] - startY),
    Math.abs(start.left - court.centre),
  );
  const approach = Array.from({ length: count + 1 }, (_, step): ArcadeStep => {
    const paddles = { left: moveToward(start.left, court.centre, step), right: court.centre };
    const ball: Point = [moveToward(startX, target[0], step), moveToward(startY, target[1], step)];
    const slowing = Math.max(0, step - (count - SLOW_STEPS));
    return {
      points: scene(court, paddles, ball),
      ms: step === count ? REST_HOLD_MS : STEP_MS + slowing * SLOWDOWN_MS,
    };
  });
  const scenes = stepsToOutput(grid, approach);
  const check = generateCheck(grid);
  return {
    frames: [...scenes.frames, ...check.frames],
    durations: [...scenes.durations, ...check.durations],
  };
}

function rallyMiss(grid: GridSize): RecipeOutput {
  const court = getCourt(grid);
  const exitStep = grid.cols - 1 - BALL_LEFT;
  const wrongWay = clampPaddle(grid.rows, grid.rows);
  const flight = Array.from({ length: exitStep + 1 }, (_, step): ArcadeStep => {
    const ballY = triangle(exitStep - step, court.spanY);
    const paddles = {
      left: moveToward(clampPaddle(grid.rows, triangle(exitStep, court.spanY)), court.centre, step),
      right: moveToward(court.centre, wrongWay, step),
    };
    return { points: scene(court, paddles, [BALL_LEFT + step, ballY]), ms: STEP_MS };
  });
  const rest = { left: court.centre, right: wrongWay };
  const shake = SHAKES.map((dy, index): ArcadeStep => ({
    points: scene(court, { ...rest, right: rest.right + dy }, null),
    ms: index === SHAKES.length - 1 ? MISS_HOLD_MS : SHAKE_MS,
  }));
  return stepsToOutput(grid, [...flight, { points: scene(court, rest, null), ms: EXIT_GONE_MS }, ...shake]);
}

/** Paddle Rally: two paddles return a ball on their own. */
export const RALLY_VARIANTS: Readonly<Record<string, RecipeFn>> = {
  rally: defineVariant('rally', RALLY_MIN, rallyThinking, true),
  'rally-serve': defineVariant('rally-serve', RALLY_MIN, rallyServe, true),
  'rally-wait': defineVariant('rally-wait', RALLY_MIN, rallyWait, true),
  'rally-rest': defineVariant('rally-rest', RALLY_MIN, rallyRest, false),
  'rally-miss': defineVariant('rally-miss', RALLY_MIN, rallyMiss, false),
};
