import type { GridSize, RecipeParams } from '../types';
import { framesEqual } from '../frame';
import { createFrame, mergeRepeatedFrames } from './helpers';
import type { RecipeOutput } from './helpers';

const SWEEP_MS = 55;
const REST_MS = 900;
const STRIP_MAX_ROWS = 4;
const LINE_LENGTHS = [1, 0.8, 0.55] as const;
const MIN_BAND = 1;
const MAX_BAND = 4;
const CHECKER_PERIOD = 2;
const LINE_PITCH = 2;
const LINE_MARGIN = 1;

/** Default params of the `shimmer` recipe: `trail` is the band width in diagonals. */
export const SHIMMER_DEFAULTS = { trail: 2 } as const satisfies RecipeParams;

type CellTest = (x: number, y: number) => boolean;

function getBandWidth(trail: number): number {
  const clamped = Math.min(MAX_BAND, Math.max(MIN_BAND, Math.round(trail)));
  return Math.ceil(clamped / CHECKER_PERIOD) * CHECKER_PERIOD;
}

function lastBaseX(y: number, length: number): number {
  return length - 1 - ((length - 1 + y) % CHECKER_PERIOD);
}

function createShapeTest({ cols, rows }: GridSize): CellTest {
  if (rows <= STRIP_MAX_ROWS) return () => true;
  return (x, y) => {
    if ((y - LINE_MARGIN) % LINE_PITCH !== 0 || y >= rows - LINE_MARGIN) return false;
    const line = (y - LINE_MARGIN) / LINE_PITCH;
    const length = Math.round(cols * LINE_LENGTHS[line % LINE_LENGTHS.length]);
    const first = y % CHECKER_PERIOD;
    const last = lastBaseX(y, length);
    if (last - first < CHECKER_PERIOD) return x < length;
    return x >= first && x <= last;
  };
}

function isBase(x: number, y: number): boolean {
  return (x + y) % CHECKER_PERIOD === 0;
}

/** A solid slanted band sweeping one dim diagonal per frame over a checkerboard strip, or ragged text lines on 5 or more rows, then a rest. */
export function generateShimmer(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const width = getBandWidth(params.trail ?? SHIMMER_DEFAULTS.trail);
  const isInShape = createShapeTest(grid);
  const lastDiagonal = grid.cols - 1 + (grid.rows - 1);
  const sweep = Array.from({ length: lastDiagonal + width }, (_, step) => {
    const start = step - (width - 1);
    return createFrame(
      grid,
      (x, y) => isInShape(x, y) && (isBase(x, y) || (x + y >= start && x + y < start + width)),
    );
  });
  const rest = createFrame(grid, (x, y) => isInShape(x, y) && isBase(x, y));
  const band = sweep.filter((frame) => !framesEqual(frame, rest));
  const merged = mergeRepeatedFrames({ frames: band, durations: band.map(() => SWEEP_MS) });
  return {
    frames: [...merged.frames, rest],
    durations: [...merged.durations, REST_MS],
    still: merged.frames.length,
  };
}
