import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize } from '../../../../src/core/types';

const WINDOW_MS = 1000;
const STEP_SHARE = 0.2;

export const MAX_STEPS_PER_SECOND = 6;

export function toRows(frame: Frame, cols: number): string[] {
  const rows = frame.length / cols;
  return Array.from({ length: rows }, (_, y) =>
    frame
      .slice(y * cols, (y + 1) * cols)
      .map((bit) => (bit === 1 ? '#' : '.'))
      .join(''),
  );
}

export function fromRows(rows: readonly string[]): Frame {
  return rows.flatMap((row) => [...row].map((ch) => (ch === '#' ? 1 : 0)));
}

export function litCount(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}

export function changedCells(a: Frame, b: Frame): number {
  return a.filter((bit, index) => bit !== b[index]).length;
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
}

type StepSize = (from: Frame, to: Frame) => number;

function stepTimes(output: RecipeOutput, loops: number, size: StepSize): number[] {
  const cells = output.frames[0].length;
  const all = Array.from({ length: loops }, () => output.frames).flat();
  const starts = startTimes(Array.from({ length: loops }, () => output.durations).flat());
  return all
    .slice(1)
    .flatMap((frame, index) => (size(all[index], frame) >= STEP_SHARE * cells ? [starts[index + 1]] : []));
}

function busiestSecond(output: RecipeOutput, isLoop: boolean, size: StepSize): number {
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const loops = isLoop ? Math.ceil(WINDOW_MS / loopMs) + 2 : 1;
  const times = stepTimes(output, loops, size);
  const counts = times.map(
    (start) => times.filter((time) => time >= start && time < start + WINDOW_MS).length,
  );
  return Math.max(0, ...counts);
}

export function maxStepsPerSecond(output: RecipeOutput, isLoop: boolean): number {
  return busiestSecond(output, isLoop, (from, to) => Math.abs(litCount(to) - litCount(from)));
}

export function maxBigChangesPerSecond(output: RecipeOutput, isLoop: boolean): number {
  return busiestSecond(output, isLoop, changedCells);
}

export function largestStep(frames: readonly Frame[]): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => changedCells(frames[index], frame)));
}

export function seamChange(frames: readonly Frame[]): number {
  return changedCells(frames[frames.length - 1], frames[0]);
}

export function squareGrids(from: number): GridSize[] {
  const LAST = 16;
  return Array.from({ length: LAST - from + 1 }, (_, index) => ({ cols: from + index, rows: from + index }));
}

export function litBox(frame: Frame, cols: number) {
  const cells = frame.flatMap((bit, index) => (bit === 1 ? [[index % cols, Math.floor(index / cols)]] : []));
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

export function overlayAll(frames: readonly Frame[]): Frame {
  return frames[0].map((_, index) => (frames.some((frame) => frame[index] === 1) ? 1 : 0));
}
