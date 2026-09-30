import type { Frame, GridSize, RecipeParams } from '../types';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const STEP_MS = 90;
const HOLD_MS = 300;
const GAP_MIN_SIDE = 5;
const BLOCKS_PER_SIDE = 3;
const OFF_FRAMES = 2;
const NO_BLOCK = -1;

/** Default params of the `cascade` recipe: `length` overrides the computed block size. */
export const CASCADE_DEFAULTS = {} as const satisfies RecipeParams;

interface Axis {
  count: number;
  margin: number;
}

interface CascadeLayout {
  size: number;
  pitch: number;
  x: Axis;
  y: Axis;
}

function getBlockSize(side: number, gap: number, length: number | undefined): number {
  if (length === undefined) return gap ? Math.max(1, Math.floor((side - gap * 2) / BLOCKS_PER_SIDE)) : 1;
  return Math.min(side, Math.max(1, Math.round(length)));
}

function getAxis(length: number, size: number, gap: number): Axis {
  const count = Math.floor((length + gap) / (size + gap));
  const used = count * size + (count - 1) * gap;
  return { count, margin: Math.floor((length - used) / 2) };
}

function getLayout(grid: GridSize, length: number | undefined): CascadeLayout {
  const side = Math.min(grid.cols, grid.rows);
  const gap = side >= GAP_MIN_SIDE ? 1 : 0;
  const size = getBlockSize(side, gap, length);
  return { size, pitch: size + gap, x: getAxis(grid.cols, size, gap), y: getAxis(grid.rows, size, gap) };
}

function getBlockIndex(value: number, axis: Axis, layout: CascadeLayout): number {
  const offset = value - axis.margin;
  const index = Math.floor(offset / layout.pitch);
  const isInBlock = offset >= 0 && index < axis.count && offset % layout.pitch < layout.size;
  return isInBlock ? index : NO_BLOCK;
}

function getDelay(x: number, y: number, layout: CascadeLayout): number {
  const i = getBlockIndex(x, layout.x, layout);
  const j = getBlockIndex(y, layout.y, layout);
  return i === NO_BLOCK || j === NO_BLOCK ? NO_BLOCK : i + j;
}

function drawStep(grid: GridSize, layout: CascadeLayout, step: number): Frame {
  return createFrame(grid, (x, y) => {
    const delay = getDelay(x, y, layout);
    return delay !== NO_BLOCK && (step - delay < 0 || step - delay >= OFF_FRAMES);
  });
}

/** A lattice of square blocks that blinks out and back in along a diagonal wave, then holds all on. */
export function generateCascade(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const layout = getLayout(grid, params.length);
  const stepCount = layout.x.count + layout.y.count;
  const steps = Array.from({ length: stepCount }, (_, step) => drawStep(grid, layout, step));
  const hold = createFrame(grid, (x, y) => getDelay(x, y, layout) !== NO_BLOCK);
  return { frames: [...steps, hold], durations: [...steps.map(() => STEP_MS), HOLD_MS] };
}
