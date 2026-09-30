import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { DEFAULT_SEED, blinkSteps, episodeSeeds, holdLast, step, toOutput, union, without } from './lattice';
import type { Cells, Step } from './lattice';
import { buildBeam, lineage } from './beam-model';
import type { BeamModel, Generation } from './beam-model';

const GROW_MS = 60;
const WIDE_GROW_MS = 90;
const WIDE_BEAM = 3;
const BLINK_MS = 250;
const BLINK_TIMES = 2;
const CLEAR_MS = 300;
const TREE_HOLD_MS = 400;
const RESULT_HOLD_MS = 1500;
const STATIC_MS = 1000;
const STEM_DOTS = 2;
const DEFAULT_WIDTH = 2;

interface BeamInput {
  grid: GridSize;
  seed: number;
  width: number;
  ms: number;
}

function aliveCells(model: BeamModel, ids: readonly number[]): Cells {
  return union(new Set([model.root]), ...ids.map((id) => new Set(lineage(model, id))));
}

function retractSteps(
  model: BeamModel,
  lit: Cells,
  alive: Cells,
  dying: readonly number[],
  ms: number,
): Step[] {
  const entries = dying.flatMap((id) =>
    lineage(model, id)
      .filter((cell) => lit.has(cell) && !alive.has(cell))
      .reverse()
      .map((cell, fromTip): [number, number] => [cell, fromTip]),
  );
  const order: ReadonlyMap<number, number> = entries.reduce(
    (found, [cell, fromTip]) => new Map([...found, [cell, Math.max(found.get(cell) ?? 0, fromTip)]]),
    new Map<number, number>(),
  );
  const longest = Math.max(0, ...order.values());
  return Array.from({ length: order.size > 0 ? longest + 1 : 0 }, (_, frame) =>
    step(new Set([...lit].filter((cell) => alive.has(cell) || (order.get(cell) ?? -1) > frame)), ms),
  );
}

function growSteps(model: BeamModel, base: Cells, grown: readonly number[], ms: number): Step[] {
  const longest = Math.max(0, ...grown.map((id) => model.branches[id].cells.length));
  return Array.from({ length: longest }, (_, index) =>
    step(union(base, ...grown.map((id) => new Set(model.branches[id].cells.slice(0, index + 1)))), ms),
  );
}

function generationSteps(model: BeamModel, alive: Cells, { grown, kept }: Generation, ms: number): Step[] {
  const growing = growSteps(model, alive, grown, ms);
  const lit = growing.length > 0 ? growing[growing.length - 1].cells : alive;
  const losers = grown.filter((id) => !kept.includes(id));
  return [...growing, ...retractSteps(model, lit, aliveCells(model, kept), losers, ms)];
}

function treeSteps(model: BeamModel, ms: number): Step[] {
  const root: Cells = new Set([model.root]);
  const aliveBefore = [root, ...model.generations.map(({ kept }) => aliveCells(model, kept))];
  return [
    step(root, ms),
    ...model.generations.flatMap((generation, index) =>
      generationSteps(model, aliveBefore[index], generation, ms),
    ),
  ];
}

function finalTree(steps: readonly Step[]): Cells {
  return steps[steps.length - 1].cells;
}

function lastGrowth(model: BeamModel): Cells {
  const { generations } = model;
  if (generations.length === 0) return new Set([model.root]);
  const before = generations.length > 1 ? generations[generations.length - 2].kept : [];
  const grown = generations[generations.length - 1].grown;
  return union(aliveCells(model, before), ...grown.map((id) => new Set(lineage(model, id))));
}

function episode({ grid, width, ms }: BeamInput, seed: number): Step[] {
  const model = buildBeam(grid, seed, width);
  const steps = treeSteps(model, ms);
  const tree = finalTree(steps);
  return [
    ...steps,
    ...blinkSteps(
      without(tree, new Set(lineage(model, model.winner))),
      new Set(lineage(model, model.winner)),
      BLINK_MS,
      BLINK_TIMES,
    ),
    step(new Set(), CLEAR_MS),
  ];
}

function winSteps({ grid, seed, width }: BeamInput): Step[] {
  const model = buildBeam(grid, seed, width);
  const path = new Set(lineage(model, model.winner));
  return [
    step(lastGrowth(model), TREE_HOLD_MS),
    step(path, BLINK_MS),
    ...holdLast(blinkSteps(new Set(), path, BLINK_MS, BLINK_TIMES), RESULT_HOLD_MS),
  ];
}

function failSteps({ grid, seed, width }: BeamInput): Step[] {
  const model = buildBeam(grid, seed, width);
  const tree = lastGrowth(model);
  const root = new Set([model.root]);
  const everyBranch = model.branches.map((_, id) => id);
  return [
    step(tree, TREE_HOLD_MS),
    ...retractSteps(model, tree, root, everyBranch, GROW_MS).slice(0, -1),
    ...holdLast(blinkSteps(new Set(), root, BLINK_MS, BLINK_TIMES), RESULT_HOLD_MS),
  ];
}

function restSteps({ grid }: BeamInput): Step[] {
  const x = Math.floor(grid.cols / 2);
  const stem = Array.from(
    { length: Math.min(STEM_DOTS + 1, grid.rows) },
    (_, index) => (grid.rows - 1 - index) * grid.cols + x,
  );
  return [step(new Set(stem), STATIC_MS)];
}

const BEAM_BUILDERS: Readonly<Record<string, (input: BeamInput) => Step[]>> = {
  beam: (input) => episodeSeeds(input.seed).flatMap((seed) => episode(input, seed)),
  'beam-rest': restSteps,
  'beam-win': winSteps,
  'beam-fail': failSteps,
};

/** Beam variants of the grow recipe. */
export const BEAM_VARIANTS = ['beam', 'beam-rest', 'beam-win', 'beam-fail'] as const;

/** Draws a beam variant: a tree that grows two rows a generation and keeps the `length` tips nearest a hidden column. */
export function generateBeam(grid: GridSize, params: RecipeParams, variant: string): RecipeOutput {
  const width = params.length || DEFAULT_WIDTH;
  const ms = width >= WIDE_BEAM ? WIDE_GROW_MS : GROW_MS;
  return toOutput(grid, BEAM_BUILDERS[variant]({ grid, seed: params.seed ?? DEFAULT_SEED, width, ms }));
}
