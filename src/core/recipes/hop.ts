import type { Frame, GridSize, RecipeParams } from '../types';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const DOT_COUNT = 3;
const SMALL_DOT = 1;
const LARGE_DOT = 2;
const LARGE_DOT_MIN_COLS = 13;
const LARGE_DOT_MIN_ROWS = 6;
const MIN_HOP = 1;
const MAX_HOP = 2;
const REST_MS = 420;
const STEP_MS = 150;

interface HopLayout {
  size: number;
  height: number;
  restRow: number;
  lefts: number[];
}

function getDotSize({ cols, rows }: GridSize): number {
  return cols >= LARGE_DOT_MIN_COLS && rows >= LARGE_DOT_MIN_ROWS ? LARGE_DOT : SMALL_DOT;
}

function getSpare(cols: number, size: number, gap: number): number {
  return cols - DOT_COUNT * size - (DOT_COUNT - 1) * gap;
}

function getGap(cols: number, size: number): number {
  return getSpare(cols, size, size) < 0 ? 0 : size;
}

function getLayout(grid: GridSize): HopLayout {
  const size = getDotSize(grid);
  const height = Math.max(MIN_HOP, Math.min(MAX_HOP, grid.rows - size - 1));
  const top = Math.floor((grid.rows - size - height) / 2);
  const gap = getGap(grid.cols, size);
  const left = Math.floor(getSpare(grid.cols, size, gap) / 2);
  const lefts = Array.from({ length: DOT_COUNT }, (_, dot) => left + dot * (size + gap));
  return { size, height, restRow: top + height, lefts };
}

function getLift(step: number, dot: number, height: number): number {
  const phase = step - dot;
  return phase >= 0 && phase <= 2 * height ? height - Math.abs(phase - height) : 0;
}

function drawStep(grid: GridSize, layout: HopLayout, step: number): Frame {
  const { size, height, restRow, lefts } = layout;
  const tops = lefts.map((_, dot) => restRow - getLift(step, dot, height));
  return createFrame(grid, (x, y) =>
    lefts.some((left, dot) => x >= left && x < left + size && y >= tops[dot] && y < tops[dot] + size),
  );
}

/** Three dots hopping up one after another, like a chat typing bubble. */
export function generateHop(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = getLayout(grid);
  const frames = Array.from({ length: 2 * layout.height + 2 }, (_, step) => drawStep(grid, layout, step));
  return { frames, durations: frames.map((_, step) => (step === 0 ? REST_MS : STEP_MS)) };
}
