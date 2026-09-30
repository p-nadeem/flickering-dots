import type { RecipeId } from '../types';
import type { RecipeUnit } from './unit';

export const RECIPE_LOADERS: Readonly<Record<RecipeId, () => Promise<RecipeUnit>>> = {
  pulse: () => import('./pulse').then((m) => ({ run: m.generatePulse })),
  orbit: () => import('./orbit').then((m) => ({ run: m.generateOrbit })),
  radar: () => import('./radar').then((m) => ({ run: m.generateRadar })),
  ripple: () => import('./ripple').then((m) => ({ run: m.generateRipple })),
  snake: () => import('./snake').then((m) => ({ run: m.generateSnake })),
  rain: () => import('./rain').then((m) => ({ run: m.generateRain })),
  noise: () => import('./noise').then((m) => ({ run: m.generateNoise })),
  life: () => import('./life').then((m) => ({ run: m.generateLife })),
  wave: () => import('./wave').then((m) => ({ run: m.generateWave })),
  bounce: () => import('./bounce').then((m) => ({ run: m.generateBounce })),
  scan: () => import('./scan').then((m) => ({ run: m.generateScan })),
  breathe: () => import('./breathe').then((m) => ({ run: m.generateBreathe })),
  ellipsis: () => import('./ellipsis').then((m) => ({ run: m.generateEllipsis })),
  typewriter: () => import('./typewriter').then((m) => ({ run: m.generateTypewriter })),
  check: () => import('./check').then((m) => ({ run: m.generateCheck })),
  cross: () => import('./cross').then((m) => ({ run: m.generateCross })),
  idle: () => import('./idle').then((m) => ({ run: m.generateIdle })),
  heart: () => import('./heart').then((m) => ({ run: m.generateHeart })),
  arrow: () => import('./arrow').then((m) => ({ run: m.generateArrow })),
  hop: () => import('./hop').then((m) => ({ run: m.generateHop })),
  shimmer: () => import('./shimmer').then((m) => ({ run: m.generateShimmer })),
  scanner: () => import('./scanner').then((m) => ({ run: m.generateScanner })),
  bars: () => import('./bars').then((m) => ({ run: m.generateBars })),
  cascade: () => import('./cascade').then((m) => ({ run: m.generateCascade })),
  fill: () => import('./fill').then((m) => ({ run: m.generateFill })),
  shader: () => import('./shader').then((m) => ({ run: m.generateShader, options: m.SHADER_OPTIONS })),
  particles: () =>
    import('./particles').then((m) => ({ run: m.generateParticles, options: m.PARTICLES_OPTIONS })),
  automaton: () =>
    import('./automaton').then((m) => ({ run: m.generateAutomaton, options: m.AUTOMATON_OPTIONS })),
  grow: () => import('./grow').then((m) => ({ run: m.generateGrow, options: m.GROW_OPTIONS })),
  network: () => import('./network').then((m) => ({ run: m.generateNetwork, options: m.NETWORK_OPTIONS })),
  projection: () =>
    import('./projection').then((m) => ({ run: m.generateProjection, options: m.PROJECTION_OPTIONS })),
  columns: () => import('./columns').then((m) => ({ run: m.generateColumns, options: m.COLUMNS_OPTIONS })),
  trace: () => import('./trace').then((m) => ({ run: m.generateTrace, options: m.TRACE_OPTIONS })),
  arcade: () => import('./arcade').then((m) => ({ run: m.generateArcade, options: m.ARCADE_OPTIONS })),
  resolve: () => import('./resolve').then((m) => ({ run: m.generateResolve, options: m.RESOLVE_OPTIONS })),
  granular: () =>
    import('./granular').then((m) => ({ run: m.generateGranular, options: m.GRANULAR_OPTIONS })),
  face: () => import('./face').then((m) => ({ run: m.generateFace, options: m.FACE_OPTIONS })),
};
