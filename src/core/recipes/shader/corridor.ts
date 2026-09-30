import type { GridSize } from '../../types';
import type { RecipeOutput } from '../helpers';
import {
  corridorDrift,
  corridorGap,
  drawRings,
  getCorridorGeometry,
  ringAt,
  ringSteps,
} from './corridor-rings';
import { TAU } from './shared';

const TURN_GAPS = 4;
const THINKING_MS = 175;
const RUSH_MS = 90;
const DEPTH_DECAY = 0.8;
const HOVER_MS = 600;

interface CorridorRun {
  gap: number;
  drift: number;
  frames: number;
  baseMs: number;
  decay: number;
}

function runCorridor(grid: GridSize, { gap, drift, frames, baseMs, decay }: CorridorRun): RecipeOutput {
  const geometry = getCorridorGeometry(grid);
  const drawn = Array.from({ length: frames }, (_, frame) => {
    const angle = (TAU * frame) / frames;
    const offset = { dx: drift * Math.cos(angle), dy: drift * Math.sin(angle) };
    return drawRings(
      grid,
      ringSteps(geometry, frame, gap).map((step) => ringAt(geometry, step, offset)),
    );
  });
  return {
    frames: drawn,
    durations: drawn.map((_, frame) => Math.round(baseMs * decay ** (frame % gap))),
  };
}

/** Square rings rush out of a vanishing point that circles the centre, one steady step every 175 ms. */
export function generateCorridor(grid: GridSize): RecipeOutput {
  const gap = corridorGap(grid);
  return runCorridor(grid, {
    gap,
    drift: corridorDrift(grid),
    frames: TURN_GAPS * gap,
    baseMs: THINKING_MS,
    decay: 1,
  });
}

/** Centred rings that creep outward one step every 600 ms. */
export function generateCorridorHover(grid: GridSize): RecipeOutput {
  const gap = corridorGap(grid);
  return runCorridor(grid, { gap, drift: 0, frames: gap, baseMs: HOVER_MS, decay: 1 });
}

/** Centred rings that rush out quickly, each step quicker as the rings come near, for connecting. */
export function generateCorridorRush(grid: GridSize): RecipeOutput {
  const gap = corridorGap(grid);
  return runCorridor(grid, { gap, drift: 0, frames: gap, baseMs: RUSH_MS, decay: DEPTH_DECAY });
}
