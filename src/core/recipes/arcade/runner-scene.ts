import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import type { Sprite } from './shared';
import { clamp } from './kit-b';
import { spritePoints } from './shared';

const MAX_RUNNER_HEIGHT = 3;
const JUMP_ROOM = 2;
const MAX_JUMP = 3;
const GROUND_ROWS = 1;
const GAP_FRACTION = 0.6;
const TWO_GAP_MIN_COLS = 9;

/** The runner's poses: two running strides, a tucked jump and standing still. */
export type RunnerPose = 'stride' | 'reach' | 'jump' | 'stand';

const POSES: Readonly<Record<number, Readonly<Record<RunnerPose, Sprite>>>> = {
  1: { stride: ['.#'], reach: ['.#'], jump: ['.#'], stand: ['.#'] },
  2: { stride: ['.#', '#.'], reach: ['.#', '.#'], jump: ['.#', '##'], stand: ['.#', '##'] },
  3: {
    stride: ['.#', '##', '#.'],
    reach: ['.#', '##', '.#'],
    jump: ['.#', '##', '##'],
    stand: ['.#.', '###', '#.#'],
  },
};

/** Where the runner scene sits on a grid. */
export interface RunnerLayout {
  cols: number;
  groundY: number;
  feetY: number;
  height: number;
  jump: number;
  postHeight: number;
}

/** The ground row, the runner's height, its jump height and posts as tall as the jump. */
export function planRunner(grid: GridSize): RunnerLayout {
  const groundY = grid.rows - GROUND_ROWS;
  const height = clamp(grid.rows - GROUND_ROWS - JUMP_ROOM, 1, MAX_RUNNER_HEIGHT);
  const jump = clamp(grid.rows - GROUND_ROWS - height, 1, MAX_JUMP);
  return { cols: grid.cols, groundY, feetY: groundY - 1, height, jump, postHeight: jump };
}

/** The jump arc: up one row per frame to the jump height, two frames at the top, then down. */
export function jumpArc(jump: number): number[] {
  const rise = Array.from({ length: jump + 1 }, (_, index) => index);
  return [...rise, ...[...rise].reverse()];
}

/** The runner's cells for a pose with its left column at `x`, lifted `lift` rows. */
export function runnerPoints(layout: RunnerLayout, pose: RunnerPose, x: number, lift: number): Point[] {
  const top = layout.feetY - lift - (layout.height - 1);
  return spritePoints(POSES[layout.height][pose], x, top);
}

/** The width of the runner's standing pose. */
export function standWidth(layout: RunnerLayout): number {
  return POSES[layout.height].stand[0].length;
}

/** The runner lying flat on the ground, its feet at column `right`. */
export function fallenPoints(layout: RunnerLayout, right: number): Point[] {
  return Array.from({ length: layout.height }, (_, index): Point => [right - index, layout.feetY]);
}

/** The runner's head cell, top right of the sprite. */
export function headPoint(layout: RunnerLayout, x: number): Point {
  return [x + 1, layout.feetY - (layout.height - 1)];
}

function isGap(column: number, cols: number): boolean {
  const hasSecondGap = cols >= TWO_GAP_MIN_COLS;
  return column === 0 || (hasSecondGap && column === Math.round(cols * GAP_FRACTION));
}

/** The ground row scrolled `scroll` columns to the left; gaps in it (two from 9 columns up) show the motion. */
export function groundPoints(layout: RunnerLayout, scroll: number): Point[] {
  const { cols, groundY } = layout;
  return Array.from({ length: cols }, (_, x) => x)
    .filter((x) => !isGap((x + scroll) % cols, cols))
    .map((x): Point => [x, groundY]);
}

/** A post `height` dots tall standing on the ground at column `x`. */
export function postPoints(layout: RunnerLayout, x: number, height: number): Point[] {
  return Array.from({ length: height }, (_, index): Point => [x, layout.feetY - index]);
}

/** Frames each stride pose holds; slower swaps keep every leg dot to 3 flashes a second or fewer. */
export const STRIDE_FRAMES = 3;

/** The stride pose for frame `step`: the legs swap every three frames. */
export function stridePose(step: number): RunnerPose {
  return Math.floor(step / STRIDE_FRAMES) % 2 === 0 ? 'stride' : 'reach';
}
