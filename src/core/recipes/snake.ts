import type { GridSize, RecipeParams } from '../types';
import { createFrameFromPoints, getPerimeterPoints, wrapIndex } from './helpers';
import type { RecipeOutput } from './helpers';

const LAP_MS = 880;
const MIN_FRAME_MS = 40;
const MAX_FRAME_MS = 110;
const MIN_LENGTH = 3;
const LENGTH_SHARE = 4;

function frameMsFor(pathLength: number): number {
  return Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, Math.round(LAP_MS / pathLength)));
}

/** A snake running clockwise around the edge, one 880 ms lap; `length` defaults to a quarter of the edge, at least 3. */
export function generateSnake(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const path = getPerimeterPoints(grid);
  const requested = params.length || Math.max(MIN_LENGTH, Math.round(path.length / LENGTH_SHARE));
  const length = Math.min(requested, path.length);
  const frameMs = frameMsFor(path.length);
  const frames = path.map((_, index) =>
    createFrameFromPoints(
      grid,
      Array.from({ length }, (__, step) => path[wrapIndex(index - step, path.length)]),
    ),
  );
  return { frames, durations: frames.map(() => frameMs) };
}
