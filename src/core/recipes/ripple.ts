import type { GridSize, RecipeParams } from '../types';
import { createBlankFrame, createFrameFromPoints, getCentre } from './helpers';
import type { Centre, Point, RecipeOutput } from './helpers';

const RING_MS = 120;
const BLANK_MS = 240;
const MIN_CYCLE_MS = 340;
const RING_HALF_WIDTH = 0.5;
const EVEN_START_RADIUS = 0.5;
const MIN_THINNED_RADIUS = 1;

/** Default params of the `ripple` recipe; `frames` defaults to every ring that fits plus the blank. */
export const RIPPLE_DEFAULTS = {} as const satisfies RecipeParams;

function isOnRing([x, y]: Point, { cx, cy }: Centre, radius: number): boolean {
  return Math.abs(Math.hypot(x - cx, y - cy) - radius) < RING_HALF_WIDTH;
}

function isInside(grid: GridSize, [x, y]: Point): boolean {
  return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
}

function getRingPoints(grid: GridSize, centre: Centre, radius: number): Point[] {
  const reach = Math.ceil(radius) + 1;
  const xs = Array.from({ length: grid.cols + reach * 2 }, (_, index) => index - reach);
  const ys = Array.from({ length: grid.rows + reach * 2 }, (_, index) => index - reach);
  return ys.flatMap((y) => xs.map((x): Point => [x, y])).filter((point) => isOnRing(point, centre, radius));
}

function toKey([x, y]: Point): string {
  return `${x},${y}`;
}

function hasLCorner([x, y]: Point, lit: ReadonlySet<string>): boolean {
  const hasHorizontal = lit.has(toKey([x - 1, y])) || lit.has(toKey([x + 1, y]));
  const hasVertical = lit.has(toKey([x, y - 1])) || lit.has(toKey([x, y + 1]));
  return hasHorizontal && hasVertical;
}

function thinRing(points: readonly Point[], centre: Centre, radius: number): Point[] {
  const getError = ([x, y]: Point): number => Math.abs(Math.hypot(x - centre.cx, y - centre.cy) - radius);
  const worstFirst = [...points].sort((a, b) => getError(b) - getError(a));
  const removed = worstFirst.reduce<ReadonlySet<string>>(
    (lit, point) => {
      if (!hasLCorner(point, lit)) return lit;
      return new Set([...lit].filter((key) => key !== toKey(point)));
    },
    new Set(points.map(toKey)),
  );
  return points.filter((point) => removed.has(toKey(point)));
}

function getRings(grid: GridSize): Point[][] {
  const centre = getCentre(grid);
  const isOddCentre = grid.cols % 2 === 1 && grid.rows % 2 === 1;
  const startRadius = isOddCentre ? 0 : EVEN_START_RADIUS;
  const collect = (radius: number, rings: readonly Point[][]): Point[][] => {
    const points = getRingPoints(grid, centre, radius);
    if (!points.every((point) => isInside(grid, point))) return [...rings];
    const ring = radius < MIN_THINNED_RADIUS ? points : thinRing(points, centre, radius);
    return collect(radius + 1, [...rings, ring]);
  };
  return collect(startRadius, []);
}

function sampleEvenly<T>(items: readonly T[], count: number): T[] {
  if (count >= items.length) return [...items];
  if (count <= 1) return items.slice(0, count);
  return Array.from(
    { length: count },
    (_, index) => items[Math.round((index * (items.length - 1)) / (count - 1))],
  );
}

/** Rings that spread from the centre until the last one that fits the grid unclipped, then one blank frame. */
export function generateRipple(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const rings = getRings(grid);
  const picked = params.frames ? sampleEvenly(rings, params.frames - 1) : rings;
  const ringDurations = picked.map(() => RING_MS);
  const ringTotal = ringDurations.reduce((sum, duration) => sum + duration, 0);
  const blankMs = picked.length > 0 ? Math.max(BLANK_MS, MIN_CYCLE_MS - ringTotal) : BLANK_MS;
  return {
    frames: [...picked.map((ring) => createFrameFromPoints(grid, ring)), createBlankFrame(grid)],
    durations: [...ringDurations, blankMs],
  };
}
