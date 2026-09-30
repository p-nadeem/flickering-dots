import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { gcd, lcm, triangle } from './shared';

const LARGE_SIDE = 12;
const NEAR_MISS_OFFSET = 1;
const MIN_RANGE = 2;

type BlockSize = readonly [w: number, h: number];

const SMALL_BLOCKS: readonly BlockSize[] = [
  [2, 2],
  [3, 3],
  [3, 2],
  [2, 3],
];
const LARGE_BLOCKS: readonly BlockSize[] = [
  [3, 3],
  [2, 2],
  [3, 2],
  [2, 3],
];
const DOT_BLOCK: BlockSize = [1, 1];

/** The bouncing block's size, its travel ranges and the phase offsets of its path. */
export interface CornerPath {
  w: number;
  h: number;
  rangeX: number;
  rangeY: number;
  x0: number;
  y0: number;
}

function toPath(grid: GridSize, [w, h]: BlockSize, isDiamond: boolean): CornerPath {
  const rangeX = grid.cols - w;
  const x0 = isDiamond ? Math.floor(rangeX / 2) : NEAR_MISS_OFFSET;
  return { w, h, rangeX, rangeY: grid.rows - h, x0, y0: 0 };
}

function isNearMissFit(grid: GridSize, [w, h]: BlockSize): boolean {
  const [rangeX, rangeY] = [grid.cols - w, grid.rows - h];
  const hasRoom = rangeX >= MIN_RANGE && rangeY >= MIN_RANGE && rangeX !== rangeY;
  return hasRoom && gcd(rangeX, rangeY) >= 2;
}

function isDiamondFit(grid: GridSize, [w, h]: BlockSize): boolean {
  return grid.cols - w === grid.rows - h && grid.cols - w >= MIN_RANGE;
}

/** Picks the block and offsets: a path that misses corners by one when the ranges allow, else a diamond. */
export function planCornerPath(grid: GridSize): CornerPath {
  const preferred = Math.min(grid.cols, grid.rows) >= LARGE_SIDE ? LARGE_BLOCKS : SMALL_BLOCKS;
  const blocks = [...preferred, DOT_BLOCK];
  const nearMiss = blocks.find((block) => isNearMissFit(grid, block));
  if (nearMiss) return toPath(grid, nearMiss, false);
  const diamond = blocks.find((block) => isDiamondFit(grid, block));
  return toPath(grid, diamond ?? DOT_BLOCK, diamond !== undefined);
}

/** The block's cells with its top-left cell at `left`, `top`. */
export function blockPoints({ w, h }: CornerPath, left: number, top: number): Point[] {
  return Array.from({ length: w * h }, (_, index): Point => [
    left + (index % w),
    top + Math.floor(index / w),
  ]);
}

/** The block's top-left cell at `step` for phase offsets `x0`, `y0`. */
export function positionAt(path: CornerPath, step: number, x0: number, y0: number): Point {
  return [triangle(step + x0, path.rangeX), triangle(step + y0, path.rangeY)];
}

/** Steps until the path repeats: the least common multiple of both bounce periods. */
export function loopLength(path: CornerPath): number {
  return lcm(2 * Math.max(1, path.rangeX), 2 * Math.max(1, path.rangeY));
}
