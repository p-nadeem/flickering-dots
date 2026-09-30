import type { RecipeOutput } from '../../../../src/core/recipes/helpers';
import type { Frame, GridSize } from '../../../../src/core/types';

const FLASH_SHARE = 0.2;
const WINDOW_MS = 1000;
const LOOP_COPIES = 3;

export const MAX_BIG_CHANGES_PER_SECOND = 6;
export const GRID_MAX = 16;

export function cellsChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function changeTimes(frames: readonly Frame[], durations: readonly number[]): number[] {
  const threshold = FLASH_SHARE * frames[0].length;
  const starts = durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
  return frames
    .slice(1)
    .flatMap((frame, index) => (cellsChanged(frames[index], frame) >= threshold ? [starts[index + 1]] : []));
}

export function maxBigChangesPerSecond({ frames, durations }: RecipeOutput, isLoop: boolean): number {
  const copies = isLoop ? LOOP_COPIES : 1;
  const allFrames = Array.from({ length: copies }, () => frames).flat();
  const allDurations = Array.from({ length: copies }, () => durations).flat();
  const times = changeTimes(allFrames, allDurations);
  const counts = times.map(
    (start) => times.filter((time) => time >= start && time < start + WINDOW_MS).length,
  );
  return Math.max(0, ...counts);
}

export function largestInnerChange(frames: readonly Frame[]): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => cellsChanged(frames[index], frame)));
}

export function seamChange(frames: readonly Frame[]): number {
  return cellsChanged(frames[frames.length - 1], frames[0]);
}

export function isWellFormed({ frames, durations }: RecipeOutput, { cols, rows }: GridSize): boolean {
  return (
    frames.length > 0 &&
    frames.length === durations.length &&
    frames.every((frame) => frame.length === cols * rows && frame.every((bit) => bit === 0 || bit === 1)) &&
    durations.every((ms) => Number.isInteger(ms) && ms > 0)
  );
}

export function gridsFrom(min: GridSize): GridSize[] {
  return Array.from({ length: GRID_MAX - min.cols + 1 }, (_, colIndex) =>
    Array.from({ length: GRID_MAX - min.rows + 1 }, (__, rowIndex) => ({
      cols: min.cols + colIndex,
      rows: min.rows + rowIndex,
    })),
  ).flat();
}

export function label({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}
