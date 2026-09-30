import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize } from '../../../../src/core/types';

const GRID_MAX = 16;
const WINDOW_MS = 1000;
const BIG_CHANGE_FRACTION = 0.2;
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export const MAX_BIG_CHANGES_PER_SECOND = 6;

export type Cell = readonly [x: number, y: number];

export function gridsFrom(min: GridSize): GridSize[] {
  const colCount = GRID_MAX - min.cols + 1;
  const rowCount = GRID_MAX - min.rows + 1;
  return Array.from({ length: colCount * rowCount }, (_, index) => ({
    cols: min.cols + (index % colCount),
    rows: min.rows + Math.floor(index / colCount),
  }));
}

export function countLit(frame: Frame): number {
  return frame.reduce<number>((total, bit) => total + bit, 0);
}

export function countChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

export function litCells(frame: Frame, cols: number): Cell[] {
  return frame.flatMap((bit, index): Cell[] => (bit === 1 ? [[index % cols, Math.floor(index / cols)]] : []));
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
}

type ChangeMeasure = (a: Frame, b: Frame) => number;

const litDelta: ChangeMeasure = (a, b) => Math.abs(countLit(a) - countLit(b));

function bigChangeTimes(output: RecipeOutput, isLoop: boolean, measure: ChangeMeasure): number[] {
  const repeats = isLoop ? 2 : 1;
  const frames = Array.from({ length: repeats }, () => output.frames).flat();
  const durations = Array.from({ length: repeats }, () => output.durations).flat();
  const starts = startTimes(durations);
  const threshold = BIG_CHANGE_FRACTION * frames[0].length;
  return frames
    .slice(1)
    .flatMap((frame, index) => (measure(frames[index], frame) >= threshold ? [starts[index + 1]] : []));
}

function worstWindow(times: readonly number[]): number {
  const counts = times.map(
    (start) => times.filter((time) => time >= start && time < start + WINDOW_MS).length,
  );
  return Math.max(0, ...counts);
}

export function maxBigLitChangesPerSecond(output: RecipeOutput, isLoop: boolean): number {
  return worstWindow(bigChangeTimes(output, isLoop, litDelta));
}

export function maxBigCellChangesPerSecond(output: RecipeOutput, isLoop: boolean): number {
  return worstWindow(bigChangeTimes(output, isLoop, countChanged));
}

export function maxStepChange(frames: readonly Frame[]): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => countChanged(frames[index], frame)));
}

export function seamChange(frames: readonly Frame[]): number {
  return countChanged(frames[frames.length - 1], frames[0]);
}

export function fingerprint(output: RecipeOutput): string {
  const text = `${output.frames.map((frame) => frame.join('')).join('|')}#${output.durations.join(',')}`;
  const hash = Array.from(text).reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), FNV_PRIME) >>> 0,
    FNV_OFFSET,
  );
  return hash.toString(16).padStart(8, '0');
}

export function toRows(frame: Frame, cols: number): string[] {
  const rowCount = frame.length / cols;
  return Array.from({ length: rowCount }, (_, y) =>
    frame
      .slice(y * cols, (y + 1) * cols)
      .map((bit) => (bit === 1 ? '#' : '.'))
      .join(''),
  );
}

export function frameFromRows(rows: readonly string[]): Frame {
  return rows.flatMap((row) => Array.from(row, (char) => (char === '#' ? 1 : 0)));
}

export interface ClipSummary {
  frames: number;
  totalMs: number;
  fingerprint: string;
}

export function frameText(frame: Frame, cols: number): string {
  return toRows(frame, cols).join('|');
}

export function allFrameTexts(output: RecipeOutput, cols: number): string[] {
  return output.frames.map((frame) => frameText(frame, cols));
}

export function keyFrameTexts(
  output: RecipeOutput,
  cols: number,
  indexes: readonly number[],
): Record<number, string> {
  return Object.fromEntries(indexes.map((index) => [index, frameText(output.frames[index], cols)]));
}

export function summarize(output: RecipeOutput): ClipSummary {
  return {
    frames: output.frames.length,
    totalMs: output.durations.reduce((sum, ms) => sum + ms, 0),
    fingerprint: fingerprint(output),
  };
}

export function textFrame(text: string): Frame {
  return frameFromRows(text.split('|'));
}
