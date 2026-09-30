import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize } from '../../../../src/core/types';

export type Cell = readonly [x: number, y: number];

const WINDOW_MS = 1000;
const BIG_CHANGE_SHARE = 0.2;
const LOOP_REPEATS = 3;

export const MAX_BIG_CHANGES_PER_SECOND = 6;

export function squaresFrom(smallest: number, largest = 16): GridSize[] {
  return Array.from({ length: largest - smallest + 1 }, (_, index) => ({
    cols: smallest + index,
    rows: smallest + index,
  }));
}

export const RECTANGLES: readonly GridSize[] = [
  { cols: 9, rows: 7 },
  { cols: 16, rows: 9 },
  { cols: 12, rows: 16 },
  { cols: 7, rows: 5 },
  { cols: 10, rows: 3 },
];

export function gridName({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function toRows(frame: Frame, cols: number): string[] {
  return Array.from({ length: frame.length / cols }, (_, y) =>
    frame
      .slice(y * cols, (y + 1) * cols)
      .map((bit) => (bit === 1 ? '#' : '.'))
      .join(''),
  );
}

export function litCells(frame: Frame, cols: number): Cell[] {
  return frame.flatMap((bit, index): Cell[] => (bit === 1 ? [[index % cols, Math.floor(index / cols)]] : []));
}

export function countLit(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}

export function countChanges(a: Frame, b: Frame): number {
  return a.filter((bit, index) => bit !== b[index]).length;
}

export function isMirrored(rows: readonly string[]): boolean {
  const leftRight = rows.every((row) => row === [...row].reverse().join(''));
  const topBottom = rows.every((row, index) => row === rows[rows.length - 1 - index]);
  return leftRight && topBottom;
}

export function isTransposeSymmetric(rows: readonly string[]): boolean {
  return rows.every((row, y) => [...row].every((cell, x) => rows[x]?.[y] === cell));
}

function changeTimes(output: RecipeOutput, isLoop: boolean, cellCount: number): number[] {
  const { frames, durations } = output;
  const loopMs = durations.reduce((sum, ms) => sum + ms, 0);
  const repeats = isLoop ? LOOP_REPEATS : 1;
  const threshold = cellCount * BIG_CHANGE_SHARE;
  return Array.from({ length: repeats }, (_, loop) =>
    frames.flatMap((frame, index) => {
      const isFirst = index === 0;
      if (isFirst && (!isLoop || loop === 0)) return [];
      const previous = frames[isFirst ? frames.length - 1 : index - 1];
      const start = loop * loopMs + durations.slice(0, index).reduce((sum, ms) => sum + ms, 0);
      return countChanges(previous, frame) >= threshold ? [start] : [];
    }),
  ).flat();
}

export function peakBigChangesPerSecond(output: RecipeOutput, grid: GridSize, isLoop: boolean): number {
  const times = changeTimes(output, isLoop, grid.cols * grid.rows);
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

export function isValidOutput(output: RecipeOutput, grid: GridSize): boolean {
  const cells = grid.cols * grid.rows;
  const hasFrames = output.frames.length > 0 && output.frames.length === output.durations.length;
  const isSized = output.frames.every(
    (frame) => frame.length === cells && frame.every((bit) => bit === 0 || bit === 1),
  );
  const isTimed = output.durations.every((ms) => Number.isFinite(ms) && ms > 0);
  return hasFrames && isSized && isTimed;
}

export function chebyshev(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}
