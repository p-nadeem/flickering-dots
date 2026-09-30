import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize } from '../../../../src/core/types';

import { toFrameText } from '../frame-text';

const WINDOW_MS = 1000;
const STEP_SHARE = 0.2;
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export const MAX_STEPS_PER_SECOND = 6;

export function countLit(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}

export function countChanged(a: Frame, b: Frame): number {
  return a.filter((bit, index) => bit !== b[index]).length;
}

function getStepTimes(output: RecipeOutput, cells: number, isLoop: boolean): number[] {
  const { frames, durations } = output;
  const pairs = isLoop ? frames.length : frames.length - 1;
  return Array.from({ length: Math.max(0, pairs) }, (_, index) => index).flatMap((index) => {
    const next = frames[(index + 1) % frames.length];
    const endMs = durations.slice(0, index + 1).reduce((sum, ms) => sum + ms, 0);
    const lumaStep = Math.abs(countLit(next) - countLit(frames[index]));
    return lumaStep >= STEP_SHARE * cells ? [endMs] : [];
  });
}

/** Most lit-count steps of 20 percent or more of the grid in any 1 s window; loops are unrolled. */
export function countPeakLumaSteps(output: RecipeOutput, grid: GridSize, isLoop: boolean): number {
  const once = getStepTimes(output, grid.cols * grid.rows, isLoop);
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const repeats = isLoop ? Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1 : 1;
  const times = Array.from({ length: repeats }, (_, loop) => once.map((t) => t + loop * loopMs)).flat();
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

export function getLargestStep(frames: readonly Frame[]): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => countChanged(frames[index], frame)));
}

export function getSeamChange(frames: readonly Frame[]): number {
  return countChanged(frames[frames.length - 1], frames[0]);
}

export function toTexts(frames: readonly Frame[], cols: number): string[] {
  return frames.map((frame) => toFrameText(frame, cols));
}

export function digestFrames(frames: readonly Frame[], cols: number): number {
  return [...toTexts(frames, cols).join('|')].reduce(
    (hash, char) => Math.imul(hash ^ char.charCodeAt(0), FNV_PRIME) >>> 0,
    FNV_OFFSET,
  );
}

export function expectWellFormed(output: RecipeOutput, grid: GridSize): string[] {
  const problems = [
    output.frames.length > 0 ? '' : 'no frames',
    output.durations.length === output.frames.length ? '' : 'durations do not match frames',
    output.frames.every((frame) => frame.length === grid.cols * grid.rows) ? '' : 'frame size',
    output.frames.every((frame) => frame.every((bit) => bit === 0 || bit === 1)) ? '' : 'non-binary cell',
    output.durations.every((ms) => Number.isInteger(ms) && ms > 0) ? '' : 'bad duration',
    output.still === undefined || (output.still >= 0 && output.still < output.frames.length)
      ? ''
      : 'bad still',
  ];
  return problems.filter((problem) => problem !== '');
}

export function gridName({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function gridsFrom(pairs: readonly (readonly [number, number])[]): GridSize[] {
  return pairs.map(([cols, rows]) => ({ cols, rows }));
}
