import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { mergeLoop } from './clip-merge';
import { RIDGE_FULL_AMPLITUDE, ridgeLayout, surfaceFrame } from './ridge-surface';
import { TAU } from './shared';
import { voiceEnvelope } from './voice-envelope';

const SWELL_MS = 90;
const CALM_MS = 150;
const IDLE_AMPLITUDE = 1.4;

/** Frames in one ridge loop: the wave rolls back once. */
export const RIDGE_FRAMES = 24;

/** Default params of the ridge variants: a full swell and the voice envelope seed. */
export const RIDGE_DEFAULTS = { density: 1, seed: 11 } as const satisfies RecipeParams;

/** Wave phase of loop frame `frame`. */
export function ridgePhase(frame: number): number {
  return (TAU * frame) / RIDGE_FRAMES;
}

function rollingSurface(grid: GridSize, amplitudeAt: (frame: number) => number, ms: number): RecipeOutput {
  const layout = ridgeLayout(grid);
  return mergeLoop(
    Array.from({ length: RIDGE_FRAMES }, (_, frame) => ({
      frame: surfaceFrame(grid, layout, amplitudeAt(frame), ridgePhase(frame)),
      ms,
    })),
  );
}

/** Stacked ridge lines of a rolling wave field; `density` 0 leaves flat lines with a 1-row ripple at a calmer pace. */
export function generateRidge(grid: GridSize, params: RecipeParams): RecipeOutput {
  const density = params.density ?? RIDGE_DEFAULTS.density;
  const amplitude = IDLE_AMPLITUDE + (RIDGE_FULL_AMPLITUDE - IDLE_AMPLITUDE) * density;
  const ms = Math.round(CALM_MS - (CALM_MS - SWELL_MS) * density);
  return rollingSurface(grid, () => amplitude, ms);
}

/** The ridge surface whose swell follows a seeded voice envelope. */
export function generateRidgeLevel(grid: GridSize, params: RecipeParams): RecipeOutput {
  const envelope = voiceEnvelope(RIDGE_FRAMES, params.seed ?? RIDGE_DEFAULTS.seed);
  return rollingSurface(grid, (frame) => RIDGE_FULL_AMPLITUDE * envelope[frame], SWELL_MS);
}
