import { createRng } from '../../rng';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrame } from '../helpers';
import type { RecipeOutput } from '../helpers';
import {
  noiseFrame,
  range,
  readGlyph,
  RESOLVE_DEFAULT_SEED,
  RESULT_GLYPHS,
  RESULT_HOLD_MS,
  resultMask,
} from './shared';

const STEP_MS = 60;
const LAG = 3;
const REROLL_FRAMES = 2;
const NOISE_DENSITY = 0.35;
const REST_PERIOD_MS = 4000;
const REST_PERIODS = 3;
const FLUTTER_FRAMES = 3;
const FLUTTER_MS = 120;
const FLUTTER_TRIES = 4;
const FLUTTER_SLOT_STRIDE = 101;

type Order = 'ltr' | 'rtl';

interface Board {
  grid: GridSize;
  seed: number;
  density: number;
  order: Order;
  target: Frame | undefined;
}

function orderOf(board: Board, x: number): number {
  return board.order === 'ltr' ? x : board.grid.cols - 1 - x;
}

function drawBoard(board: Board, k: number): Frame {
  const noise = noiseFrame(board.grid, board.seed, Math.floor((k - 1) / REROLL_FRAMES), board.density);
  return createFrame(board.grid, (x, y) => {
    const index = y * board.grid.cols + x;
    const order = orderOf(board, x);
    if (order < k - LAG) return board.target?.[index] === 1;
    return order < k && noise[index] === 1;
  });
}

function readBoard(grid: GridSize, params: RecipeParams, order: Order, target: Frame | undefined): Board {
  return {
    grid,
    order,
    target,
    seed: params.seed ?? RESOLVE_DEFAULT_SEED,
    density: params.density ?? NOISE_DENSITY,
  };
}

function lockTo(grid: GridSize, params: RecipeParams, order: Order, fallback: string): RecipeOutput {
  const glyph = readGlyph(params.glyph, RESULT_GLYPHS, 'flap', fallback);
  const board = readBoard(grid, params, order, resultMask(glyph, grid));
  const frames = range(1, grid.cols + LAG + 1).map((k) => drawBoard(board, k));
  return {
    frames,
    durations: frames.map((_, index) => (index === frames.length - 1 ? RESULT_HOLD_MS : STEP_MS)),
  };
}

/** Columns lock onto the glyph left to right, three columns of seeded flutter running ahead of the lock. */
export function generateFlap(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  return lockTo(grid, params, 'ltr', 'check');
}

/** The flap reveal locking right to left. */
export function generateFlapRtl(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  return lockTo(grid, params, 'rtl', 'cross');
}

/** A three-column band of flutter sweeps left to right over a dark board and never locks. */
export function generateFlapBand(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const board = readBoard(grid, params, 'ltr', undefined);
  const frames = range(1, grid.cols + LAG).map((k) => drawBoard(board, k));
  return { frames, durations: frames.map(() => STEP_MS) };
}

function columnText(frame: Frame, grid: GridSize, x: number): string {
  return range(0, grid.rows)
    .map((y) => frame[y * grid.cols + x])
    .join('');
}

function flutterFrame(board: Board, mask: Frame, column: number, slot: number): Frame {
  const { grid } = board;
  const tries = range(0, FLUTTER_TRIES).map((attempt) =>
    noiseFrame(grid, board.seed, slot + attempt * FLUTTER_SLOT_STRIDE, board.density),
  );
  const noise = tries.find((frame) => columnText(frame, grid, column) !== columnText(mask, grid, column));
  return createFrame(grid, (x, y) => {
    const index = y * grid.cols + x;
    if (x !== column) return mask[index] === 1;
    return noise ? noise[index] === 1 : mask[index] === 0;
  });
}

function restColumns(grid: GridSize, mask: Frame, seed: number): number[] {
  const lit = range(0, grid.cols).filter((x) => columnText(mask, grid, x).includes('1'));
  const choices = lit.length > 0 ? lit : range(0, grid.cols);
  const random = createRng(seed);
  return range(0, REST_PERIODS).map(() => choices[Math.floor(random() * choices.length)]);
}

/** The glyph at rest; every 4 s one column flutters for three frames and locks again. */
export function generateFlapRest(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const glyph = readGlyph(params.glyph, RESULT_GLYPHS, 'flap', 'sparkle');
  const mask = resultMask(glyph, grid);
  const board = readBoard(grid, params, 'ltr', mask);
  const restMs = REST_PERIOD_MS - FLUTTER_FRAMES * FLUTTER_MS;
  const periods = restColumns(grid, mask, board.seed).map((column, period) => ({
    frames: [
      mask,
      ...range(0, FLUTTER_FRAMES).map((step) =>
        flutterFrame(board, mask, column, period * FLUTTER_FRAMES + step),
      ),
    ],
    durations: [restMs, ...range(0, FLUTTER_FRAMES).map(() => FLUTTER_MS)],
  }));
  return {
    frames: periods.flatMap((period) => period.frames),
    durations: periods.flatMap((period) => period.durations),
    still: 0,
  };
}
