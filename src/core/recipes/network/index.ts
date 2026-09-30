import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import {
  generateCircuit,
  generateCircuitBreak,
  generateCircuitLit,
  generateCircuitRoundtrip,
  generateTraceIdle,
} from './circuit';
import { generateConstellation, generateConstellationLock, generateConstellationSnap } from './constellation';
import { NETWORK_DEFAULT_SEED } from './network-options';
import type { NetworkOptions } from './network-options';
import { generateSparkleGrow, generateStars } from './sparkle';
import {
  generateSynapse,
  generateSynapseDrop,
  generateSynapseForward,
  generateSynapseRest,
  generateSynapseTrain,
} from './synapse';

/** Variants of the `network` recipe, the values `params.variant` accepts. */
export const NETWORK_VARIANTS = [
  'synapse',
  'synapse-rest',
  'synapse-forward',
  'synapse-drop',
  'synapse-train',
  'stars',
  'constellation',
  'constellation-lock',
  'constellation-snap',
  'sparkle-grow',
  'circuit',
  'trace-idle',
  'circuit-roundtrip',
  'circuit-lit',
  'circuit-break',
] as const;

/** One of `NETWORK_VARIANTS`. */
export type NetworkVariant = (typeof NETWORK_VARIANTS)[number];

/** Default params of the `network` recipe. */
export const NETWORK_DEFAULTS = {
  variant: 'synapse',
  seed: NETWORK_DEFAULT_SEED,
} as const satisfies RecipeParams;

type VariantBuilder = (grid: GridSize, options: NetworkOptions) => RecipeOutput;

const BUILDERS: Readonly<Record<NetworkVariant, VariantBuilder>> = {
  synapse: generateSynapse,
  'synapse-rest': generateSynapseRest,
  'synapse-forward': generateSynapseForward,
  'synapse-drop': generateSynapseDrop,
  'synapse-train': generateSynapseTrain,
  stars: generateStars,
  constellation: generateConstellation,
  'constellation-lock': generateConstellationLock,
  'constellation-snap': generateConstellationSnap,
  'sparkle-grow': generateSparkleGrow,
  circuit: generateCircuit,
  'trace-idle': generateTraceIdle,
  'circuit-roundtrip': generateCircuitRoundtrip,
  'circuit-lit': generateCircuitLit,
  'circuit-break': generateCircuitBreak,
};

function isNetworkVariant(name: string): name is NetworkVariant {
  return NETWORK_VARIANTS.some((variant) => variant === name);
}

function toVariant(name: string): NetworkVariant {
  if (isNetworkVariant(name)) return name;
  throw new Error(
    `flickering-dots network: unknown variant ${JSON.stringify(name)}; use one of ${NETWORK_VARIANTS.join(', ')}`,
  );
}

/** Fixed nodes, Bresenham edges and moving impulses: synapse, constellation and circuit variants. */
export function generateNetwork(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = toVariant(params.variant ?? NETWORK_DEFAULTS.variant);
  const seed = params.seed ?? NETWORK_DEFAULTS.seed;
  return BUILDERS[variant](grid, { seed, length: params.length });
}
