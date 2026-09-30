import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';

/** Lit cells as row-major indexes. */
export type Cells = ReadonlySet<number>;

/** One frame of a timeline: the lit cells and how long they show. */
export interface Step {
  cells: Cells;
  ms: number;
}

/** Seed every grow variant uses when none is given. */
export const DEFAULT_SEED = 1;

/** How many seeded episodes a loop plays. */
export const EPISODE_COUNT = 4;
const ORTHOGONAL: readonly Point[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** The fixed list of seeds a looping variant cycles through: seed, seed+1, seed+2 and seed+3. */
export function episodeSeeds(seed: number): number[] {
  return Array.from({ length: EPISODE_COUNT }, (_, index) => seed + index);
}

/** Row-major index of a point. */
export function toIndex(grid: GridSize, [x, y]: Point): number {
  return y * grid.cols + x;
}

/** Point of a row-major index. */
export function toPoint(grid: GridSize, index: number): Point {
  return [index % grid.cols, Math.floor(index / grid.cols)];
}

/** True when the point lies on the grid. */
export function isOnGrid(grid: GridSize, [x, y]: Point): boolean {
  return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
}

/** Orthogonal neighbours of a cell that lie on the grid. */
export function neighbours(grid: GridSize, index: number): number[] {
  const [x, y] = toPoint(grid, index);
  return ORTHOGONAL.map(([dx, dy]): Point => [x + dx, y + dy])
    .filter((point) => isOnGrid(grid, point))
    .map((point) => toIndex(grid, point));
}

/** Cells of the given points that lie on the grid. */
export function cellsOf(grid: GridSize, points: readonly Point[]): Cells {
  return new Set(points.filter((point) => isOnGrid(grid, point)).map((point) => toIndex(grid, point)));
}

/** Cells lit in either set. */
export function union(...sets: readonly Cells[]): Cells {
  return new Set(sets.flatMap((set) => [...set]));
}

/** Cells of `from` that are not in `removed`. */
export function without(from: Cells, removed: Cells): Cells {
  return new Set([...from].filter((index) => !removed.has(index)));
}

/** A step lasting `ms`. */
export function step(cells: Cells, ms: number): Step {
  return { cells, ms };
}

/** Shows `base` plus `blinking`, then only `base`, `times` times over, ending lit. */
export function blinkSteps(base: Cells, blinking: Cells, ms: number, times: number): Step[] {
  const lit = union(base, blinking);
  const dark = without(base, blinking);
  return Array.from({ length: times }, () => [step(dark, ms), step(lit, ms)]).flat();
}

/** Sets the duration of the last step. */
export function holdLast(steps: readonly Step[], ms: number): Step[] {
  return steps.map((item, index) => (index === steps.length - 1 ? step(item.cells, ms) : item));
}

function toFrame(grid: GridSize, cells: Cells): Frame {
  return createFrame(grid, (x, y) => cells.has(y * grid.cols + x));
}

/** Turns a timeline into recipe output. */
export function toOutput(grid: GridSize, steps: readonly Step[]): RecipeOutput {
  return { frames: steps.map(({ cells }) => toFrame(grid, cells)), durations: steps.map(({ ms }) => ms) };
}

/** Picks an item with a random number from [0, 1). */
export function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

/** Clamps a value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
