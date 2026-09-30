import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { blockPoints, loopLength, planCornerPath, positionAt } from './corner-path';
import type { CornerPath } from './corner-path';
import type { ArcadeStep } from './shared';
import { stepsOutput } from './kit-b';
import { shiftPoints } from './shared';

const STEP_MS = 110;
const RING_MS = 70;
const FLASH_MS = 170;
const HOLD_MS = 1500;
const SHAKE_MS = 80;
const SHAKE_TIMES = 2;
const RING_COUNT = 3;
const RING_SPACING = 2;

function approachLength(path: CornerPath): number {
  return path.rangeX + path.rangeY;
}

function pathSteps(path: CornerPath, from: number, to: number, x0: number, y0: number): ArcadeStep[] {
  return Array.from({ length: to - from + 1 }, (_, index) => {
    const [x, y] = positionAt(path, from + index, x0, y0);
    return { points: blockPoints(path, x, y), ms: STEP_MS };
  });
}

function allPoints(grid: GridSize): Point[] {
  return Array.from({ length: grid.cols * grid.rows }, (_, index): Point => [
    index % grid.cols,
    Math.floor(index / grid.cols),
  ]);
}

function ringPoints(grid: GridSize, reach: number): Point[] {
  return allPoints(grid).filter(([x, y]) => Math.max(x, y) === reach);
}

/** The block bounces into the top-left corner, sends three square rings out one by one, flashes once and holds. */
export function generateCornerHit(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const path = planCornerPath(grid);
  const block = blockPoints(path, 0, 0);
  const reach = Math.max(path.w, path.h);
  const radii = Array.from({ length: RING_COUNT }, (_, index) => reach + RING_SPACING * index + 1);
  const rings = radii.map((_, index): ArcadeStep => ({
    points: [...block, ...radii.slice(0, index + 1).flatMap((radius) => ringPoints(grid, radius))],
    ms: RING_MS,
  }));
  return stepsOutput(grid, [
    ...pathSteps(path, -approachLength(path), 0, 0, 0),
    ...rings,
    { points: allPoints(grid), ms: FLASH_MS },
    { points: block, ms: HOLD_MS },
  ]);
}

function cornerDistance(path: CornerPath, [x, y]: Point): number {
  return Math.min(x, path.rangeX - x) + Math.min(y, path.rangeY - y);
}

function nearestMissStep(path: CornerPath): number {
  const first = approachLength(path);
  const steps = Array.from({ length: loopLength(path) }, (_, index) => first + index);
  const distances = steps.map((step) => cornerDistance(path, positionAt(path, step, path.x0, path.y0)));
  return steps[distances.indexOf(Math.min(...distances))];
}

function shakeSteps(block: readonly Point[], dx: number): ArcadeStep[] {
  const pairs = Array.from({ length: SHAKE_TIMES }, (_, index): ArcadeStep[] => [
    { points: shiftPoints(block, dx, 0), ms: SHAKE_MS },
    { points: block, ms: index === SHAKE_TIMES - 1 ? HOLD_MS : SHAKE_MS },
  ]);
  return pairs.flat();
}

/** The block's bounce stops against a wall one dot short of a corner, then shakes a column twice. */
export function generateCornerNear(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const path = planCornerPath(grid);
  const stop = nearestMissStep(path);
  const [x, y] = positionAt(path, stop, path.x0, path.y0);
  const awayFromCorner = x < path.rangeX / 2 ? 1 : -1;
  return stepsOutput(grid, [
    ...pathSteps(path, stop - approachLength(path), stop - 1, path.x0, path.y0),
    ...shakeSteps(blockPoints(path, x, y), awayFromCorner),
  ]);
}
