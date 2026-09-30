import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { planBricks, wallOrder } from './bricks-sim';
import type { Ball, BrickLayout } from './bricks-sim';
import { REBUILD_STEPS, partialWall, sceneStep, serveColumn } from './bricks-scene';
import { stepsOutput } from './kit-b';
import { lcm, triangle } from './shared';

const STEP_MS = 70;
const LEVEL_FRAMES = 8;
const EMPTY_MIN_FRAMES = 4;
const WALL_GAP_ROWS = 1;

interface Rally {
  height: number;
  period: number;
}

function rallyFor(layout: BrickLayout): Rally {
  const across = 2 * Math.max(1, layout.cols - 1);
  const room = Math.max(0, layout.floorY - layout.wallRows - WALL_GAP_ROWS);
  if (room === 0) return { height: 0, period: across };
  const heights = Array.from({ length: room - Math.ceil(room / 2) + 1 }, (_, index) => room - index);
  const periods = heights.map((height) => lcm(across, 2 * height));
  const best = periods.indexOf(Math.min(...periods));
  return { height: heights[best], period: periods[best] };
}

function ballAt(layout: BrickLayout, rally: Rally, step: number): Ball {
  return {
    x: triangle(step + serveColumn(layout), layout.cols - 1),
    y: layout.floorY - triangle(step, rally.height),
    dx: 1,
    dy: -1,
  };
}

function removalOrder(layout: BrickLayout): number[] {
  const order = wallOrder(layout);
  const perRow = order.length / layout.wallRows;
  return Array.from({ length: perRow }, (_, slot) => slot).flatMap((slot) =>
    order.filter((_, index) => index % perRow === slot),
  );
}

function standing(layout: BrickLayout, removed: number): ReadonlySet<number> {
  return new Set(removalOrder(layout).slice(removed));
}

function wallAt(layout: BrickLayout, step: number, emptyFrames: number): ReadonlySet<number> {
  const total = wallOrder(layout).length;
  const removed = Math.floor(step / LEVEL_FRAMES);
  if (removed < total) return standing(layout, removed);
  const rebuildStep = step - total * LEVEL_FRAMES - emptyFrames + 1;
  if (rebuildStep <= 0) return new Set();
  return partialWall(layout, Math.ceil((rebuildStep * total) / REBUILD_STEPS));
}

function sweepFrames(total: number, period: number): number {
  const minimum = total * LEVEL_FRAMES + EMPTY_MIN_FRAMES + REBUILD_STEPS - 1;
  return Math.ceil(minimum / period) * period;
}

/** The ball plays below a wall that shrinks from the left one brick at a time; `density` fixes the progress. */
export function generateBricksProgress(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const layout = planBricks(grid);
  const rally = rallyFor(layout);
  const total = wallOrder(layout).length;
  if (params.density !== undefined) {
    const bricks = standing(layout, total - Math.round((1 - params.density) * total));
    const steps = Array.from({ length: rally.period }, (_, step) =>
      sceneStep(layout, { ball: ballAt(layout, rally, step), bricks }, STEP_MS),
    );
    return stepsOutput(grid, steps);
  }
  const frames = sweepFrames(total, rally.period);
  const emptyFrames = frames - total * LEVEL_FRAMES - (REBUILD_STEPS - 1);
  const steps = Array.from({ length: frames }, (_, step) =>
    sceneStep(
      layout,
      { ball: ballAt(layout, rally, step), bricks: wallAt(layout, step, emptyFrames) },
      STEP_MS,
    ),
  );
  return stepsOutput(grid, steps);
}
