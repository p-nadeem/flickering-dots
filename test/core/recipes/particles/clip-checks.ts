import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

export interface VariantCase {
  label: string;
  params: RecipeParams;
  setGrid: GridSize;
  minSide: number;
  isLoop: boolean;
}

const WINDOW_MS = 1000;
const MAX_STEPS_PER_WINDOW = 6;
const FLASH_SHARE = 0.2;
const GRID_MAX = 16;

export { MAX_STEPS_PER_WINDOW };

export function countChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function startTimes(durations: readonly number[], count: number): number[] {
  return Array.from({ length: count }, (_, step) => durations[step % durations.length]).reduce<number[]>(
    (starts, ms) => [...starts, starts[starts.length - 1] + ms],
    [0],
  );
}

function transitions(output: RecipeOutput, isLoop: boolean): { at: number; changed: number }[] {
  const { frames, durations } = output;
  const total = frames.length * (isLoop ? 2 : 1);
  const starts = startTimes(durations, total);
  const steps = Array.from({ length: total - (isLoop ? 0 : 1) }, (_, step) => step);
  return steps.map((step) => ({
    at: starts[step + 1],
    changed: countChanged(frames[step % frames.length], frames[(step + 1) % frames.length]),
  }));
}

export function maxFlashStepsPerSecond(output: RecipeOutput, grid: GridSize, isLoop: boolean): number {
  const limit = FLASH_SHARE * grid.cols * grid.rows;
  const times = transitions(output, isLoop)
    .filter(({ changed }) => changed >= limit)
    .map(({ at }) => at);
  return Math.max(
    0,
    ...times.map((start) => times.filter((time) => time >= start && time < start + WINDOW_MS).length),
  );
}

export function largestStep(frames: readonly Frame[]): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => countChanged(frames[index], frame)));
}

export function seamStep(frames: readonly Frame[]): number {
  return countChanged(frames[frames.length - 1], frames[0]);
}

export function squareGrids(minSide: number): GridSize[] {
  return Array.from({ length: GRID_MAX - minSide + 1 }, (_, index) => ({
    cols: minSide + index,
    rows: minSide + index,
  }));
}

export function sampleGrids(minSide: number): GridSize[] {
  const oblong: GridSize[] = [
    { cols: GRID_MAX, rows: Math.max(minSide, 9) },
    { cols: Math.max(minSide, 9), rows: GRID_MAX },
    { cols: minSide + 1, rows: minSide },
  ];
  return [...squareGrids(minSide), ...oblong];
}

export function toRows(frame: Frame, cols: number): string {
  const rows = Math.ceil(frame.length / cols);
  return Array.from({ length: rows }, (_, y) => frame.slice(y * cols, (y + 1) * cols).join('')).join(' ');
}

export function digest(output: RecipeOutput): string {
  const text = output.frames.map((frame) => frame.join('')).join('|') + '#' + output.durations.join(',');
  const FNV_OFFSET = 2166136261;
  const FNV_PRIME = 16777619;
  const hash = [...text].reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), FNV_PRIME) >>> 0,
    FNV_OFFSET,
  );
  return `${output.frames.length}:${hash.toString(16)}`;
}
