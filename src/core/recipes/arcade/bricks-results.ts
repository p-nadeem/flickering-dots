import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { brickPoints, paddleCentre, paddlePoints, planBricks, stepBricks, wallOrder } from './bricks-sim';
import type { BrickLayout, BrickState } from './bricks-sim';
import { restingBall, sceneStep, serveColumn } from './bricks-scene';
import type { ArcadeStep } from './shared';
import { blinkSteps, checkSteps, holdLast, iterateUntil, stepsOutput } from './kit-b';
import { triangle } from './shared';

const STEP_MS = 70;
const PADDLE_HOLD_MS = 500;
const BLINK_MS = 250;
const BLINK_TIMES = 2;
const HOLD_MS = 1500;
const PADDLE_LAG = 2;
const MISS_GAP = 3;

function flightToTop(layout: BrickLayout): BrickState[] {
  return iterateUntil<BrickState>(
    { ball: restingBall(layout, serveColumn(layout)), bricks: new Set() },
    (state) => stepBricks(layout, state),
    (state) => state.ball.y === 0,
    layout.rows + 1,
  );
}

function brickOver(layout: BrickLayout, x: number): ReadonlySet<number> {
  const bottomRow = wallOrder(layout).slice(0, layout.edges.length - 1);
  const slot = layout.edges.findIndex((edge, index) => index > 0 && x < edge) - 1;
  return new Set([bottomRow[Math.max(0, slot)]]);
}

/** The last brick pops, the ball flies off the top, the paddle holds alone, then the tick. */
export function generateBricksClear(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = planBricks(grid);
  const flight = flightToTop(layout);
  const entry = flight.find(({ ball }) => ball.y < layout.wallRows) ?? flight[flight.length - 1];
  const lastBrick = brickOver(layout, entry.ball.x);
  const flying = flight.map(({ ball }) =>
    sceneStep(layout, { ball, bricks: ball.y < layout.wallRows ? new Set() : lastBrick }, STEP_MS),
  );
  const paddleAlone = paddlePoints(layout, paddleCentre(layout, flight[flight.length - 1].ball.x));
  return stepsOutput(grid, [...flying, { points: paddleAlone, ms: PADDLE_HOLD_MS }, ...checkSteps(grid)]);
}

function missStep(layout: BrickLayout, wall: readonly Point[], step: number, steps: number): ArcadeStep {
  const ball: Point = [layout.cols - 1 - triangle(steps - step, layout.cols - 1), layout.wallRows + step];
  const centre = Math.min(1 + Math.floor(step / PADDLE_LAG), layout.cols - 1 - MISS_GAP);
  return { points: [...wall, ball, ...paddlePoints(layout, paddleCentre(layout, centre))], ms: STEP_MS };
}

/** The ball drops past a paddle that is too slow, then the paddle blinks twice and the wall stays. */
export function generateBricksMiss(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = planBricks(grid);
  const wall = brickPoints(layout, new Set(wallOrder(layout)));
  const steps = layout.paddleY - layout.wallRows;
  const falling = Array.from({ length: steps + 1 }, (_, step) => missStep(layout, wall, step, steps));
  const lastPaddle = falling[falling.length - 1].points.slice(wall.length + 1);
  const blinks = blinkSteps([...wall, ...lastPaddle], wall, BLINK_MS, BLINK_TIMES);
  return stepsOutput(grid, [
    ...falling,
    { points: [...wall, ...lastPaddle], ms: STEP_MS },
    ...holdLast(blinks, HOLD_MS),
  ]);
}
