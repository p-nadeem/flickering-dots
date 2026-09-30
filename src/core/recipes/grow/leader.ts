import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { DEFAULT_SEED, cellsOf, episodeSeeds, holdLast, step, toOutput, union } from './lattice';
import type { Cells, Step } from './lattice';
import { buildLeader, middleColumn } from './leader-model';
import type { LeaderModel } from './leader-model';

const REVEAL_MS = 40;
const FADE_MS = 60;
const FADE_FRAMES = 3;
const PAUSE_MS = 240;
const THINKING_SHARE = 0.6;
const RETURN_MS = 160;
const GROUNDED_MS = 1200;
const STRIKE_MS = 80;
const DARK_HOLD_MS = 800;
const CRACKLE_PERIOD_MS = 2000;
const SPARK_MS = 100;

interface LeaderInput {
  grid: GridSize;
  seed: number;
}

function upTo(grid: GridSize, model: LeaderModel, lastRow: number): Cells {
  const points = [...model.main, ...model.branches.flat()].filter(([, y]) => y <= lastRow);
  return cellsOf(grid, points);
}

function revealSteps(grid: GridSize, model: LeaderModel, lastRow: number): Step[] {
  return Array.from({ length: lastRow + 1 }, (_, row) => step(upTo(grid, model, row), REVEAL_MS));
}

function fadeSteps(lit: Cells, seed: number): Step[] {
  const random = createRng(seed);
  const group = new Map([...lit].map((cell) => [cell, Math.floor(random() * FADE_FRAMES)]));
  return Array.from({ length: FADE_FRAMES }, (_, frame) =>
    step(new Set([...lit].filter((cell) => (group.get(cell) ?? 0) > frame)), FADE_MS),
  );
}

function thinkingEpisode({ grid }: LeaderInput, seed: number): Step[] {
  const model = buildLeader(grid, seed);
  const lastRow = Math.max(0, Math.round(THINKING_SHARE * grid.rows) - 1);
  const reveal = revealSteps(grid, model, lastRow);
  return [...reveal, ...holdLast(fadeSteps(reveal[reveal.length - 1].cells, seed), PAUSE_MS)];
}

function mainChannel(grid: GridSize, model: LeaderModel): Cells {
  return cellsOf(grid, model.main);
}

function strike({ grid, seed }: LeaderInput): Step[] {
  const model = buildLeader(grid, seed);
  const ground = cellsOf(
    grid,
    Array.from({ length: grid.cols }, (_, x): Point => [x, grid.rows - 1]),
  );
  return [
    ...revealSteps(grid, model, grid.rows - 1),
    step(mainChannel(grid, model), RETURN_MS),
    step(union(mainChannel(grid, model), ground), GROUNDED_MS),
  ];
}

function strikeOut({ grid, seed }: LeaderInput): Step[] {
  const model = buildLeader(grid, seed);
  const channel = mainChannel(grid, model);
  return [
    ...revealSteps(grid, model, grid.rows - 1),
    step(channel, STRIKE_MS),
    step(new Set(), STRIKE_MS),
    step(channel, STRIKE_MS),
    step(new Set(), DARK_HOLD_MS),
  ];
}

function spark(grid: GridSize, random: () => number): Cells {
  const x = middleColumn(grid, random);
  const below = Math.min(grid.cols - 1, Math.max(0, x + Math.floor(random() * 3) - 1));
  return cellsOf(grid, [
    [x, 0],
    [below, 1],
  ]);
}

function cracklePeriod(grid: GridSize, seed: number): Step[] {
  const random = createRng(seed);
  const sparks = random() < 0.5 ? [spark(grid, random)] : [spark(grid, random), spark(grid, random)];
  const flashes = sparks.flatMap((cells, index) =>
    index === 0 ? [step(cells, SPARK_MS)] : [step(new Set(), SPARK_MS), step(cells, SPARK_MS)],
  );
  const used = flashes.length * SPARK_MS;
  return [...flashes, step(new Set(), CRACKLE_PERIOD_MS - used)];
}

const LEADER_BUILDERS: Readonly<Record<string, (input: LeaderInput) => Step[]>> = {
  leader: (input) => episodeSeeds(input.seed).flatMap((seed) => thinkingEpisode(input, seed)),
  'leader-crackle': ({ grid, seed }) => episodeSeeds(seed).flatMap((each) => cracklePeriod(grid, each)),
  'leader-strike': strike,
  'leader-strike-out': strikeOut,
};

/** Lightning variants of the grow recipe. */
export const LEADER_VARIANTS = ['leader', 'leader-crackle', 'leader-strike', 'leader-strike-out'] as const;

/** Draws a lightning variant: a stepped leader that feels its way down one row at a time, with short side branches. */
export function generateLeader(grid: GridSize, params: RecipeParams, variant: string): RecipeOutput {
  return toOutput(grid, LEADER_BUILDERS[variant]({ grid, seed: params.seed ?? DEFAULT_SEED }));
}
