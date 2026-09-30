import { createRng } from '../../rng';
import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import { TAU } from './shared';

const DEPTH_SHARE = 0.55;
const SWAY_ROWS = 1.5;
const SWAY_SPACING = 0.5;
const RIPPLE_ROWS = 1;
const RIPPLE_SPACING = 1.3;
const RIPPLE_SPEED = 2;
const RAY_SPACING = 0.8;
const DARK_EVERY = 3;
const MIRROR_INVERSE = 2;
const THRESHOLD_TOP = 0.7;
const THRESHOLD_SPAN = 1;
const TAIL_ROWS = 2;
const TWINKLE_PERIODS = [6, 10] as const;

/** Frames in one aurora loop; every sway and twinkle period divides it. */
export const AURORA_FRAMES = 60;

/** Per-cell twinkle timing for the shimmering tails. */
export interface Twinkle {
  period: number;
  offset: number;
}

/** The bottom row of every ray column in one frame; -1 for a column that is dark. */
export type RayBottoms = readonly number[];

/** Wave phase of loop frame `frame`. */
export function auroraPhase(frame: number): number {
  return (TAU * frame) / AURORA_FRAMES;
}

/** The resting curtain depth in rows. */
export function curtainDepth(grid: GridSize): number {
  return grid.rows * DEPTH_SHARE;
}

/** True for a column that can hold a ray: every third column stays dark, placed symmetrically about the centre. */
export function isRayColumn(x: number, cols: number): boolean {
  return x % DARK_EVERY !== (MIRROR_INVERSE * (cols - 1)) % DARK_EVERY;
}

/** The ray bottoms at `phase` for a curtain `depth` rows deep; `density` 1 lights the most rays. */
export function rayBottoms(grid: GridSize, phase: number, depth: number, density: number): RayBottoms {
  const threshold = THRESHOLD_TOP - THRESHOLD_SPAN * density;
  return Array.from({ length: grid.cols }, (_, x) => {
    if (!isRayColumn(x, grid.cols) || Math.sin(RAY_SPACING * x + phase) <= threshold) return -1;
    const sway = SWAY_ROWS * Math.sin(SWAY_SPACING * x + phase);
    const ripple = RIPPLE_ROWS * Math.sin(RIPPLE_SPACING * x - RIPPLE_SPEED * phase);
    return Math.min(grid.rows - 1, Math.round(depth + sway + ripple));
  });
}

/** Seeded twinkle timing for every cell, in row-major order. */
export function createTwinkles(grid: GridSize, seed: number): Twinkle[] {
  const random = createRng(seed);
  return Array.from({ length: grid.cols * grid.rows }, () => {
    const period = TWINKLE_PERIODS[Math.floor(random() * TWINKLE_PERIODS.length)];
    return { period, offset: Math.floor(random() * period) };
  });
}

function isTwinkleOn({ period, offset }: Twinkle, frame: number): boolean {
  return (frame + offset) % period < Math.floor(period / 2);
}

/** Draws rays hanging from the top down to their bottoms; the bottom 2 rows twinkle when `twinkles` are given. */
export function drawCurtain(
  grid: GridSize,
  bottoms: RayBottoms,
  frame: number,
  twinkles?: readonly Twinkle[],
): Frame {
  return createFrame(grid, (x, y) => {
    if (y > bottoms[x]) return false;
    if (twinkles === undefined || y <= bottoms[x] - TAIL_ROWS) return true;
    return isTwinkleOn(twinkles[y * grid.cols + x], frame);
  });
}
