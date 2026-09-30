import { glyphMask } from '../../glyphs';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrame, getCentre, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { bloomGlyph, nearestToCentre } from './bloom';
import { dropIsolated } from './cleanup';
import { easeInOut, frac, pickCount, TAU } from './shared';

interface SpiralShape {
  arms: number;
  duty: number;
  phase: number;
  clip: number;
}

const WIND = 0.9;
const DEFAULT_ARMS = 1;
const MAX_ARMS = 4;
const DEFAULT_DUTY = 0.3;
const ONE_ARM_FRAMES = 12;
const MANY_ARM_FRAMES = 8;
const STEP_MS = 70;
const STILL_MS = 1000;
const MAX_FRAMES = 256;
const DISC_MARGIN = 0.3;
const UNWIND_FRAMES = 6;
const CONTRACT_FRAMES = 5;
const CENTRE_HOLD_MS = 120;
const UNWIND_MS = 80;

function discRadius(grid: GridSize): number {
  const { cx, cy } = getCentre(grid);
  return Math.min(cx, cy) + DISC_MARGIN;
}

function drawSpiral(grid: GridSize, { arms, duty, phase, clip }: SpiralShape): Frame {
  const { cx, cy } = getCentre(grid);
  const raw = createFrame(grid, (x, y) => {
    const distance = Math.hypot(x - cx, y - cy);
    const turn = (arms * Math.atan2(y - cy, x - cx)) / TAU;
    return distance <= clip && frac(turn + (WIND * distance) / Math.PI - phase) < duty;
  });
  return dropIsolated(raw, grid);
}

function pickArms(params: RecipeParams): number {
  return pickCount(params.length, DEFAULT_ARMS, MAX_ARMS);
}

/** A spiral wave of `length` arms and `density` duty that turns like a record groove, clipped to a round disc. */
export function generateSpiral(grid: GridSize, params: RecipeParams): RecipeOutput {
  const arms = pickArms(params);
  const duty = params.density ?? DEFAULT_DUTY;
  const count = pickCount(params.frames, arms > 1 ? MANY_ARM_FRAMES : ONE_ARM_FRAMES, MAX_FRAMES);
  const clip = discRadius(grid);
  const frames = Array.from({ length: count }, (_, index) =>
    drawSpiral(grid, { arms, duty, phase: index / count, clip }),
  );
  return { frames, durations: frames.map(() => (count === 1 ? STILL_MS : STEP_MS)) };
}

function contractFrame(grid: GridSize, duty: number, step: number, [dotX, dotY]: Point): Frame {
  const clip = discRadius(grid) * (1 - step / CONTRACT_FRAMES);
  if (step === CONTRACT_FRAMES) return createFrame(grid, (x, y) => x === dotX && y === dotY);
  return drawSpiral(grid, { arms: 0, duty, phase: -step / CONTRACT_FRAMES, clip });
}

/** The coil unwinds into concentric rings, the rings shrink to the centre dot, the last dot landing on the tick, which blooms out of it. */
export function generateSpiralUnwind(grid: GridSize, params: RecipeParams): RecipeOutput {
  const arms = pickArms(params);
  const duty = params.density ?? DEFAULT_DUTY;
  const clip = discRadius(grid);
  const unwind = Array.from({ length: UNWIND_FRAMES }, (_, index) =>
    drawSpiral(grid, { arms: arms * (1 - easeInOut(index / (UNWIND_FRAMES - 1))), duty, phase: 0, clip }),
  );
  const dot = nearestToCentre(grid, glyphMask('check', grid));
  const contract = Array.from({ length: CONTRACT_FRAMES }, (_, index) =>
    contractFrame(grid, duty, index + 1, dot),
  );
  const tick = bloomGlyph(grid, 'check', dot);
  const moving = [...unwind, ...contract];
  return mergeRepeatedFrames({
    frames: [...moving, ...tick.frames],
    durations: [
      ...moving.map((_, index) => (index === moving.length - 1 ? CENTRE_HOLD_MS : UNWIND_MS)),
      ...tick.durations,
    ],
  });
}
