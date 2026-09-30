import { glyphMask } from '../../glyphs';
import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import type { RecipeOutput } from '../helpers';

/** One lit row per column, or null for a dark column. */
export type ColumnRows = readonly (number | null)[];

/** How long a success or error moment holds its final frame. */
export const RESULT_HOLD_MS = 1500;

/** Full turn in radians. */
export const TAU = 2 * Math.PI;

/** Lights one row per column; null columns and rows outside the grid stay dark. */
export function frameFromColumnRows(grid: GridSize, rows: ColumnRows): Frame {
  return createFrame(grid, (x, y) => rows[x] === y);
}

/** Lights each column up from the bottom to its rounded height, clamped to the grid. */
export function frameFromHeights(grid: GridSize, heights: readonly number[]): Frame {
  return createFrame(grid, (x, y) => y >= grid.rows - Math.round(heights[x] ?? 0));
}

/** The top lit row of each column of a frame, or null where the column is dark. */
export function columnRowsOfMask(mask: Frame, grid: GridSize): (number | null)[] {
  return Array.from({ length: grid.cols }, (_, x) => {
    const y = Array.from({ length: grid.rows }, (__, row) => row).find(
      (row) => mask[row * grid.cols + x] === 1,
    );
    return y ?? null;
  });
}

function stepToward(from: number | null, to: number | null, step: number): number | null {
  if (to === null) return null;
  if (from === null) return to;
  return from + Math.sign(to - from) * Math.min(step, Math.abs(to - from));
}

/** Frames that move each column one row a frame from `from` into `mask`, ending on the mask exactly. */
export function slideToMask(grid: GridSize, from: ColumnRows, mask: Frame): Frame[] {
  const targets = columnRowsOfMask(mask, grid);
  const distances = targets.map((to, x) =>
    to === null || from[x] === null ? 1 : Math.abs(to - (from[x] ?? 0)),
  );
  const steps = Math.max(1, ...distances);
  const moving = Array.from({ length: steps - 1 }, (_, index) =>
    frameFromColumnRows(
      grid,
      targets.map((to, x) => stepToward(from[x] ?? null, to, index + 1)),
    ),
  );
  return [...moving, [...mask]];
}

/** Settles one row per column into the check at `ms` a step, then holds it. */
export function settleIntoCheck(grid: GridSize, from: ColumnRows, ms: number): RecipeOutput {
  const frames = slideToMask(grid, from, glyphMask('check', grid));
  return withLastDuration({ frames, durations: evenDurations(frames.length, ms) }, RESULT_HOLD_MS);
}

/** The same duration for `count` frames. */
export function evenDurations(count: number, ms: number): number[] {
  return Array.from({ length: count }, () => ms);
}

/** A copy of the output whose last frame lasts `ms`. */
export function withLastDuration(output: RecipeOutput, ms: number): RecipeOutput {
  const last = output.durations.length - 1;
  return {
    frames: output.frames,
    durations: output.durations.map((value, index) => (index === last ? ms : value)),
  };
}

/** Plays outputs one after another. */
export function joinOutputs(parts: readonly RecipeOutput[]): RecipeOutput {
  return {
    frames: parts.flatMap((part) => part.frames),
    durations: parts.flatMap((part) => part.durations),
  };
}

/** Eases 0 to 1 with zero slope at both ends; clamps outside that range. */
export function smoothstep(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/** The middle row, the lower of the two on an even side. */
export function middleRow(rows: number): number {
  return Math.floor(rows / 2);
}

/** A whole number from `min` to `max`, or the fallback when the value is absent. */
export function wholeWithin(value: number | undefined, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value ?? fallback)));
}
