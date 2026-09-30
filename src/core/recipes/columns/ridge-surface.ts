import type { Frame, GridSize } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point } from '../helpers';

const LINE_SPACING = 3;
const PEAK_RISE = 3;
const SIGMA_DIVISOR = 5;
const DEPTH_PHASE = 1.2;
const ACROSS_PHASE = 0.35;
const HALF = 0.5;

/** The amplitude in rows of a full swell; it rounds to a 3-row rise at the peak. */
export const RIDGE_FULL_AMPLITUDE = 3.5;

/** Where the ridge lines sit: base rows front to back and the width of the central swell. */
export interface RidgeLayout {
  bases: number[];
  sigma: number;
  centre: number;
}

interface Span {
  top: number;
  bottom: number;
}

interface Drawn {
  points: Point[];
  horizon: number[];
}

/** Lays out the ridge lines 3 rows apart, centred vertically with any odd spare row above. */
export function ridgeLayout(grid: GridSize): RidgeLayout {
  const count = Math.max(1, Math.floor((grid.rows - 1 - PEAK_RISE) / LINE_SPACING) + 1);
  const used = (count - 1) * LINE_SPACING + 1 + PEAK_RISE;
  const front = grid.rows - 1 - Math.floor(Math.max(0, grid.rows - used) / 2);
  return {
    bases: Array.from({ length: count }, (_, line) => front - line * LINE_SPACING),
    sigma: grid.cols / SIGMA_DIVISOR,
    centre: (grid.cols - 1) / 2,
  };
}

/** The row of one ridge line in every column for a swell `amplitude` at wave `phase`. */
export function lineRows(
  layout: RidgeLayout,
  cols: number,
  line: number,
  amplitude: number,
  phase: number,
): number[] {
  return Array.from({ length: cols }, (_, x) => {
    const offset = x - layout.centre;
    const envelope = Math.exp(-(offset * offset) / (2 * layout.sigma * layout.sigma));
    const swell = HALF + HALF * Math.sin(phase - DEPTH_PHASE * line - ACROSS_PHASE * x);
    return Math.round(layout.bases[line] - amplitude * envelope * swell);
  });
}

function lineSpans(rows: readonly number[]): Span[] {
  return rows.map((top, x) => {
    const neighbours = [rows[x - 1], rows[x + 1]].filter((row): row is number => row !== undefined);
    return { top, bottom: Math.max(top, ...neighbours.map((row) => row - 1)) };
  });
}

function drawLine(drawn: Drawn, rows: readonly number[]): Drawn {
  const spans = lineSpans(rows);
  const points = spans.flatMap(({ top, bottom }, x) =>
    Array.from({ length: bottom - top + 1 }, (_, step): Point => [x, top + step]).filter(
      ([, y]) => y >= 0 && y < drawn.horizon[x],
    ),
  );
  return {
    points: [...drawn.points, ...points],
    horizon: drawn.horizon.map((row, x) => Math.min(row, spans[x].top)),
  };
}

/** The highest row a full swell reaches: the top of the ridge picture. */
export function ridgeTop(layout: RidgeLayout): number {
  return Math.max(0, layout.bases[layout.bases.length - 1] - PEAK_RISE);
}

/** Draws ridge lines given front first, each hiding what lies behind it, with steep steps filled. */
export function drawRidges(grid: GridSize, lines: readonly (readonly number[])[]): Frame {
  const start: Drawn = { points: [], horizon: Array.from({ length: grid.cols }, () => grid.rows) };
  return createFrameFromPoints(grid, lines.reduce(drawLine, start).points);
}

/** Every ridge line of the layout at one swell `amplitude` and wave `phase`, front first. */
export function surfaceLines(
  grid: GridSize,
  layout: RidgeLayout,
  amplitude: number,
  phase: number,
): number[][] {
  return layout.bases.map((_, line) => lineRows(layout, grid.cols, line, amplitude, phase));
}

/** One frame of the ridge surface. */
export function surfaceFrame(grid: GridSize, layout: RidgeLayout, amplitude: number, phase: number): Frame {
  return drawRidges(grid, surfaceLines(grid, layout, amplitude, phase));
}
