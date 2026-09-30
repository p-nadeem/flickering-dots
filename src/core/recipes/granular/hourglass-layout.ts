import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { range } from './shared';

/** Where the hourglass sits: its neck, its grains in drain order and its bottom cells in fill order. */
export interface HourglassLayout {
  neck: Point;
  drain: readonly Point[];
  fill: readonly Point[];
  bottomRow: number;
}

const RIM_ROWS = 2;
const FULL_TOP_MAX_HALF = 2;
const DRAIN_ACROSS_WEIGHT = 0.75;
const DRAIN_DEPTH_WEIGHT = 1;
const FILL_ACROSS_WEIGHT = 0.9;

interface Glass {
  centreX: number;
  top: number;
  half: number;
  width: number;
}

function largestOdd(value: number): number {
  return Math.max(1, value % 2 === 1 ? value : value - 1);
}

function getGlass({ cols, rows }: GridSize): Glass {
  const oddRows = largestOdd(rows);
  const width = largestOdd(Math.min(cols, oddRows - RIM_ROWS));
  const height = width + RIM_ROWS;
  const left = Math.ceil((cols - width) / 2);
  return {
    centreX: left + (width - 1) / 2,
    top: Math.ceil((rows - height) / 2),
    half: (height - 1) / 2,
    width,
  };
}

function rowCells(centreX: number, y: number, rowWidth: number): Point[] {
  const reach = (rowWidth - 1) / 2;
  return range(centreX - reach, centreX + reach + 1).map((x): Point => [x, y]);
}

function rowWidth(glass: Glass, fromRim: number): number {
  return Math.max(1, glass.width - 2 * fromRim);
}

function sortBy(points: readonly Point[], score: (point: Point) => number): Point[] {
  return [...points].sort((a, b) => score(a) - score(b) || a[1] - b[1] || a[0] - b[0]);
}

function getGrains(glass: Glass): Point[] {
  const firstRow = glass.half > FULL_TOP_MAX_HALF ? 1 : 0;
  const cells = range(firstRow, glass.half).flatMap((fromRim) =>
    rowCells(glass.centreX, glass.top + fromRim, rowWidth(glass, fromRim)),
  );
  return sortBy(
    cells,
    ([x, y]) => DRAIN_ACROSS_WEIGHT * Math.abs(x - glass.centreX) + DRAIN_DEPTH_WEIGHT * (y - glass.top),
  );
}

function isMirrorPair(centreX: number, [ax, ay]: Point, [bx, by]: Point): boolean {
  return ay === by && ax + bx === 2 * centreX && ax !== bx;
}

function alternateSides(centreX: number, sorted: readonly Point[]): Point[] {
  return sorted.reduce<{ cells: Point[]; pairs: number }>(
    ({ cells, pairs }, cell) => {
      const last = cells[cells.length - 1];
      if (last === undefined || !isMirrorPair(centreX, last, cell)) return { cells: [...cells, cell], pairs };
      const swapped = pairs % 2 === 1 ? [...cells.slice(0, -1), cell, last] : [...cells, cell];
      return { cells: swapped, pairs: pairs + 1 };
    },
    { cells: [], pairs: 0 },
  ).cells;
}

function getFill(glass: Glass, bottomRow: number, count: number): Point[] {
  const cells = range(0, glass.half).flatMap((fromRim) =>
    rowCells(glass.centreX, bottomRow - fromRim, rowWidth(glass, fromRim)),
  );
  const sorted = sortBy(cells, ([x, y]) => bottomRow - y + FILL_ACROSS_WEIGHT * Math.abs(x - glass.centreX));
  return alternateSides(glass.centreX, sorted).slice(0, count);
}

/** Lays out the largest centred hourglass that fits: a one-dot neck, a flat-topped charge of grains and a cone-shaped fill. */
export function getHourglassLayout(grid: GridSize): HourglassLayout {
  const glass = getGlass(grid);
  const bottomRow = glass.top + 2 * glass.half;
  const drain = getGrains(glass);
  return {
    neck: [glass.centreX, glass.top + glass.half],
    drain,
    fill: getFill(glass, bottomRow, drain.length),
    bottomRow,
  };
}
