import { countLit } from '../../frame';
import type { Frame } from '../../types';
import type { RecipeOutput } from '../helpers';

const FLASH_STEP_FRACTION = 0.2;
const FLASH_WINDOW_MS = 1000;
const MAX_STEPS_PER_WINDOW = 6;
const MAX_CELL_FLASHES_PER_WINDOW = 3;

interface Timeline {
  frames: readonly Frame[];
  starts: number[];
  loopMs: number;
}

function toTimeline({ frames, durations }: RecipeOutput): Timeline {
  const starts = durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
  return { frames, starts, loopMs: durations.reduce((sum, ms) => sum + ms, 0) };
}

function previousIndex(index: number, length: number): number {
  return (index - 1 + length) % length;
}

function countChanged(previous: Frame, next: Frame): number {
  return next.reduce<number>((total, bit, cell) => total + (bit === previous[cell] ? 0 : 1), 0);
}

function isBigStep(previous: Frame, next: Frame): boolean {
  const limit = FLASH_STEP_FRACTION * next.length;
  return Math.abs(countLit(next) - countLit(previous)) >= limit || countChanged(previous, next) >= limit;
}

function bigStepTimes({ frames, starts, loopMs }: Timeline, isLoop: boolean): number[] {
  return frames.flatMap((frame, index) => {
    if (index === 0 && !isLoop) return [];
    return isBigStep(frames[previousIndex(index, frames.length)], frame)
      ? [index === 0 ? loopMs : starts[index]]
      : [];
  });
}

function cellOnTimes({ frames, starts }: Timeline, cell: number): number[] {
  return frames.flatMap((frame, index) => {
    const isTurningOn = frame[cell] === 1 && frames[previousIndex(index, frames.length)][cell] === 0;
    return isTurningOn ? [starts[index]] : [];
  });
}

function spanScale(times: readonly number[], loopMs: number, isLoop: boolean, most: number): number {
  const sorted = [...times].sort((a, b) => a - b);
  const loops = isLoop && sorted.length > 0 ? Math.ceil((most + 1) / sorted.length) + 1 : 1;
  const all = Array.from({ length: loops }, (_, loop) => sorted.map((time) => time + loop * loopMs)).flat();
  const spans = all.slice(0, Math.max(0, all.length - most)).map((time, index) => all[index + most] - time);
  const shortest = spans.length === 0 ? Infinity : Math.min(...spans);
  return shortest >= FLASH_WINDOW_MS ? 1 : FLASH_WINDOW_MS / shortest;
}

function cellScale(timeline: Timeline): number {
  const cells = timeline.frames[0].length;
  return Array.from({ length: cells }, (_, cell) =>
    spanScale(cellOnTimes(timeline, cell), timeline.loopMs, true, MAX_CELL_FLASHES_PER_WINDOW),
  ).reduce((most, scale) => Math.max(most, scale), 1);
}

/** Stretches durations evenly so no second holds more than six frame changes of a fifth of the grid (lit count or changed dots) or three flashes of one dot (WCAG 2.3.1). */
export function limitFlashRate(output: RecipeOutput, isLoop: boolean): RecipeOutput {
  if (output.frames.length < 2) return output;
  const timeline = toTimeline(output);
  const stepScale = spanScale(bigStepTimes(timeline, isLoop), timeline.loopMs, isLoop, MAX_STEPS_PER_WINDOW);
  const scale = Math.max(stepScale, cellScale(timeline));
  if (scale === 1) return output;
  return { ...output, durations: output.durations.map((ms) => Math.ceil(ms * scale)) };
}
