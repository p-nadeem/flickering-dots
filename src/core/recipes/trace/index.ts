import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { CIRCLE_SPEC, KNOT_SPEC, LEVEL_SPEC, generateLissajous } from './lissajous';
import { generateOrrery, generateOrreryEclipse } from './orrery';
import { generateOrreryAlign, generateOrreryEscape } from './orrery-results';
import { generateCollapse, generateFlatline } from './scope-results';
import { generateSpiro, generateSpiroProgress, generateSpiroRest } from './spiro';
import { generateSpiroComplete, generateSpiroCrumble } from './spiro-results';

/** Variants of the `trace` recipe: scope figures, the spirograph rosette and the orrery. */
export const TRACE_VARIANTS = [
  'lissajous-1-1',
  'lissajous-3-2',
  'lissajous-1-1-level',
  'lissajous-collapse',
  'flatline',
  'spiro',
  'spiro-rest',
  'spiro-progress',
  'spiro-complete',
  'spiro-crumble',
  'orrery',
  'orrery-eclipse',
  'orrery-align',
  'orrery-escape',
] as const;

/** One of `TRACE_VARIANTS`. */
export type TraceVariant = (typeof TRACE_VARIANTS)[number];

/** Default params of the `trace` recipe; trail, seed, length and frames default per variant. */
export const TRACE_DEFAULTS = { variant: 'lissajous-3-2' } as const satisfies RecipeParams;

type TraceFn = (grid: GridSize, params: RecipeParams) => RecipeOutput;

const VARIANT_BUILDERS: Readonly<Record<TraceVariant, TraceFn>> = {
  'lissajous-1-1': (grid, params) => generateLissajous(grid, CIRCLE_SPEC, params),
  'lissajous-3-2': (grid, params) => generateLissajous(grid, KNOT_SPEC, params),
  'lissajous-1-1-level': (grid, params) => generateLissajous(grid, LEVEL_SPEC, params),
  'lissajous-collapse': generateCollapse,
  flatline: generateFlatline,
  spiro: generateSpiro,
  'spiro-rest': generateSpiroRest,
  'spiro-progress': generateSpiroProgress,
  'spiro-complete': generateSpiroComplete,
  'spiro-crumble': generateSpiroCrumble,
  orrery: generateOrrery,
  'orrery-eclipse': generateOrreryEclipse,
  'orrery-align': generateOrreryAlign,
  'orrery-escape': generateOrreryEscape,
};

function isTraceVariant(name: string): name is TraceVariant {
  return TRACE_VARIANTS.some((variant) => variant === name);
}

/** Paths traced dot by dot: oscilloscope figures, a spirograph rosette and a small orrery, chosen by `variant`. */
export function generateTrace(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? TRACE_DEFAULTS.variant;
  if (!isTraceVariant(variant)) {
    throw new Error(
      `flickering-dots trace: unknown variant ${JSON.stringify(variant)}; use one of ${TRACE_VARIANTS.join(', ')}`,
    );
  }
  return VARIANT_BUILDERS[variant](grid, params);
}
