import { GLYPH_NAMES, isGlyphName } from '../../glyphs';
import type { GlyphName } from '../../glyphs';
import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { cloudCycle, cloudIdle, cloudLand } from './cloud';
import { coinDecide, coinLand, coinRest, coinSpin } from './coin';
import type { CoinFaces } from './coin';
import { cubeLand, cubeRest, cubeShake, cubeSpin, cubeWait } from './cube';
import { globeBreak, globeListen, globeSettle, globeSpin } from './globe';
import { torusDrop, torusFront, torusSlow, torusTumble } from './torus';

/** Variants of the `projection` recipe: wireframe cube, globe, dithered torus, coin and point cloud moments. */
export const PROJECTION_VARIANTS = [
  'cube',
  'cube-rest',
  'cube-wait',
  'cube-land',
  'cube-shake',
  'globe',
  'globe-listen',
  'globe-settle',
  'globe-break',
  'torus',
  'torus-slow',
  'torus-front',
  'torus-drop',
  'coin',
  'coin-rest',
  'coin-decide',
  'cloud',
] as const;

/** One of `PROJECTION_VARIANTS`. */
export type ProjectionVariant = (typeof PROJECTION_VARIANTS)[number];

/** Glyphs the `projection` recipe takes: a coin face or cloud landing (the shared glyphs), or `sphere` for the idle cloud. */
export const PROJECTION_GLYPHS = [...GLYPH_NAMES, 'sphere'] as const;

/** Smallest square side, in dots, at which each projection variant reads; they scale up to 16. */
export const PROJECTION_MIN_SIDES: Readonly<Record<ProjectionVariant, number>> = {
  cube: 11,
  'cube-rest': 11,
  'cube-wait': 11,
  'cube-land': 11,
  'cube-shake': 11,
  globe: 9,
  'globe-listen': 9,
  'globe-settle': 9,
  'globe-break': 9,
  torus: 14,
  'torus-slow': 14,
  'torus-front': 14,
  'torus-drop': 14,
  coin: 7,
  'coin-rest': 7,
  'coin-decide': 7,
  cloud: 12,
};

type Variant = (grid: GridSize, params: RecipeParams) => RecipeOutput;

const SPIN_FACES: CoinFaces = { front: 'check', back: 'cross' };
const OTHER_FACE: Partial<Record<GlyphName, GlyphName>> = { check: 'cross', cross: 'check' };
const IDLE_GLYPH = 'sphere';

function faceGlyph(glyph: string | undefined): GlyphName | undefined {
  return glyph !== undefined && isGlyphName(glyph) ? glyph : undefined;
}

function coin(grid: GridSize, params: RecipeParams): RecipeOutput {
  const front = faceGlyph(params.glyph);
  if (front === undefined) return coinSpin(grid, SPIN_FACES);
  return coinLand(grid, { front, back: OTHER_FACE[front] }, front === 'cross');
}

function cloud(grid: GridSize, params: RecipeParams): RecipeOutput {
  if (params.glyph === IDLE_GLYPH) return cloudIdle(grid, params);
  const glyph = faceGlyph(params.glyph);
  return glyph === undefined ? cloudCycle(grid) : cloudLand(grid, glyph);
}

const VARIANTS: Readonly<Record<ProjectionVariant, Variant>> = {
  cube: cubeSpin,
  'cube-rest': cubeRest,
  'cube-wait': cubeWait,
  'cube-land': cubeLand,
  'cube-shake': cubeShake,
  globe: globeSpin,
  'globe-listen': globeListen,
  'globe-settle': globeSettle,
  'globe-break': globeBreak,
  torus: torusTumble,
  'torus-slow': torusSlow,
  'torus-front': torusFront,
  'torus-drop': torusDrop,
  coin,
  'coin-rest': (grid, params) => coinRest(grid, { front: faceGlyph(params.glyph) }),
  'coin-decide': (grid) => coinDecide(grid, SPIN_FACES),
  cloud,
};

function isProjectionVariant(name: string): name is ProjectionVariant {
  return PROJECTION_VARIANTS.some((variant) => variant === name);
}

/** Points and edges turned in 3D and perspective-projected onto the grid; `variant` picks the shape and moment. */
export function generateProjection(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? PROJECTION_VARIANTS[0];
  if (!isProjectionVariant(variant)) {
    throw new Error(
      `flickering-dots projection: unknown variant ${JSON.stringify(variant)}; use one of ${PROJECTION_VARIANTS.join(', ')}`,
    );
  }
  return VARIANTS[variant](grid, params);
}
