import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { BEAM_VARIANTS, generateBeam } from './beam';
import { DLA_VARIANTS, generateDla } from './dla';
import { FLOOD_VARIANTS, generateFlood } from './flood';
import { DEFAULT_SEED } from './lattice';
import { LEADER_VARIANTS, generateLeader } from './leader';
import { MAZE_VARIANTS, generateMaze } from './maze';

type Engine = (grid: GridSize, params: RecipeParams, variant: string) => RecipeOutput;

const ENGINES: readonly (readonly [readonly string[], Engine])[] = [
  [MAZE_VARIANTS, generateMaze],
  [FLOOD_VARIANTS, generateFlood],
  [BEAM_VARIANTS, generateBeam],
  [DLA_VARIANTS, generateDla],
  [LEADER_VARIANTS, generateLeader],
];

/** Variants of the `grow` recipe: maze, flood, beam, crystal (dla) and lightning (leader) moments. */
export const GROW_VARIANTS = [
  ...MAZE_VARIANTS,
  ...FLOOD_VARIANTS,
  ...BEAM_VARIANTS,
  ...DLA_VARIANTS,
  ...LEADER_VARIANTS,
] as const;

/** One of `GROW_VARIANTS`. */
export type GrowVariant = (typeof GROW_VARIANTS)[number];

/** Default params of the `grow` recipe. */
export const GROW_DEFAULTS = { variant: 'maze', seed: DEFAULT_SEED } as const satisfies RecipeParams;

function engineFor(variant: string): Engine {
  const match = ENGINES.find(([variants]) => variants.includes(variant));
  if (match === undefined) {
    throw new Error(
      `flickering-dots grow: unknown variant "${variant}"; use one of ${GROW_VARIANTS.join(', ')}`,
    );
  }
  return match[1];
}

/** Graph growth and search on the dot lattice: a maze, a flood search, a beam-search tree, a frost crystal or a lightning leader, seeded and deterministic. */
export function generateGrow(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? GROW_DEFAULTS.variant;
  return engineFor(variant)(grid, params, variant);
}
