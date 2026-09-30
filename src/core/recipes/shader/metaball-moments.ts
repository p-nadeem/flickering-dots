import { countLit } from '../../frame';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrame, mergeRepeatedFrames } from '../helpers';
import type { RecipeOutput } from '../helpers';
import type { Ball } from './metaball-field';
import {
  drawBalls,
  getMetaballGeometry,
  orbitBalls,
  pickBallCount,
  pickThreshold,
  towardCentre,
} from './metaball-field';
import { cutCheck } from './metaball-mark';
import { easeInOut, isLitAt, shiftDown, TAU } from './shared';

const SPREAD_ANGLE = TAU / 4;
const DRIP_ANGLE = TAU / 8;
const MERGE_STEPS = 8;
const MERGE_MS = 80;
const MERGE_SETTLE_MS = 240;
const PLOP_MS = 120;
const PLOP_THRESHOLD = 0.6;
const MERGE_HOLD_MS = 1200;
const DRIP_THRESHOLDS = [1, 1.3, 1.6] as const;
const DROPLET_THRESHOLD = 2;
const MIN_DROPLET_RADIUS = 1;
const TOUCH_REACH = 1;
const DRIP_THRESHOLD_MS = 90;
const DRIP_FALL_MS = 70;
const DRIP_HOLD_MS = 400;

function spreadBalls(grid: GridSize, params: RecipeParams, angle = SPREAD_ANGLE) {
  const geometry = getMetaballGeometry(grid);
  return { geometry, balls: orbitBalls(geometry, angle, pickBallCount(params)) };
}

function mergeSteps(grid: GridSize, params: RecipeParams, threshold: number): Frame[] {
  const { geometry, balls } = spreadBalls(grid, params);
  return Array.from({ length: MERGE_STEPS + 1 }, (_, step) => {
    const amount = easeInOut(step / MERGE_STEPS);
    return drawBalls(
      grid,
      balls.map((ball) => towardCentre(ball, geometry, amount)),
      threshold,
    );
  });
}

function plopFrames(grid: GridSize, params: RecipeParams, threshold: number): RecipeOutput {
  const { geometry, balls } = spreadBalls(grid, params);
  const merged = balls.map((ball) => towardCentre(ball, geometry, 1));
  const plop = drawBalls(grid, merged, threshold * PLOP_THRESHOLD);
  const mark = cutCheck(grid, plop);
  if (mark === undefined) return { frames: [plop], durations: [MERGE_HOLD_MS] };
  return { frames: [plop, mark], durations: [PLOP_MS, MERGE_HOLD_MS] };
}

/** The balls ease into the centre, the blob plops outward, then a tick opens in its middle and holds. */
export function generateMetaballMerge(grid: GridSize, params: RecipeParams): RecipeOutput {
  const threshold = pickThreshold(params);
  const merging = mergeSteps(grid, params, threshold);
  const plop = plopFrames(grid, params, threshold);
  const durations = merging.map((_, step) => (step === MERGE_STEPS ? MERGE_SETTLE_MS : MERGE_MS));
  return mergeRepeatedFrames({
    frames: [...merging, ...plop.frames],
    durations: [...durations, ...plop.durations],
  });
}

function fallFrames(grid: GridSize, frame: Frame): Frame[] {
  return Array.from({ length: grid.rows }, (_, index) => shiftDown(grid, frame, index + 1)).filter(
    (shifted, index, all) => index === 0 || countLit(all[index - 1]) > 0 || countLit(shifted) > 0,
  );
}

function discFrame(grid: GridSize, ball: Ball, threshold: number): Frame {
  const radius = Math.max(MIN_DROPLET_RADIUS, ball.r / Math.sqrt(threshold));
  return createFrame(grid, (x, y) => Math.hypot(x - ball.x, y - ball.y) <= radius);
}

function touches(grid: GridSize, a: Frame, b: Frame): boolean {
  return a.some((bit, index) => {
    if (bit !== 1) return false;
    const x = index % grid.cols;
    const y = Math.floor(index / grid.cols);
    return [-TOUCH_REACH, 0, TOUCH_REACH].some((dy) =>
      [-TOUCH_REACH, 0, TOUCH_REACH].some((dx) => isLitAt(b, grid, x + dx, y + dy)),
    );
  });
}

function dropletFrame(grid: GridSize, balls: readonly Ball[], threshold: number): Frame {
  const largestFirst = [...balls].sort((a, b) => b.r - a.r);
  const drops = largestFirst.reduce<Frame[]>((kept, ball) => {
    const disc = discFrame(grid, ball, threshold);
    return kept.some((other) => touches(grid, disc, other)) ? kept : [...kept, disc];
  }, []);
  return createFrame(grid, (x, y) => drops.some((drop) => isLitAt(drop, grid, x, y)));
}

/** The threshold rises until the mass splits into separate droplets, which then fall a row at a time off the bottom. */
export function generateMetaballDrip(grid: GridSize, params: RecipeParams): RecipeOutput {
  const { balls } = spreadBalls(grid, params, DRIP_ANGLE);
  const base = pickThreshold(params);
  const thinning = DRIP_THRESHOLDS.map((level) => drawBalls(grid, balls, base * level));
  const droplets = dropletFrame(grid, balls, base * DROPLET_THRESHOLD);
  const splitting = [...thinning, droplets];
  const falling = fallFrames(grid, droplets);
  const frames = [...splitting, ...falling];
  const durations = frames.map((_, index) => {
    if (index === frames.length - 1) return DRIP_HOLD_MS;
    return index < splitting.length ? DRIP_THRESHOLD_MS : DRIP_FALL_MS;
  });
  return mergeRepeatedFrames({ frames, durations });
}
