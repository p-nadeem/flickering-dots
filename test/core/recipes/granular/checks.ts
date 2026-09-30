import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize } from '../../../../src/core/types';

const FLASH_CHANGE_RATIO = 0.2;
const WINDOW_MS = 1000;
const HASH_OFFSET = 2166136261;
const HASH_PRIME = 16777619;

export const MAX_BIG_CHANGES_PER_SECOND = 6;

export function gridsFrom(minCols: number, minRows: number, max = 16): GridSize[] {
  const sides = (min: number) => Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return sides(minCols).flatMap((cols) => sides(minRows).map((rows) => ({ cols, rows })));
}

export function labelGrids(grids: readonly GridSize[]): [string, GridSize][] {
  return grids.map((grid) => [`${grid.cols}x${grid.rows}`, grid]);
}

export function countChanges(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function changeTimes(output: RecipeOutput, isLoop: boolean): number[] {
  const { frames, durations } = output;
  const cells = frames[0].length;
  const starts = durations.map((_, index) => durations.slice(0, index + 1).reduce((a, b) => a + b, 0));
  const pairs = frames.map((frame, index) => [frame, frames[index + 1] ?? (isLoop ? frames[0] : frame)]);
  return pairs.flatMap(([from, to], index) =>
    countChanges(from, to) >= FLASH_CHANGE_RATIO * cells ? [starts[index]] : [],
  );
}

export function maxBigChangesPerSecond(output: RecipeOutput, isLoop: boolean): number {
  const times = changeTimes(output, isLoop);
  const loopMs = output.durations.reduce((a, b) => a + b, 0);
  const all = isLoop ? [...times, ...times.map((time) => time + loopMs)] : times;
  return Math.max(
    0,
    ...all.map((start) => all.filter((time) => time >= start && time < start + WINDOW_MS).length),
  );
}

export function largestStep(frames: readonly Frame[]): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => countChanges(frames[index], frame)));
}

export function seamChanges(frames: readonly Frame[]): number {
  return countChanges(frames[frames.length - 1], frames[0]);
}

export function hashFrames(frames: readonly Frame[]): string {
  const hash = frames
    .flat()
    .reduce<number>((value, bit) => Math.imul(value ^ (bit + 1), HASH_PRIME) >>> 0, HASH_OFFSET);
  return hash.toString(16);
}

export function hasValidShape(output: RecipeOutput, grid: GridSize): boolean {
  const cells = grid.cols * grid.rows;
  return (
    output.frames.length > 0 &&
    output.frames.length === output.durations.length &&
    output.frames.every((frame) => frame.length === cells && frame.every((bit) => bit === 0 || bit === 1)) &&
    output.durations.every((ms) => Number.isInteger(ms) && ms > 0)
  );
}
