import type { GridSize, RecipeParams } from '../types';
import { createFrameFromPoints, getPerimeterPoints, wrapIndex } from './helpers';
import type { Point, RecipeOutput } from './helpers';

const LAP_MS = 960;
const MIN_FRAME_MS = 40;
const MAX_FRAME_MS = 90;
const LARGEST_PERIMETER_SIDE = 4;
const RING_TOLERANCE = 0.5;
const FULL_TURN = Math.PI * 2;

/** Default params of the `orbit` recipe; `frames` defaults to one frame per ring cell. */
export const ORBIT_DEFAULTS = { trail: 2 } as const satisfies RecipeParams;

interface Ring {
  side: number;
  centre: number;
}

function toKey([x, y]: Point): string {
  return `${x},${y}`;
}

function distanceFromRing({ centre }: Ring, [x, y]: Point): number {
  return Math.abs(Math.hypot(x - centre, y - centre) - centre);
}

function getRasterCells(ring: Ring): Point[] {
  return Array.from({ length: ring.side * ring.side }, (_, index): Point => [
    index % ring.side,
    Math.floor(index / ring.side),
  ]).filter((cell) => distanceFromRing(ring, cell) < RING_TOLERANCE);
}

function isCorner(kept: ReadonlySet<string>, [x, y]: Point): boolean {
  const hasHorizontal = kept.has(toKey([x - 1, y])) || kept.has(toKey([x + 1, y]));
  const hasVertical = kept.has(toKey([x, y - 1])) || kept.has(toKey([x, y + 1]));
  return hasHorizontal && hasVertical;
}

function withoutKey(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  return new Set([...keys].filter((other) => other !== key));
}

function thinRing(ring: Ring, cells: readonly Point[]): Point[] {
  const worstFirst = [...cells].sort((a, b) => distanceFromRing(ring, b) - distanceFromRing(ring, a));
  const kept = worstFirst.reduce<ReadonlySet<string>>(
    (keys, cell) => (isCorner(keys, cell) ? withoutKey(keys, toKey(cell)) : keys),
    new Set(cells.map(toKey)),
  );
  return cells.filter((cell) => kept.has(toKey(cell)));
}

function getClockwiseAngle({ centre }: Ring, [x, y]: Point): number {
  const angle = Math.atan2(x - centre, centre - y);
  return angle < 0 ? angle + FULL_TURN : angle;
}

function getRingPath(side: number): Point[] {
  const ring: Ring = { side, centre: (side - 1) / 2 };
  const cells =
    side <= LARGEST_PERIMETER_SIDE
      ? getPerimeterPoints({ cols: side, rows: side })
      : thinRing(ring, getRasterCells(ring));
  return [...cells].sort((a, b) => getClockwiseAngle(ring, a) - getClockwiseAngle(ring, b));
}

function getCentredRingPath(grid: GridSize): Point[] {
  const side = Math.min(grid.cols, grid.rows);
  const offsetX = Math.floor((grid.cols - side) / 2);
  const offsetY = Math.floor((grid.rows - side) / 2);
  return getRingPath(side).map(([x, y]): Point => [x + offsetX, y + offsetY]);
}

function getFrameMs(frameCount: number): number {
  return Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, Math.round(LAP_MS / frameCount)));
}

/** A dot with a contiguous trail travelling clockwise from twelve o'clock around a thinned ring. */
export function generateOrbit(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const path = getCentredRingPath(grid);
  const count = Math.min(params.frames || path.length, path.length);
  const trail = Math.min(params.trail ?? ORBIT_DEFAULTS.trail, path.length - 1);
  const frames = Array.from({ length: count }, (_, index) => {
    const head = Math.floor((index * path.length) / count);
    return createFrameFromPoints(
      grid,
      Array.from({ length: trail + 1 }, (__, step) => path[wrapIndex(head - step, path.length)]),
    );
  });
  const frameMs = getFrameMs(count);
  return { frames, durations: frames.map(() => frameMs) };
}
