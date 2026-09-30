import { framesEqual } from '../frame';
import type { Bit, Frame, GridSize, RecipeParams } from '../types';

/** A cell position as `[x, y]`. */
export type Point = readonly [x: number, y: number];

/** What a recipe returns: frames plus one duration (ms) per frame. */
export interface RecipeOutput {
  frames: Frame[];
  durations: number[];
  /** Frame shown under reduced motion; the busiest frame when absent. */
  still?: number;
}

/** A procedural recipe: turns a grid and params into frames and durations. */
export type RecipeFn = (grid: GridSize, params: RecipeParams) => RecipeOutput;

/** The centre of a grid, halfway between cells on even sides. */
export interface Centre {
  cx: number;
  cy: number;
}

function toBit(isLit: boolean): Bit {
  return isLit ? 1 : 0;
}

function isInside(grid: GridSize, [x, y]: Point): boolean {
  return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
}

/** Wraps an index into `[0, length)`, including negative indexes. */
export function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

/** Returns the centre of the grid. */
export function getCentre(grid: GridSize): Centre {
  return { cx: (grid.cols - 1) / 2, cy: (grid.rows - 1) / 2 };
}

/** Builds a frame by asking `isLit` about every cell in row-major order. */
export function createFrame(grid: GridSize, isLit: (x: number, y: number) => boolean): Frame {
  return Array.from({ length: grid.cols * grid.rows }, (_, index) =>
    toBit(isLit(index % grid.cols, Math.floor(index / grid.cols))),
  );
}

/** Returns a frame with every cell off. */
export function createBlankFrame(grid: GridSize): Frame {
  return createFrame(grid, () => false);
}

/** Lights the given points; points outside the grid are ignored. */
export function createFrameFromPoints(grid: GridSize, points: readonly Point[]): Frame {
  const litIndexes = new Set(
    points.filter((point) => isInside(grid, point)).map(([x, y]) => y * grid.cols + x),
  );
  return createFrame(grid, (x, y) => litIndexes.has(y * grid.cols + x));
}

/** Samples a pattern of `'0'`/`'1'` strings at each cell centre, scaling it to the grid. */
export function createFrameFromPattern(pattern: readonly string[], grid: GridSize): Frame {
  const patternRows = pattern.length;
  const patternCols = pattern[0].length;
  return createFrame(grid, (x, y) => {
    const sourceX = Math.floor(((x + 0.5) * patternCols) / grid.cols);
    const sourceY = Math.floor(((y + 0.5) * patternRows) / grid.rows);
    return pattern[sourceY][sourceX] === '1';
  });
}

/** Returns the cells on a Bresenham line from `from` to `to`, both ends included. */
export function getLinePoints(from: Point, to: Point): Point[] {
  const [toX, toY] = to;
  const deltaX = Math.abs(toX - from[0]);
  const deltaY = -Math.abs(toY - from[1]);
  const stepX = from[0] < toX ? 1 : -1;
  const stepY = from[1] < toY ? 1 : -1;
  let [x, y] = from;
  let error = deltaX + deltaY;
  return Array.from({ length: Math.max(deltaX, -deltaY) + 1 }, () => {
    const point: Point = [x, y];
    const doubled = 2 * error;
    if (doubled >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubled <= deltaX) {
      error += deltaX;
      y += stepY;
    }
    return point;
  });
}

/** Returns the edge cells clockwise from the top-left corner. */
export function getPerimeterPoints(grid: GridSize): Point[] {
  const { cols, rows } = grid;
  const top = Array.from({ length: cols }, (_, x): Point => [x, 0]);
  const right = Array.from({ length: rows - 1 }, (_, index): Point => [cols - 1, index + 1]);
  const bottom = Array.from({ length: cols - 1 }, (_, index): Point => [cols - 2 - index, rows - 1]);
  const left = Array.from({ length: Math.max(0, rows - 2) }, (_, index): Point => [0, rows - 2 - index]);
  return [...top, ...right, ...bottom, ...left];
}

/** Merges runs of identical consecutive frames into one frame that lasts their summed duration. */
export function mergeRepeatedFrames({ frames, durations }: RecipeOutput): RecipeOutput {
  return frames.reduce<RecipeOutput>(
    (merged, frame, index) => {
      const last = merged.frames.length - 1;
      if (last >= 0 && framesEqual(merged.frames[last], frame)) {
        return {
          frames: merged.frames,
          durations: merged.durations.map((ms, at) => (at === last ? ms + durations[index] : ms)),
        };
      }
      return { frames: [...merged.frames, frame], durations: [...merged.durations, durations[index]] };
    },
    { frames: [], durations: [] },
  );
}
