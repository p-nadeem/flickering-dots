import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { clamp } from './lattice';

/** A stepped leader: the main channel (one cell per row from the top) and its short diagonal side branches. */
export interface LeaderModel {
  main: Point[];
  branches: Point[][];
}

const LEFT_WEIGHT = 0.3;
const STRAIGHT_WEIGHT = 0.4;
const BRANCH_CHANCE_PER_TURN = 0.4;
const BRANCH_MIN_ROWS = 2;
const BRANCH_MAX_ROWS = 4;
const THIRDS = 3;

function drift(random: () => number): number {
  const roll = random();
  if (roll < LEFT_WEIGHT) return -1;
  return roll < LEFT_WEIGHT + STRAIGHT_WEIGHT ? 0 : 1;
}

/** A seeded column in the middle third of the grid. */
export function middleColumn(grid: GridSize, random: () => number): number {
  const low = Math.floor(grid.cols / THIRDS);
  const high = grid.cols - 1 - low;
  return low + Math.floor(random() * (high - low + 1));
}

function branchFrom(grid: GridSize, [x, y]: Point, side: number, random: () => number): Point[] {
  const rows = BRANCH_MIN_ROWS + Math.floor(random() * (BRANCH_MAX_ROWS - BRANCH_MIN_ROWS + 1));
  return Array.from({ length: rows }, (_, index): Point => [x + side * (index + 1), y + index + 1]).filter(
    ([bx, by]) => bx >= 0 && bx < grid.cols && by < grid.rows,
  );
}

/** Grows a leader from a seeded top column down to the bottom row, with side branches. */
export function buildLeader(grid: GridSize, seed: number): LeaderModel {
  const random = createRng(seed);
  let main: Point[] = [[middleColumn(grid, random), 0]];
  let branches: Point[][] = [];
  for (let y = 1; y < grid.rows; y += 1) {
    const [x] = main[main.length - 1];
    const next = clamp(x + drift(random), 0, grid.cols - 1);
    const isTurn = next !== x && y < grid.rows - 1;
    if (isTurn && random() < BRANCH_CHANCE_PER_TURN) {
      branches = [...branches, branchFrom(grid, [x, y - 1], x - next, random)];
    }
    main = [...main, [next, y]];
  }
  return { main, branches: branches.filter((branch) => branch.length > 0) };
}
