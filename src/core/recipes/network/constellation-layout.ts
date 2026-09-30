import type { GridSize } from '../../types';
import { getLinePoints } from '../helpers';
import type { Point } from '../helpers';
import { pickIndex } from './shots';

const STAR_SPACING = 3;
const NARROW_MARGIN = 1;
const WIDE_MARGIN = 2;
const WIDE_MARGIN_MIN_SIDE = 11;
const PLACE_TRIES = 400;
const CANDIDATES_PER_TRY = 4;
const SKY_ATTEMPTS = 16;

/** One line of the constellation, drawn from a star already joined to a new one. */
export interface Edge {
  from: Point;
  to: Point;
}

function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

function nearestSpacing(stars: readonly Point[], candidate: Point): number {
  return Math.min(Number.POSITIVE_INFINITY, ...stars.map((star) => chebyshev(star, candidate)));
}

function axisMargin(side: number): number {
  return side >= WIDE_MARGIN_MIN_SIDE ? WIDE_MARGIN : NARROW_MARGIN;
}

function randomOnAxis(side: number, rng: () => number): number {
  const margin = axisMargin(side);
  return Math.min(side - 1, margin + pickIndex(rng, Math.max(1, side - 2 * margin)));
}

function randomCell(grid: GridSize, rng: () => number): Point {
  return [randomOnAxis(grid.cols, rng), randomOnAxis(grid.rows, rng)];
}

function bestCandidate(grid: GridSize, stars: readonly Point[], rng: () => number): Point {
  const candidates = Array.from({ length: CANDIDATES_PER_TRY }, () => randomCell(grid, rng));
  return candidates.reduce((best, candidate) =>
    nearestSpacing(stars, candidate) > nearestSpacing(stars, best) ? candidate : best,
  );
}

/** Seeded star cells at least 3 apart (Chebyshev) inside a margin (2 cells on sides of 11 or more, else 1); fewer when the grid is full. */
export function placeStars(grid: GridSize, count: number, rng: () => number): Point[] {
  return Array.from({ length: PLACE_TRIES }).reduce<Point[]>((stars) => {
    if (stars.length >= count) return stars;
    const candidate = bestCandidate(grid, stars, rng);
    return nearestSpacing(stars, candidate) >= STAR_SPACING ? [...stars, candidate] : stars;
  }, []);
}

function squaredDistance(a: Point, b: Point): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

interface Candidate {
  from: number;
  to: number;
  distance: number;
}

function shortestLink(stars: readonly Point[], joined: readonly number[]): Candidate {
  const open = stars.map((_, index) => index).filter((index) => !joined.includes(index));
  const links = joined.flatMap((from) =>
    open.map((to): Candidate => ({ from, to, distance: squaredDistance(stars[from], stars[to]) })),
  );
  return links.reduce((best, link) => (link.distance < best.distance ? link : best));
}

/** Prim's minimum spanning tree grown from the first star, in the order its edges join. */
export function spanningEdges(stars: readonly Point[]): Edge[] {
  const steps = Array.from({ length: Math.max(0, stars.length - 1) });
  const { edges } = steps.reduce<{ joined: number[]; edges: Edge[] }>(
    ({ joined, edges: found }) => {
      const link = shortestLink(stars, joined);
      return {
        joined: [...joined, link.to],
        edges: [...found, { from: stars[link.from], to: stars[link.to] }],
      };
    },
    { joined: [0], edges: [] },
  );
  return edges;
}

/** The line cells of an edge, from its first star towards its second, stars excluded. */
export function edgeDots({ from, to }: Edge): Point[] {
  return getLinePoints(from, to).slice(1, -1);
}

/** True when an edge's Bresenham line steps in even runs: straight, diagonal, one step, or runs of equal length. */
export function isCleanEdge({ from, to }: Edge): boolean {
  const along = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
  const across = Math.min(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
  return across <= 1 || along === across || (along + 1) % (across + 1) === 0;
}

function cleanEdgeCount(stars: readonly Point[]): number {
  return spanningEdges(stars).filter(isCleanEdge).length;
}

/** Seeded stars whose spanning-tree edges all step cleanly, retrying placements; the cleanest attempt otherwise. */
export function placeSky(grid: GridSize, count: number, rng: () => number): Point[] {
  const attempts = Array.from({ length: SKY_ATTEMPTS }, () => placeStars(grid, count, rng));
  const isAllClean = (stars: readonly Point[]) => cleanEdgeCount(stars) === Math.max(0, stars.length - 1);
  return (
    attempts.find(isAllClean) ??
    attempts.reduce((best, stars) => (cleanEdgeCount(stars) > cleanEdgeCount(best) ? stars : best))
  );
}
