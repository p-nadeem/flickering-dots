import type { Point } from '../helpers';
import type { ArcadeStep } from './shared';
import { brickPoints, paddleCentre, paddlePoints, wallOrder } from './bricks-sim';
import type { Ball, BrickLayout, BrickState } from './bricks-sim';

/** Frames of the wall rebuilding in four steps, the last being the full wall. */
export const REBUILD_STEPS = 4;

/** The frame for a ball, its tracking paddle and the bricks. */
export function sceneStep(layout: BrickLayout, { ball, bricks }: BrickState, ms: number): ArcadeStep {
  const ballPoints: Point[] = ball.y < 0 ? [] : [[ball.x, ball.y]];
  return {
    points: [
      ...brickPoints(layout, bricks),
      ...ballPoints,
      ...paddlePoints(layout, paddleCentre(layout, ball.x)),
    ],
    ms,
  };
}

/** The first `count` bricks in wall order. */
export function partialWall(layout: BrickLayout, count: number): ReadonlySet<number> {
  return new Set(wallOrder(layout).slice(0, count));
}

/** The column the ball is served from: the middle, leaning left on even widths. */
export function serveColumn(layout: BrickLayout): number {
  return Math.floor((layout.cols - 1) / 2);
}

/** The ball resting on the paddle at `x`. */
export function restingBall(layout: BrickLayout, x: number): Ball {
  return { x, y: layout.floorY, dx: 1, dy: -1 };
}

/** The wall rebuilding under a resting ball, row by row, stopping one step short of full. */
export function rebuildSteps(layout: BrickLayout, ball: Ball, ms: number): ArcadeStep[] {
  const total = wallOrder(layout).length;
  const counts = Array.from({ length: REBUILD_STEPS - 1 }, (_, index) =>
    Math.ceil(((index + 1) * total) / REBUILD_STEPS),
  ).filter((count, index, all) => count < total && all.indexOf(count) === index);
  return counts.map((count) => sceneStep(layout, { ball, bricks: partialWall(layout, count) }, ms));
}
