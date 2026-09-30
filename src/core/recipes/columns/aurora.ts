import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import {
  AURORA_FRAMES,
  auroraPhase,
  createTwinkles,
  curtainDepth,
  drawCurtain,
  rayBottoms,
} from './aurora-sky';
import { mergeLoop } from './clip-merge';
import { governFlashes } from './flash-governor';
import { voiceEnvelope } from './voice-envelope';

const SWAY_MS = 90;
const CALM_MS = 180;
const CALM_DENSITY = 0.3;
const LEVEL_FLOOR_SHARE = 0.2;
const LEVEL_SPAN_SHARE = 0.6;

/** Default params of the aurora variants: every ray and the twinkle seed. */
export const AURORA_DEFAULTS = { density: 1, seed: 5 } as const satisfies RecipeParams;

function frameMs(density: number): number {
  const share = Math.min(1, Math.max(0, (density - CALM_DENSITY) / (1 - CALM_DENSITY)));
  return Math.round(CALM_MS - (CALM_MS - SWAY_MS) * share);
}

function swayingCurtain(
  grid: GridSize,
  params: RecipeParams,
  depthAt: (frame: number) => number,
): RecipeOutput {
  const density = params.density ?? AURORA_DEFAULTS.density;
  const twinkles = createTwinkles(grid, params.seed ?? AURORA_DEFAULTS.seed);
  const ms = frameMs(density);
  const shots = Array.from({ length: AURORA_FRAMES }, (_, frame) => ({
    frame: drawCurtain(grid, rayBottoms(grid, auroraPhase(frame), depthAt(frame), density), frame, twinkles),
    ms,
  }));
  return mergeLoop(governFlashes(shots, true));
}

/** Curtains of light hang from the top and sway, their tails twinkling; `density` 0.3 shows few rays at half speed. */
export function generateAurora(grid: GridSize, params: RecipeParams): RecipeOutput {
  const depth = curtainDepth(grid);
  return swayingCurtain(grid, params, () => depth);
}

/** The aurora whose curtain depth follows a seeded voice envelope. */
export function generateAuroraLevel(grid: GridSize, params: RecipeParams): RecipeOutput {
  const envelope = voiceEnvelope(AURORA_FRAMES, params.seed ?? AURORA_DEFAULTS.seed);
  return swayingCurtain(
    grid,
    { ...params, density: AURORA_DEFAULTS.density },
    (frame) => grid.rows * (LEVEL_FLOOR_SHARE + LEVEL_SPAN_SHARE * envelope[frame]),
  );
}
