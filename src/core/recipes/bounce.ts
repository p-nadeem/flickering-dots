import type { GridSize, RecipeParams } from '../types';
import { createFrameFromPoints, wrapIndex } from './helpers';
import type { Point, RecipeOutput } from './helpers';

const FRAME_MS = 85;
const STILL_FRACTION = 8;

/** Default params of the `bounce` recipe; without `frames` the ball moves one column per frame. */
export const BOUNCE_DEFAULTS = { trail: 0 } as const satisfies RecipeParams;

function getBallPoint(grid: GridSize, index: number, count: number): Point {
  const step = Math.min(index, count - index);
  const across = (step * 2) / count;
  const height = Math.abs(Math.sin((Math.PI * step * 2) / count));
  return [Math.round((grid.cols - 1) * across), Math.round((grid.rows - 1) * (1 - height))];
}

function getTrailPoint(ball: Point, previous: Point): Point | undefined {
  const dx = Math.sign(previous[0] - ball[0]);
  const dy = Math.sign(previous[1] - ball[1]);
  if (dx === 0 && dy === 0) return undefined;
  return [ball[0] + dx, ball[1] + dy];
}

function getBallPoints(grid: GridSize, index: number, count: number, hasTrail: boolean): Point[] {
  const ball = getBallPoint(grid, index, count);
  if (!hasTrail) return [ball];
  const trail = getTrailPoint(ball, getBallPoint(grid, wrapIndex(index - 1, count), count));
  return trail ? [ball, trail] : [ball];
}

function getDefaultCount(grid: GridSize): number {
  return 2 * (grid.cols - 1);
}

/** A ball bouncing across the grid and back; any `trail` also lights the cell beside it towards its previous position. */
export function generateBounce(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const count = params.frames || getDefaultCount(grid);
  const hasTrail = Boolean(params.trail ?? BOUNCE_DEFAULTS.trail);
  const frames = Array.from({ length: count }, (_, index) =>
    createFrameFromPoints(grid, getBallPoints(grid, index, count, hasTrail)),
  );
  return { frames, durations: frames.map(() => FRAME_MS), still: Math.round(count / STILL_FRACTION) };
}
