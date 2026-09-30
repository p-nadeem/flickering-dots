import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { DROPLET_BUILDERS } from './droplet';
import { FIREFLY_BUILDERS } from './fireflies';
import { limitFlashRate } from './flash-limit';
import { generateBurst, generateDud, generateEmber, generateFuse } from './fireworks';
import { FOUNTAIN_BUILDERS } from './fountain';
import type { ParticlesBuilder } from './steps';
import { WARP_BUILDERS } from './warp';

/** Variants of the `particles` recipe, one engine for the fireworks, fountain, hyperspace, fireflies and droplet sets. */
export const PARTICLES_VARIANTS = [
  'burst',
  'fuse',
  'dud',
  'ember',
  'jet',
  'jet-burst',
  'jet-sputter',
  'jet-progress',
  'warp',
  'warp-drift',
  'warp-arrive',
  'warp-stall',
  'fireflies',
  'fireflies-beat',
  'fireflies-sync',
  'fireflies-scatter',
  'drip',
  'drip-form',
  'drip-fill',
  'drip-miss',
] as const;

/** One of `PARTICLES_VARIANTS`. */
export type ParticlesVariant = (typeof PARTICLES_VARIANTS)[number];

/** Default params of the `particles` recipe. */
export const PARTICLES_DEFAULTS = { variant: 'warp', seed: 3 } as const satisfies RecipeParams;

const BUILDERS: Readonly<Record<ParticlesVariant, ParticlesBuilder>> = {
  burst: generateBurst,
  fuse: generateFuse,
  dud: generateDud,
  ember: generateEmber,
  ...FOUNTAIN_BUILDERS,
  ...WARP_BUILDERS,
  ...FIREFLY_BUILDERS,
  ...DROPLET_BUILDERS,
};

function isParticlesVariant(variant: string): variant is ParticlesVariant {
  return PARTICLES_VARIANTS.some((name) => name === variant);
}

/** A seeded particle engine: continuous positions rounded to cells, one named variant per scene, flashing at most 3 times a second. */
export function generateParticles(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? PARTICLES_DEFAULTS.variant;
  if (!isParticlesVariant(variant)) {
    throw new Error(
      `flickering-dots particles: unknown variant ${JSON.stringify(variant)}; use one of ${PARTICLES_VARIANTS.join(', ')}`,
    );
  }
  return limitFlashRate(grid, BUILDERS[variant](grid, params, params.seed ?? PARTICLES_DEFAULTS.seed));
}
