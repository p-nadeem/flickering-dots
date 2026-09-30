import type { GridSize, RecipeParams } from '../types';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const STEP_MS = 65;
const EDGE_MS = 195;
const MIN_LOOP_MS = 700;
const MIN_TRAIL = 2;
const COLS_PER_TRAIL_DOT = 5;
const SHORT_HEAD_MAX_ROWS = 3;
const ODD_HEAD = 3;
const EVEN_HEAD = 4;
const TAIL_INSET = 2;

interface Band {
  top: number;
  height: number;
}

interface ScannerLayout {
  head: Band;
  tail: Band;
  trail: number;
}

interface HeadStep {
  x: number;
  direction: 1 | -1;
  isEdge: boolean;
}

function centredBand(rows: number, height: number): Band {
  return { top: Math.floor((rows - height) / 2), height };
}

function getHeadHeight(rows: number): number {
  if (rows <= SHORT_HEAD_MAX_ROWS) return rows;
  return rows % 2 === 1 ? ODD_HEAD : EVEN_HEAD;
}

function getLayout(grid: GridSize, params: RecipeParams): ScannerLayout {
  const headHeight = getHeadHeight(grid.rows);
  const trail = params.trail ?? Math.max(MIN_TRAIL, Math.round(grid.cols / COLS_PER_TRAIL_DOT));
  return {
    head: centredBand(grid.rows, headHeight),
    tail: centredBand(grid.rows, Math.max(1, headHeight - TAIL_INSET)),
    trail,
  };
}

function getHeadPath(cols: number): HeadStep[] {
  const isEdge = (x: number) => x === 0 || x === cols - 1;
  const forward = Array.from({ length: cols }, (_, x): HeadStep => ({ x, direction: 1, isEdge: isEdge(x) }));
  const back = Array.from({ length: Math.max(0, cols - 2) }, (_, index): HeadStep => ({
    x: cols - 2 - index,
    direction: -1,
    isEdge: false,
  }));
  return [...forward, ...back];
}

function isInBand(y: number, band: Band): boolean {
  return y >= band.top && y < band.top + band.height;
}

function drawStep(grid: GridSize, layout: ScannerLayout, step: HeadStep) {
  const trail = step.isEdge ? 0 : layout.trail;
  return createFrame(grid, (x, y) => {
    if (x === step.x) return isInBand(y, layout.head);
    const behind = (step.x - x) * step.direction;
    return behind >= 1 && behind <= trail && isInBand(y, layout.tail);
  });
}

function getStepMs(path: readonly HeadStep[]): number {
  const edgeCount = path.filter((step) => step.isEdge).length;
  const stepCount = path.length - edgeCount;
  if (stepCount === 0) return STEP_MS;
  return Math.max(STEP_MS, Math.ceil((MIN_LOOP_MS - edgeCount * EDGE_MS) / stepCount));
}

/** A bar with a short tail gliding left and right, pausing at each edge; `trail` defaults to cols / 5, at least 2. */
export function generateScanner(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const layout = getLayout(grid, params);
  const path = getHeadPath(grid.cols);
  const stepMs = getStepMs(path);
  return {
    frames: path.map((step) => drawStep(grid, layout, step)),
    durations: path.map((step) => (step.isEdge ? EDGE_MS : stepMs)),
  };
}
