import type { RecipeId, RecipeInfo } from '../types';
import { generateArcade } from './arcade';
import { generateArrow } from './arrow';
import { generateAutomaton } from './automaton';
import { generateBars } from './bars';
import { generateBounce } from './bounce';
import { generateBreathe } from './breathe';
import { generateCascade } from './cascade';
import { generateCheck } from './check';
import { generateColumns } from './columns';
import { generateCross } from './cross';
import { generateEllipsis } from './ellipsis';
import { generateFace } from './face';
import { generateFill } from './fill';
import { generateGranular } from './granular';
import { generateGrow } from './grow';
import { generateHeart } from './heart';
import type { RecipeFn } from './helpers';
import { generateHop } from './hop';
import { generateIdle } from './idle';
import { generateLife } from './life';
import { generateNetwork } from './network';
import { generateNoise } from './noise';
import { generateOrbit } from './orbit';
import { generateParticles } from './particles';
import { generateProjection } from './projection';
import { generatePulse } from './pulse';
import { generateRadar } from './radar';
import { generateRain } from './rain';
import { generateResolve } from './resolve';
import { generateRipple } from './ripple';
import { generateScan } from './scan';
import { generateScanner } from './scanner';
import { generateShader } from './shader';
import { generateShimmer } from './shimmer';
import { generateSnake } from './snake';
import { generateTrace } from './trace';
import { generateTypewriter } from './typewriter';
import { generateWave } from './wave';

export type { RecipeFn, RecipeOutput } from './helpers';

const REGISTRY: Readonly<Record<RecipeId, RecipeFn>> = {
  pulse: generatePulse,
  orbit: generateOrbit,
  radar: generateRadar,
  ripple: generateRipple,
  snake: generateSnake,
  rain: generateRain,
  noise: generateNoise,
  life: generateLife,
  wave: generateWave,
  bounce: generateBounce,
  scan: generateScan,
  breathe: generateBreathe,
  ellipsis: generateEllipsis,
  typewriter: generateTypewriter,
  check: generateCheck,
  cross: generateCross,
  idle: generateIdle,
  heart: generateHeart,
  arrow: generateArrow,
  hop: generateHop,
  shimmer: generateShimmer,
  scanner: generateScanner,
  bars: generateBars,
  cascade: generateCascade,
  fill: generateFill,
  shader: generateShader,
  particles: generateParticles,
  automaton: generateAutomaton,
  grow: generateGrow,
  network: generateNetwork,
  projection: generateProjection,
  columns: generateColumns,
  trace: generateTrace,
  arcade: generateArcade,
  resolve: generateResolve,
  granular: generateGranular,
  face: generateFace,
};

/** The 32 recipes in display order; each engine carries its default variant. */
export const RECIPES: readonly RecipeInfo[] = [
  { id: 'pulse', label: 'Thinking pulse' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'radar', label: 'Radar' },
  { id: 'ripple', label: 'Ripple' },
  { id: 'snake', label: 'Snake' },
  { id: 'rain', label: 'Rain' },
  { id: 'noise', label: 'Noise' },
  { id: 'life', label: 'Life' },
  { id: 'wave', label: 'Wave' },
  { id: 'cascade', label: 'Grid wave' },
  { id: 'bars', label: 'Bars' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'hop', label: 'Hop' },
  { id: 'scan', label: 'Scan' },
  { id: 'scanner', label: 'Scanner' },
  { id: 'shimmer', label: 'Shimmer' },
  { id: 'breathe', label: 'Breathe' },
  { id: 'ellipsis', label: 'Ellipsis' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'fill', label: 'Fill' },
  { id: 'shader', label: 'Lava lamp', params: { variant: 'metaball' } },
  { id: 'particles', label: 'Hyperspace', params: { variant: 'warp' } },
  { id: 'automaton', label: 'Campfire', params: { variant: 'fire' } },
  { id: 'grow', label: 'Maze solve', params: { variant: 'maze' } },
  { id: 'network', label: 'Synapse', params: { variant: 'synapse' } },
  { id: 'projection', label: 'Wireframe cube', params: { variant: 'cube' } },
  { id: 'columns', label: 'Pendulum wave', params: { variant: 'pendulum' } },
  { id: 'trace', label: 'Scope', params: { variant: 'lissajous-3-2' } },
  { id: 'arcade', label: 'Stack and clear', params: { variant: 'stack' } },
  { id: 'resolve', label: 'Decode', params: { variant: 'rain', glyph: 'check' } },
  { id: 'granular', label: 'Hourglass', params: { variant: 'hourglass' } },
  { id: 'face', label: 'Robot eyes', params: { variant: 'glance' } },
];

/** True when `id` names a registered recipe. */
export function isRecipeId(id: string): id is RecipeId {
  return Object.hasOwn(REGISTRY, id);
}

/** Returns the generator for a recipe id. Unknown ids fall back to `pulse`. */
export function getRecipe(id: RecipeId | (string & {})): RecipeFn {
  return isRecipeId(id) ? REGISTRY[id] : REGISTRY.pulse;
}
