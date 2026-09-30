import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { generateCorridor, generateCorridorHover, generateCorridorRush } from './corridor';
import { generateCorridorLand, generateCorridorReverse } from './corridor-moments';
import { limitFlashRate } from './flash-safe';
import { generateMetaball } from './metaball';
import { generateMetaballDrip, generateMetaballMerge } from './metaball-moments';
import { generateSpiral, generateSpiralUnwind } from './spiral';

/** Variants of the `shader` recipe: lava lamp metaballs, the corridor tunnel and the spiral wave. */
export const SHADER_VARIANTS = [
  'metaball',
  'metaball-merge',
  'metaball-drip',
  'corridor',
  'corridor-hover',
  'corridor-rush',
  'corridor-land',
  'corridor-reverse',
  'spiral',
  'spiral-unwind',
] as const;

/** One of `SHADER_VARIANTS`. */
export type ShaderVariant = (typeof SHADER_VARIANTS)[number];

/** Default params of the `shader` recipe. */
export const SHADER_DEFAULTS = { variant: 'metaball' } as const satisfies RecipeParams;

interface ShaderEngine {
  generate: (grid: GridSize, params: RecipeParams) => RecipeOutput;
  isLoop: boolean;
}

const ENGINES: Readonly<Record<ShaderVariant, ShaderEngine>> = {
  metaball: { generate: generateMetaball, isLoop: true },
  'metaball-merge': { generate: generateMetaballMerge, isLoop: false },
  'metaball-drip': { generate: generateMetaballDrip, isLoop: false },
  corridor: { generate: generateCorridor, isLoop: true },
  'corridor-hover': { generate: generateCorridorHover, isLoop: true },
  'corridor-rush': { generate: generateCorridorRush, isLoop: true },
  'corridor-land': { generate: generateCorridorLand, isLoop: false },
  'corridor-reverse': { generate: generateCorridorReverse, isLoop: false },
  spiral: { generate: generateSpiral, isLoop: true },
  'spiral-unwind': { generate: generateSpiralUnwind, isLoop: false },
};

/** True when `variant` is one of `SHADER_VARIANTS`. */
export function isShaderVariant(variant: string): variant is ShaderVariant {
  return SHADER_VARIANTS.some((name) => name === variant);
}

/** A per-dot shader recipe: on or off from f(x, y, t) for each named variant, timed to stay under three flashes a second. */
export function generateShader(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? SHADER_DEFAULTS.variant;
  if (!isShaderVariant(variant)) {
    throw new Error(
      `flickering-dots shader: unknown variant ${JSON.stringify(variant)}; use one of ${SHADER_VARIANTS.join(', ')}`,
    );
  }
  const engine = ENGINES[variant];
  return limitFlashRate(engine.generate(grid, params), engine.isLoop);
}
