import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { DEFAULT_SEED, blinkSteps, episodeSeeds, holdLast, step, toOutput, union } from './lattice';
import type { Cells, Step } from './lattice';
import { buildFlood, sealFlood } from './flood-model';
import type { FloodModel } from './flood-model';

const FRONT_MS = 80;
const TRACE_MS = 50;
const TRACE_HOLD_MS = 500;
const RESULT_HOLD_MS = 1500;
const STATIC_MS = 1000;
const WAIT_MS = 500;
const SEALED_HOLD_MS = 400;
const BLINK_MS = 250;
const BLINK_TIMES = 2;
const CLEAR_MS = 600;
const DEFAULT_WALLS = 0.25;
const FRONT_DEPTH = 2;
const THIRDS = 3;

interface FloodInput {
  grid: GridSize;
  seed: number;
  density: number;
}

function cellsWithin(flood: FloodModel, low: number, high: number): Cells {
  return new Set([...flood.distance].filter(([, d]) => d >= low && d <= high).map(([index]) => index));
}

function frontSteps(flood: FloodModel, last: number): Step[] {
  return Array.from({ length: last + 1 }, (_, t) =>
    step(union(flood.walls, cellsWithin(flood, t - FRONT_DEPTH + 1, t)), FRONT_MS),
  );
}

function traceSteps(flood: FloodModel, holdMs: number): Step[] {
  const steps = flood.path.map((_, index) => step(new Set(flood.path.slice(0, index + 1)), TRACE_MS));
  return holdLast(steps, holdMs);
}

function episode(flood: FloodModel): Step[] {
  const goalDistance = flood.distance.get(flood.goal) ?? 0;
  return [...frontSteps(flood, goalDistance - 1), ...traceSteps(flood, TRACE_HOLD_MS)];
}

function layout({ grid, seed, density }: FloodInput): FloodModel {
  return buildFlood(grid, seed, density);
}

function thinking(input: FloodInput): Step[] {
  return episodeSeeds(input.seed).flatMap((seed) => episode(layout({ ...input, seed })));
}

function frontSize(flood: FloodModel, t: number): number {
  return cellsWithin(flood, t - FRONT_DEPTH + 1, t).size;
}

function waiting(input: FloodInput): Step[] {
  const flood = layout(input);
  const goalDistance = flood.distance.get(flood.goal) ?? 0;
  const first = Math.max(1, Math.floor(goalDistance / THIRDS));
  const last = Math.max(first, Math.ceil((goalDistance * 2) / THIRDS));
  const middle = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const pause = middle.reduce(
    (best, t) => (frontSize(flood, t) < frontSize(flood, best) ? t : best),
    middle[0],
  );
  const front = cellsWithin(flood, pause - FRONT_DEPTH + 1, pause);
  return [step(union(flood.walls, front), WAIT_MS), step(flood.walls, WAIT_MS)];
}

function sealed(input: FloodInput): Step[] {
  const flood = sealFlood(input.grid, layout(input));
  const deepest = Math.max(...flood.distance.values());
  const filling = Array.from({ length: deepest + 1 }, (_, t) =>
    step(union(flood.walls, cellsWithin(flood, 0, t)), FRONT_MS),
  );
  const water = cellsWithin(flood, 0, deepest);
  return [
    ...holdLast(filling, SEALED_HOLD_MS),
    ...blinkSteps(flood.walls, water, BLINK_MS, BLINK_TIMES),
    step(new Set(), CLEAR_MS),
  ];
}

const FLOOD_BUILDERS: Readonly<Record<string, (input: FloodInput) => Step[]>> = {
  flood: thinking,
  'flood-rest': (input) => {
    const flood = layout(input);
    return [step(union(flood.walls, new Set([flood.start])), STATIC_MS)];
  },
  'flood-path': (input) => traceSteps(layout(input), RESULT_HOLD_MS),
  'flood-sealed': sealed,
  'flood-wait': waiting,
};

/** Flood variants of the grow recipe. */
export const FLOOD_VARIANTS = ['flood', 'flood-rest', 'flood-path', 'flood-sealed', 'flood-wait'] as const;

/** Draws a flood variant: a breadth-first front that bends round walls, then the shortest path back. */
export function generateFlood(grid: GridSize, params: RecipeParams, variant: string): RecipeOutput {
  const input = { grid, seed: params.seed ?? DEFAULT_SEED, density: params.density ?? DEFAULT_WALLS };
  return toOutput(grid, FLOOD_BUILDERS[variant](input));
}
