import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import {
  DEFAULT_SEED,
  EPISODE_COUNT,
  blinkSteps,
  holdLast,
  step,
  toOutput,
  toPoint,
  without,
} from './lattice';
import type { Cells, Step } from './lattice';
import { buildMaze, mazeEpisodes } from './maze-model';
import type { MazeModel } from './maze-model';

const CARVE_MS = 60;
const CARVED_HOLD_MS = 400;
const FILL_MS = 90;
const PATH_HOLD_MS = 600;
const BLINK_MS = 250;
const BLINK_TIMES = 2;
const CLEAR_MS = 250;
const TRACE_MS = 40;
const TRACE_HOLD_MS = 1500;
const STATIC_MS = 1000;
const WAIT_MS = 500;
const HEAD_BLINK_MS = 250;
const STOPPED_HOLD_MS = 300;
const COLLAPSE_MS = 90;
const COLLAPSE_HOLD_MS = 600;

function solved(maze: MazeModel): Cells {
  return new Set(maze.path);
}

function carved(maze: MazeModel): Cells {
  return maze.carve[maze.carve.length - 1];
}

function episodeSteps(maze: MazeModel): Step[] {
  const carving = holdLast(
    maze.carve.map((cells) => step(cells, CARVE_MS)),
    CARVED_HOLD_MS,
  );
  const filling = maze.layers.map((cells) => step(cells, FILL_MS));
  const path = solved(maze);
  return [
    ...carving,
    ...holdLast(filling, PATH_HOLD_MS),
    ...blinkSteps(new Set(), path, BLINK_MS, BLINK_TIMES),
    step(new Set(), CLEAR_MS),
  ];
}

function thinking(grid: GridSize, seed: number): Step[] {
  return mazeEpisodes(grid, seed).flatMap(episodeSteps);
}

function lastLoopMaze(grid: GridSize, seed: number): MazeModel {
  return mazeEpisodes(grid, seed)[EPISODE_COUNT - 1];
}

function trace(grid: GridSize, seed: number): Step[] {
  const { path } = lastLoopMaze(grid, seed);
  const steps = path.map((_, index) => step(new Set(path.slice(0, index + 1)), TRACE_MS));
  return holdLast(steps, TRACE_HOLD_MS);
}

function ringOf(maze: MazeModel, grid: GridSize, index: number): number {
  const [x, y] = toPoint(grid, index);
  const [left, top] = maze.origin;
  const last = maze.side - 1;
  return Math.min(x - left, y - top, left + last - x, top + last - y);
}

function collapse(grid: GridSize, seed: number): Step[] {
  const maze = buildMaze(grid, seed);
  const stopAt = Math.floor((maze.carve.length - 1) / 2);
  const stopped = maze.carve[stopAt];
  const previous = stopAt > 0 ? maze.carve[stopAt - 1] : new Set<number>();
  const head = without(stopped, previous);
  const rings = Array.from(
    { length: (maze.side - 1) / 2 },
    (_, ring) => new Set([...stopped].filter((index) => ringOf(maze, grid, index) > ring + 1)),
  );
  const falling = rings.filter((cells, index) => index === 0 || cells.size < rings[index - 1].size);
  return [
    step(stopped, STOPPED_HOLD_MS),
    ...blinkSteps(without(stopped, head), head, HEAD_BLINK_MS, BLINK_TIMES),
    ...holdLast(
      falling.map((cells) => step(cells, COLLAPSE_MS)),
      COLLAPSE_HOLD_MS,
    ),
  ];
}

function waiting(grid: GridSize, seed: number): Step[] {
  const maze = buildMaze(grid, seed);
  const full = carved(maze);
  return [step(full, WAIT_MS), step(without(full, new Set([maze.start])), WAIT_MS)];
}

const MAZE_BUILDERS: Readonly<Record<string, (grid: GridSize, seed: number) => Step[]>> = {
  maze: thinking,
  'maze-path': (grid, seed) => [step(solved(lastLoopMaze(grid, seed)), STATIC_MS)],
  'maze-trace': trace,
  'maze-collapse': collapse,
  'maze-wait': waiting,
};

/** Maze variants of the grow recipe. */
export const MAZE_VARIANTS = ['maze', 'maze-path', 'maze-trace', 'maze-collapse', 'maze-wait'] as const;

/** Draws a maze variant: carve, fill the dead ends and show the path, or one of its still and result moments. */
export function generateMaze(grid: GridSize, params: RecipeParams, variant: string): RecipeOutput {
  const seed = params.seed ?? DEFAULT_SEED;
  return toOutput(grid, MAZE_BUILDERS[variant](grid, seed));
}
