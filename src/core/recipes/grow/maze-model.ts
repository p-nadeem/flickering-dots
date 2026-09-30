import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { EPISODE_COUNT, cellsOf, neighbours, pick, toIndex, union, without } from './lattice';
import type { Cells } from './lattice';

/** A carved maze and its dead-end filling, as lit cells on the grid. */
export interface MazeModel {
  carve: Cells[];
  layers: Cells[];
  path: number[];
  start: number;
  end: number;
  side: number;
  origin: Point;
}

interface CarveState {
  stack: Point[];
  seen: ReadonlySet<string>;
  carve: Cells[];
}

const CELL_STEPS: readonly Point[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const MIN_FILL_LAYERS = 3;
const SEED_SEARCH_LIMIT = 64;

/** Side of the centred odd square the maze uses. */
export function mazeSide(grid: GridSize): number {
  const short = Math.min(grid.cols, grid.rows);
  return short % 2 === 1 ? short : short - 1;
}

function mazeOrigin(grid: GridSize, side: number): Point {
  return [Math.floor((grid.cols - side) / 2), Math.floor((grid.rows - side) / 2)];
}

function toLattice(origin: Point, [cx, cy]: Point, [dx, dy]: Point = [0, 0]): Point {
  return [origin[0] + 2 * cx + 1 + dx, origin[1] + 2 * cy + 1 + dy];
}

function openNeighbours([cx, cy]: Point, count: number, seen: ReadonlySet<string>): Point[] {
  return CELL_STEPS.filter(([dx, dy]) => {
    const [x, y] = [cx + dx, cy + dy];
    return x >= 0 && y >= 0 && x < count && y < count && !seen.has(`${x},${y}`);
  });
}

function carveMaze(grid: GridSize, origin: Point, count: number, random: () => number): Cells[] {
  let state: CarveState = { stack: [[0, 0]], seen: new Set(['0,0']), carve: [] };
  const first = cellsOf(grid, [toLattice(origin, [0, 0])]);
  while (state.stack.length > 0) {
    const head = state.stack[state.stack.length - 1];
    const options = openNeighbours(head, count, state.seen);
    if (options.length === 0) {
      state = { ...state, stack: state.stack.slice(0, -1) };
      continue;
    }
    const [dx, dy] = pick(options, random);
    const next: Point = [head[0] + dx, head[1] + dy];
    const previous = state.carve.length > 0 ? state.carve[state.carve.length - 1] : first;
    const added = cellsOf(grid, [toLattice(origin, head, [dx, dy]), toLattice(origin, next)]);
    state = {
      stack: [...state.stack, next],
      seen: new Set([...state.seen, `${next[0]},${next[1]}`]),
      carve: [...state.carve, union(previous, added)],
    };
  }
  return state.carve.length > 0 ? state.carve : [first];
}

function deadEnds(grid: GridSize, lit: Cells, keep: Cells): Cells {
  return new Set(
    [...lit].filter(
      (index) => !keep.has(index) && neighbours(grid, index).filter((next) => lit.has(next)).length <= 1,
    ),
  );
}

function fillLayers(grid: GridSize, lit: Cells, keep: Cells): Cells[] {
  const removed = deadEnds(grid, lit, keep);
  if (removed.size === 0) return [];
  const next = without(lit, removed);
  return [next, ...fillLayers(grid, next, keep)];
}

function orderPath(grid: GridSize, lit: Cells, path: readonly number[]): number[] {
  const visited = new Set(path);
  const next = neighbours(grid, path[path.length - 1]).find((index) => lit.has(index) && !visited.has(index));
  return next === undefined ? [...path] : orderPath(grid, lit, [...path, next]);
}

/** Carves a maze with a recursive backtracker and fills its dead ends one layer at a time. */
export function buildMaze(grid: GridSize, seed: number): MazeModel {
  const side = mazeSide(grid);
  const origin = mazeOrigin(grid, side);
  const count = (side - 1) / 2;
  const start = toIndex(grid, toLattice(origin, [0, 0]));
  const end = toIndex(grid, toLattice(origin, [Math.max(count - 1, 0), Math.max(count - 1, 0)]));
  const carve = carveMaze(grid, origin, Math.max(count, 1), createRng(seed));
  const layers = fillLayers(grid, carve[carve.length - 1], new Set([start, end]));
  const solved = layers.length > 0 ? layers[layers.length - 1] : carve[carve.length - 1];
  return { carve, layers, path: orderPath(grid, solved, [start]), start, end, side, origin };
}

/** Mazes for the loop: the first four seeds from `seed` up whose filling takes at least three layers. */
export function mazeEpisodes(grid: GridSize, seed: number): MazeModel[] {
  const candidates = Array.from({ length: SEED_SEARCH_LIMIT }, (_, index) => seed + index);
  const mazes = candidates.reduce<MazeModel[]>((found, candidate) => {
    if (found.length === EPISODE_COUNT) return found;
    const maze = buildMaze(grid, candidate);
    return maze.layers.length >= MIN_FILL_LAYERS ? [...found, maze] : found;
  }, []);
  const fallback = candidates
    .slice(0, EPISODE_COUNT - mazes.length)
    .map((candidate) => buildMaze(grid, candidate));
  return [...mazes, ...fallback];
}
