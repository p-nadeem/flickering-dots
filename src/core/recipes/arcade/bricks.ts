import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { planBricks, stepBricks, wallOrder } from './bricks-sim';
import type { BrickLayout, BrickState } from './bricks-sim';
import { rebuildSteps, restingBall, sceneStep, serveColumn } from './bricks-scene';
import type { ArcadeStep } from './shared';
import { iterateUntil, stepsOutput } from './kit-b';

const STEP_MS = 70;
const DRIFT_MS = 700;
const DRIFT_OFFSETS = [0, 1, 0, -1] as const;
const MAX_RALLY_STEPS = 4000;

function fullWallState(layout: BrickLayout): BrickState {
  return { ball: restingBall(layout, serveColumn(layout)), bricks: new Set(wallOrder(layout)) };
}

function isCaught(layout: BrickLayout, { ball, bricks }: BrickState): boolean {
  return bricks.size === 0 && ball.dy > 0 && ball.y >= layout.floorY;
}

function rallyStates(layout: BrickLayout): BrickState[] {
  return iterateUntil(
    fullWallState(layout),
    (state) => stepBricks(layout, state),
    (state) => isCaught(layout, state),
    MAX_RALLY_STEPS,
  );
}

function carrySteps(layout: BrickLayout, fromX: number): ArcadeStep[] {
  const target = serveColumn(layout);
  const direction = Math.sign(target - fromX);
  return Array.from({ length: Math.abs(target - fromX) }, (_, index) =>
    sceneStep(
      layout,
      { ball: restingBall(layout, fromX + direction * (index + 1)), bricks: new Set() },
      STEP_MS,
    ),
  );
}

/** A ball knocks the wall out one brick per hit, is caught, carried to the middle, and the wall rebuilds. */
export function generateBricks(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = planBricks(grid);
  const states = rallyStates(layout);
  const caughtX = states[states.length - 1].ball.x;
  return stepsOutput(grid, [
    ...states.map((state) => sceneStep(layout, state, STEP_MS)),
    ...carrySteps(layout, caughtX),
    ...rebuildSteps(layout, restingBall(layout, serveColumn(layout)), STEP_MS),
  ]);
}

/** The full wall with the ball resting on the paddle, drifting one column every 700 ms. */
export function generateBricksRest(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = planBricks(grid);
  const bricks = new Set(wallOrder(layout));
  return stepsOutput(
    grid,
    DRIFT_OFFSETS.map((offset) =>
      sceneStep(layout, { ball: restingBall(layout, serveColumn(layout) + offset), bricks }, DRIFT_MS),
    ),
  );
}
