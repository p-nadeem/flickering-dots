import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { cellsOf, clamp, neighbours, pick, toIndex, toPoint } from './lattice';
import type { Cells } from './lattice';

/** A wall layout with breadth-first distances from the start. */
export interface FloodModel {
  walls: Cells;
  start: number;
  goal: number;
  distance: ReadonlyMap<number, number>;
  path: number[];
}

const INSET_MIN_SIDE = 7;
const SEGMENT_MIN = 2;
const SEGMENT_SHARE = 3;
const LAYOUT_ATTEMPTS = 40;
const PLACEMENT_ATTEMPTS = 400;
const NEAR = [-1, 0, 1] as const;
const DIRECTIONS: readonly Point[] = [
  [1, 0],
  [0, 1],
];

function corners(grid: GridSize): { start: Point; goal: Point } {
  const inset = Math.min(grid.cols, grid.rows) >= INSET_MIN_SIDE ? 1 : 0;
  return { start: [inset, inset], goal: [grid.cols - 1 - inset, grid.rows - 1 - inset] };
}

/** Breadth-first distances from `start` through cells that are not walls. */
export function distancesFrom(grid: GridSize, walls: Cells, start: number): ReadonlyMap<number, number> {
  let distance: ReadonlyMap<number, number> = new Map([[start, 0]]);
  let frontier = [start];
  for (let depth = 1; frontier.length > 0; depth += 1) {
    const reached = frontier.flatMap((index) => neighbours(grid, index));
    const next = [...new Set(reached)].filter((index) => !walls.has(index) && !distance.has(index));
    distance = new Map([...distance, ...next.map((index): [number, number] => [index, depth])]);
    frontier = next;
  }
  return distance;
}

function segment(grid: GridSize, random: () => number): Point[] {
  const [dx, dy] = pick(DIRECTIONS, random);
  const length = Math.max(SEGMENT_MIN, Math.round(Math.min(grid.cols, grid.rows) / SEGMENT_SHARE));
  const x = 1 + Math.floor(random() * (grid.cols - 2 - dx * (length - 1)));
  const y = 1 + Math.floor(random() * (grid.rows - 2 - dy * (length - 1)));
  return Array.from({ length }, (_, index): Point => [x + dx * index, y + dy * index]);
}

function around(grid: GridSize, [x, y]: Point): Cells {
  return cellsOf(
    grid,
    NEAR.flatMap((dy) => NEAR.map((dx): Point => [x + dx, y + dy])),
  );
}

function isClear(grid: GridSize, walls: Cells, cells: Cells, keep: Cells): boolean {
  return [...cells].every(
    (index) => !keep.has(index) && ![...around(grid, toPoint(grid, index))].some((near) => walls.has(near)),
  );
}

function rollWalls(grid: GridSize, random: () => number, target: number, keep: Cells): Cells {
  let walls: Cells = new Set<number>();
  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS && walls.size < target; attempt += 1) {
    const cells = cellsOf(grid, segment(grid, random));
    if (cells.size >= SEGMENT_MIN && isClear(grid, walls, cells, keep)) walls = new Set([...walls, ...cells]);
  }
  return walls;
}

function tracePath(grid: GridSize, distance: ReadonlyMap<number, number>, path: readonly number[]): number[] {
  const current = path[path.length - 1];
  const depth = distance.get(current) ?? 0;
  if (depth === 0) return [...path];
  const options = neighbours(grid, current).filter((index) => distance.get(index) === depth - 1);
  const straight = path.length > 1 ? 2 * current - path[path.length - 2] : undefined;
  const next = options.find((index) => index === straight) ?? options[0];
  return tracePath(grid, distance, [...path, next]);
}

function model(grid: GridSize, walls: Cells, start: number, goal: number): FloodModel {
  const distance = distancesFrom(grid, walls, start);
  const path = distance.has(goal) ? tracePath(grid, distance, [goal]) : [];
  return { walls, start, goal, distance, path };
}

/** Rolls short straight walls, about `density` of the grid, until the goal can be reached from the start. */
export function buildFlood(grid: GridSize, seed: number, density: number): FloodModel {
  const random = createRng(seed);
  const { start, goal } = corners(grid);
  const [startIndex, goalIndex] = [toIndex(grid, start), toIndex(grid, goal)];
  const keep = new Set([...around(grid, start), ...around(grid, goal)]);
  const target = Math.round(clamp(density, 0, 1) * grid.cols * grid.rows);
  for (let attempt = 0; attempt < LAYOUT_ATTEMPTS; attempt += 1) {
    const layout = model(grid, rollWalls(grid, random, target, keep), startIndex, goalIndex);
    if (layout.path.length > 0) return layout;
  }
  return model(grid, new Set(), startIndex, goalIndex);
}

/** The same layout with a full wall column that seals the start away from the goal. */
export function sealFlood(grid: GridSize, flood: FloodModel): FloodModel {
  const [startX] = toPoint(grid, flood.start);
  const column = clamp(Math.ceil(grid.cols / 2), startX + 1, grid.cols - 1);
  const seal = cellsOf(
    grid,
    Array.from({ length: grid.rows }, (_, y): Point => [column, y]),
  );
  const kept = [...flood.walls].filter((index) => Math.abs(toPoint(grid, index)[0] - column) > 1);
  const walls = new Set([...kept, ...seal]);
  return model(grid, walls, flood.start, flood.goal);
}
