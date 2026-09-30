import type { GridSize } from '../types';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const DOT_COUNT = 3;
const GAP_COUNT = DOT_COUNT - 1;
const SIZE_SLOTS = DOT_COUNT + 1;
const DURATIONS_MS = [200, 260, 260, 560] as const;
const SIZE_DIVISOR = 1.6;
const MAX_GAP_RATIO = 2;

interface EllipsisLayout {
  size: number;
  top: number;
  lefts: number[];
}

function getDotSize(grid: GridSize): number {
  return Math.max(1, Math.floor(Math.min(grid.rows, grid.cols / SIZE_SLOTS) / SIZE_DIVISOR));
}

function isSpreadGap(free: number, size: number, gap: number): boolean {
  const leftover = free - GAP_COUNT * gap;
  return leftover >= 2 * size && leftover % 2 === 0;
}

function getGap(free: number, size: number): number {
  const widths = Array.from({ length: size + 1 }, (_, index) => MAX_GAP_RATIO * size - index);
  const spread = widths.find((gap) => isSpreadGap(free, size, gap));
  return spread ?? Math.max(0, Math.min(size, Math.floor(free / GAP_COUNT)));
}

function getLayout(grid: GridSize): EllipsisLayout {
  const size = getDotSize(grid);
  const free = grid.cols - DOT_COUNT * size;
  const gap = getGap(free, size);
  const margin = Math.floor((free - GAP_COUNT * gap) / 2);
  return {
    size,
    top: Math.floor((grid.rows - size) / 2),
    lefts: Array.from({ length: DOT_COUNT }, (_, dot) => margin + dot * (size + gap)),
  };
}

/** Three square dots appearing one by one with even gaps of one to two dots, then all clearing: the classic typing indicator. */
export function generateEllipsis(grid: GridSize): RecipeOutput {
  const { size, top, lefts } = getLayout(grid);
  const drawDots = (visible: number) =>
    createFrame(grid, (x, y) => {
      const dot = lefts.findIndex((left) => x >= left && x < left + size);
      return dot !== -1 && dot < visible && y >= top && y < top + size;
    });
  return {
    frames: Array.from({ length: DOT_COUNT + 1 }, (_, visible) => drawDots(visible)),
    durations: [...DURATIONS_MS],
  };
}
