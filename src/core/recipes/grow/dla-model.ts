import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { clamp, neighbours, pick, toIndex, toPoint } from './lattice';
import type { Cells } from './lattice';

/** One walker: how many cells it visited and the last of them, ending on the cell where it sticks. */
export interface Walk {
  tail: readonly number[];
  steps: number;
}

/** A grown crystal: its seed cells and the walks that stuck to it, in order. */
export interface DlaModel {
  seed: Cells;
  walks: Walk[];
}

const MIN_TARGET = 2;
const LONG_WALK = 12;
const SHOWN_TAIL = 6;
const WALK_LIMIT = 2000;
const WALK_RETRIES = 8;

function borderCells(grid: GridSize): number[] {
  return Array.from({ length: grid.cols * grid.rows }, (_, index) => index).filter((index) => {
    const [x, y] = toPoint(grid, index);
    return x === 0 || y === 0 || x === grid.cols - 1 || y === grid.rows - 1;
  });
}

/** A cell and its mirror images across the grid's two centre lines. */
export function mirrors(grid: GridSize, index: number): Cells {
  const [x, y] = toPoint(grid, index);
  const [mx, my] = [grid.cols - 1 - x, grid.rows - 1 - y];
  return new Set([
    toIndex(grid, [x, y]),
    toIndex(grid, [mx, y]),
    toIndex(grid, [x, my]),
    toIndex(grid, [mx, my]),
  ]);
}

function sticks(grid: GridSize, crystal: Cells, index: number): boolean {
  return neighbours(grid, index).filter((next) => crystal.has(next)).length === 1;
}

function walk(grid: GridSize, crystal: Cells, random: () => number): Walk | null {
  const spawns = borderCells(grid).filter((index) => !crystal.has(index));
  if (spawns.length === 0) return null;
  let tail = [pick(spawns, random)];
  let steps = 1;
  while (!sticks(grid, crystal, tail[tail.length - 1])) {
    const moves = neighbours(grid, tail[tail.length - 1]).filter((next) => !crystal.has(next));
    if (steps > WALK_LIMIT || moves.length === 0) return null;
    tail = [...tail, pick(moves, random)].slice(-LONG_WALK);
    steps += 1;
  }
  return { tail, steps };
}

/** The cells a walker shows: all of a short walk, or the last six of one longer than twelve. */
export function shownWalk({ tail, steps }: Walk): readonly number[] {
  return steps > LONG_WALK ? tail.slice(-SHOWN_TAIL) : tail;
}

function stuckCell({ tail }: Walk): number {
  return tail[tail.length - 1];
}

/** Fill target in cells: `density` of the grid, at least two. */
export function fillTarget(grid: GridSize, density: number): number {
  return Math.max(MIN_TARGET, Math.round(clamp(density, 0, 1) * grid.cols * grid.rows));
}

/** Grows a four-way mirrored crystal from the centre by random walkers that stick beside it, up to the fill target. */
export function buildDla(grid: GridSize, seed: number, density: number): DlaModel {
  const random = createRng(seed);
  const centre: Point = [Math.floor((grid.cols - 1) / 2), Math.floor((grid.rows - 1) / 2)];
  const start = mirrors(grid, toIndex(grid, centre));
  const target = fillTarget(grid, density);
  let walks: Walk[] = [];
  let crystal: Cells = start;
  let failures = 0;
  while (crystal.size < target && failures < WALK_RETRIES) {
    const next = walk(grid, crystal, random);
    failures = next === null ? failures + 1 : 0;
    if (next === null) continue;
    walks = [...walks, next];
    crystal = new Set([...crystal, ...mirrors(grid, stuckCell(next))]);
  }
  return { seed: start, walks };
}

/** The crystal after the first `count` walkers have stuck, mirrored four ways. */
export function crystalAt(grid: GridSize, model: DlaModel, count: number): Cells {
  const stuck = model.walks.slice(0, count).flatMap((next) => [...mirrors(grid, stuckCell(next))]);
  return new Set([...model.seed, ...stuck]);
}
