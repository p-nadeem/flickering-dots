import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { insetCheckStrokes } from './inset';
import { ringPoints } from './ring';
import { easeOut, getCentringShift, getViewport, lerp, overlay, shiftFrame, steps } from './space';
import { drawTorus, torusInnerRadius, torusOuterRadius } from './torus-render';
import type { TorusPose } from './torus-render';

const START: TorusPose = { a: 1, b: 0.5 };
const TUMBLE_FRAMES = 40;
const TUMBLE_A_TURNS = 2;
const TUMBLE_MS = 100;
const SLOW_FRAMES = 24;
const SLOW_MS = 150;
const FRONT_A = Math.PI / 2;
const FRONT_B_TURN = 1;
const FRONT_FRAMES = 8;
const FRONT_MS = 80;
const THIN_MS = 140;
const CHECK_INSET_SHARE = 0.3;
const FREEZE_MS = 300;
const FALL_MS = 70;
const BOUNCE_MS = 90;
const DIM_STEPS = [0.25, 0.5] as const;
const DIM_MS = 220;
const HOLD_MS = 1500;
const FULL_TURN = 2 * Math.PI;

function tumblePose(index: number, count: number): TorusPose {
  return {
    a: START.a + (TUMBLE_A_TURNS * FULL_TURN * index) / count,
    b: START.b + (FULL_TURN * index) / count,
  };
}

function tumbleShift(grid: GridSize): Point {
  const raw = Array.from({ length: TUMBLE_FRAMES }, (_, index) =>
    drawTorus(grid, tumblePose(index, TUMBLE_FRAMES)),
  );
  return getCentringShift(grid, raw);
}

function drawPlaced(grid: GridSize, [dx, dy]: Point, pose: TorusPose, dim = 0): Frame {
  return shiftFrame(drawTorus(grid, pose, dim), grid, dx, dy);
}

/** A dithered torus tumbling on two axes, seamless over 40 frames at 100 ms, centred on all its poses. */
export function torusTumble(grid: GridSize, params: RecipeParams): RecipeOutput {
  const count = params.frames || TUMBLE_FRAMES;
  const shift = tumbleShift(grid);
  const frames = Array.from({ length: count }, (_, index) =>
    drawPlaced(grid, shift, tumblePose(index, count)),
  );
  return { frames, durations: frames.map(() => TUMBLE_MS) };
}

/** The torus turning on its view axis only, 24 frames at 150 ms. */
export function torusSlow(grid: GridSize, params: RecipeParams): RecipeOutput {
  const count = params.frames || SLOW_FRAMES;
  const shift = tumbleShift(grid);
  const frames = Array.from({ length: count }, (_, index) =>
    drawPlaced(grid, shift, { a: START.a, b: START.b + (FULL_TURN * index) / count }),
  );
  return { frames, durations: frames.map(() => SLOW_MS) };
}

function ringFrame(grid: GridSize, radii: readonly number[]): Frame {
  const { cx, cy } = getViewport(grid);
  return createFrameFromPoints(
    grid,
    radii.flatMap((radius) => ringPoints({ cx, cy, radius })),
  );
}

function frontEasing(grid: GridSize): Frame[] {
  const shift = tumbleShift(grid);
  return steps(FRONT_FRAMES).map((t) =>
    drawPlaced(grid, shift, {
      a: lerp(START.a, FRONT_A, easeOut(t)),
      b: START.b + FRONT_B_TURN * easeOut(t),
    }),
  );
}

/** The tumble eases to a front view, thins to its outer rim, and a check draws inside. */
export function torusFront(grid: GridSize): RecipeOutput {
  const easing = frontEasing(grid);
  const outer = Math.round(torusOuterRadius(grid));
  const inner = Math.round(torusInnerRadius(grid));
  const rim = ringFrame(grid, [outer]);
  const check = insetCheckStrokes(grid, Math.ceil(CHECK_INSET_SHARE * getViewport(grid).side));
  const start = drawPlaced(grid, tumbleShift(grid), START);
  return {
    frames: [
      start,
      ...easing,
      ringFrame(grid, [outer, inner]),
      rim,
      ...check.frames.map((frame) => overlay(rim, frame)),
    ],
    durations: [
      FRONT_MS,
      ...easing.map(() => FRONT_MS),
      THIN_MS,
      THIN_MS,
      ...check.durations.slice(0, -1),
      HOLD_MS,
    ],
  };
}

function floorRows(grid: GridSize, frame: Frame): number {
  const lastLit = frame.reduce<number>(
    (last, bit, index) => (bit === 1 ? Math.floor(index / grid.cols) : last),
    0,
  );
  return grid.rows - 1 - lastLit;
}

/** The torus freezes face-on, falls to the floor a row at a time, bounces once and dims as it lies there. */
export function torusDrop(grid: GridSize): RecipeOutput {
  const shift = tumbleShift(grid);
  const pose: TorusPose = { a: FRONT_A, b: START.b + FRONT_B_TURN };
  const front = drawPlaced(grid, shift, pose);
  const fall = floorRows(grid, front);
  const drop = (frame: Frame, rows: number): Frame => shiftFrame(frame, grid, 0, rows);
  const falling = Array.from({ length: fall }, (_, index) => drop(front, index + 1));
  const bounce = fall > 0 ? [drop(front, fall - 1), drop(front, fall)] : [];
  const dimmed = DIM_STEPS.map((dim) => {
    const faded = drawPlaced(grid, shift, pose, dim);
    return drop(faded, floorRows(grid, faded));
  });
  return {
    frames: [front, ...falling, ...bounce, ...dimmed],
    durations: [
      FREEZE_MS,
      ...falling.map(() => FALL_MS),
      ...bounce.map(() => BOUNCE_MS),
      ...dimmed.map((_, index) => (index === dimmed.length - 1 ? HOLD_MS : DIM_MS)),
    ],
  };
}
