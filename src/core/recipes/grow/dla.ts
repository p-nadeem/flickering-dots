import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import {
  DEFAULT_SEED,
  episodeSeeds,
  holdLast,
  neighbours,
  step,
  toOutput,
  toPoint,
  union,
  without,
} from './lattice';
import type { Cells, Step } from './lattice';
import { buildDla, crystalAt, mirrors, shownWalk } from './dla-model';
import type { DlaModel } from './dla-model';
import { shatterFrames } from './shatter';

const WALK_MS = 30;
const SHATTER_MS = 60;
const GROWN_HOLD_MS = 400;
const DARK_MS = 300;
const PROGRESS_MS = 120;
const STATIC_MS = 1000;
const TIP_MS = 80;
const FINISH_DOTS = 4;
const RESULT_HOLD_MS = 1200;
const DEFAULT_FILL = 0.35;

interface DlaInput {
  grid: GridSize;
  seed: number;
  density: number;
}

function walkSteps(grid: GridSize, model: DlaModel): Step[] {
  return model.walks.flatMap((path, index) => {
    const crystal = crystalAt(grid, model, index);
    return shownWalk(path).map((cell) => step(union(crystal, mirrors(grid, cell)), WALK_MS));
  });
}

function full(grid: GridSize, model: DlaModel): Cells {
  return crystalAt(grid, model, model.walks.length);
}

function shatterSteps(grid: GridSize, crystal: Cells): Step[] {
  return shatterFrames(grid, crystal).map((cells) => step(cells, SHATTER_MS));
}

function episode(input: DlaInput, seed: number): Step[] {
  const model = buildDla(input.grid, seed, input.density);
  const crystal = full(input.grid, model);
  return [
    step(crystalAt(input.grid, model, 0), WALK_MS),
    ...holdLast(walkSteps(input.grid, model), GROWN_HOLD_MS),
    ...holdLast(shatterSteps(input.grid, crystal), DARK_MS),
  ];
}

function progress(input: DlaInput): Step[] {
  const model = buildDla(input.grid, input.seed, input.density);
  const growth = Array.from({ length: model.walks.length + 1 }, (_, count) =>
    step(crystalAt(input.grid, model, count), PROGRESS_MS),
  );
  return [
    ...holdLast(growth, GROWN_HOLD_MS),
    ...holdLast(shatterSteps(input.grid, full(input.grid, model)), DARK_MS),
  ];
}

function tipOrder(grid: GridSize, crystal: Cells, seed: Cells): number[] {
  const [cx, cy] = [(grid.cols - 1) / 2, (grid.rows - 1) / 2];
  const tips = [...crystal].filter(
    (cell) => !seed.has(cell) && neighbours(grid, cell).filter((next) => crystal.has(next)).length === 1,
  );
  const angle = (cell: number): number => {
    const [x, y] = toPoint(grid, cell);
    return Math.atan2(y - cy, x - cx);
  };
  return [...tips].sort((a, b) => angle(a) - angle(b));
}

function tips(input: DlaInput): Step[] {
  const model = buildDla(input.grid, input.seed, input.density);
  const crystal = full(input.grid, model);
  const firstShown = Math.max(0, model.walks.length - FINISH_DOTS);
  const finishing = Array.from({ length: model.walks.length - firstShown + 1 }, (_, index) =>
    step(crystalAt(input.grid, model, firstShown + index), TIP_MS),
  );
  const blinking = tipOrder(input.grid, crystal, model.seed).flatMap((tip) => [
    step(without(crystal, new Set([tip])), TIP_MS),
    step(crystal, TIP_MS),
  ]);
  return holdLast([...finishing, ...blinking], RESULT_HOLD_MS);
}

function shatter(input: DlaInput): Step[] {
  const crystal = full(input.grid, buildDla(input.grid, input.seed, input.density));
  return [step(crystal, GROWN_HOLD_MS), ...holdLast(shatterSteps(input.grid, crystal), RESULT_HOLD_MS)];
}

const DLA_BUILDERS: Readonly<Record<string, (input: DlaInput) => Step[]>> = {
  dla: (input) => episodeSeeds(input.seed).flatMap((seed) => episode(input, seed)),
  'dla-rest': (input) => [step(full(input.grid, buildDla(input.grid, input.seed, input.density)), STATIC_MS)],
  'dla-progress': progress,
  'dla-tips': tips,
  'dla-shatter': shatter,
};

/** Crystal variants of the grow recipe. */
export const DLA_VARIANTS = ['dla', 'dla-rest', 'dla-progress', 'dla-tips', 'dla-shatter'] as const;

/** Draws a crystal variant: random walkers stick to a centre seed until `density` of the grid is filled. */
export function generateDla(grid: GridSize, params: RecipeParams, variant: string): RecipeOutput {
  const input = { grid, seed: params.seed ?? DEFAULT_SEED, density: params.density ?? DEFAULT_FILL };
  return toOutput(grid, DLA_BUILDERS[variant](input));
}
