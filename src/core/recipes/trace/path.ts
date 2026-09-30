import type { GridSize } from '../../types';
import { getCentre, wrapIndex } from '../helpers';
import type { Centre, Point } from '../helpers';
import { thinCorners } from './thin';

/** A continuous position or offset as `[x, y]`, before it is snapped to a cell. */
export type Vec = readonly [x: number, y: number];

const SNAP_PRECISION = 1e6;
const HALF_CELL = 0.5;

const SAMPLES_PER_TURN = 720;

function settle(value: number): number {
  return Math.round(value * SNAP_PRECISION) / SNAP_PRECISION;
}

/** The centre cell, or the two or four cells around the centre on even sides. */
export function centreBlock(grid: GridSize): Point[] {
  const { cx, cy } = getCentre(grid);
  const around = (centre: number): number[] =>
    Number.isInteger(centre) ? [centre] : [Math.floor(centre), Math.ceil(centre)];
  return around(cx).flatMap((x) => around(cy).map((y): Point => [x, y]));
}

/** Snaps an offset from a centre to a cell, mirror-symmetric about that centre on odd and even sides. */
export function snapOffset(centre: number, offset: number): number {
  const distance = settle(Math.abs(offset));
  const direction = offset < 0 ? -1 : 1;
  if (Number.isInteger(centre)) return centre + direction * Math.round(distance);
  return centre + direction * (Math.floor(distance) + HALF_CELL);
}

/** Snaps an offset from the grid centre to a cell. */
export function snapPoint({ cx, cy }: Centre, [dx, dy]: Vec): Point {
  return [snapOffset(cx, dx), snapOffset(cy, dy)];
}

function isSameCell(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Samples a closed curve, keeping each cell once per visit and dropping a repeated end. */
export function sampleClosedPath(sampleCount: number, pointAt: (share: number) => Point): Point[] {
  const cells = Array.from({ length: sampleCount }, (_, index) => pointAt(index / sampleCount));
  const visits = cells.filter((cell, index) => index === 0 || !isSameCell(cell, cells[index - 1]));
  const lastUnique = visits.reduce((last, cell, index) => (isSameCell(cell, visits[0]) ? last : index), 0);
  return visits.slice(0, lastUnique + 1);
}

/** Samples a closed curve into an ordered cell path, thinned symmetrically about `pivot`. */
export function tracePath(turns: number, pivot: Centre, pointAt: (share: number) => Point): Point[] {
  return thinCorners(sampleClosedPath(Math.ceil(turns * SAMPLES_PER_TURN), pointAt), pivot);
}

/** Keeps the first visit of each cell, in path order. */
export function firstVisits(path: readonly Point[]): Point[] {
  const keys = path.map(([x, y]) => `${x},${y}`);
  const firstIndex = new Map(keys.map((key, index) => [key, index] as const).reverse());
  return path.filter((_, index) => firstIndex.get(keys[index]) === index);
}

/** The head cell at `head` plus the `trail` cells before it on a closed path. */
export function cometCells(path: readonly Point[], head: number, trail: number): Point[] {
  return Array.from({ length: trail + 1 }, (_, step) => path[wrapIndex(head - step, path.length)]);
}
