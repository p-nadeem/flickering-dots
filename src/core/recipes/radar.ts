import type { GridSize, RecipeParams } from '../types';
import { createFrame, getCentre } from './helpers';
import type { RecipeOutput } from './helpers';

const FRAME_MS = 60;
const HALF_CELL = 0.5;
const HUB_RADIUS = 0.8;
const FULL_TURN = Math.PI * 2;
const ANGLE_OFFSET = Math.PI * 8;

/** Default params of the `radar` recipe. */
export const RADAR_DEFAULTS = { frames: 16, trail: 2 } as const satisfies RecipeParams;

/** A beam sweeping clockwise from twelve o'clock, with `trail` steps of afterglow. */
export function generateRadar(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const { cx, cy } = getCentre(grid);
  const count = params.frames || RADAR_DEFAULTS.frames;
  const trail = params.trail ?? RADAR_DEFAULTS.trail;
  const radius = Math.min(cx, cy) + HALF_CELL;
  const step = FULL_TURN / count;
  const frames = Array.from({ length: count }, (_, index) => {
    const beam = index * step;
    return createFrame(grid, (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) return false;
      if (distance < HUB_RADIUS) return true;
      const behind = (beam - (Math.atan2(dy, dx) + Math.PI / 2) + ANGLE_OFFSET) % FULL_TURN;
      return behind <= step * (trail + HALF_CELL);
    });
  });
  return { frames, durations: frames.map(() => FRAME_MS) };
}
