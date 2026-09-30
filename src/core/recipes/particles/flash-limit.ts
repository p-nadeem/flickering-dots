import type { Frame, GridSize } from '../../types';
import type { RecipeOutput } from '../helpers';

const FLASH_SHARE = 0.2;
const WINDOW_MS = 1000;
const MAX_STEPS_PER_WINDOW = 6;
const MAX_PASSES = 4096;

interface Stretch {
  frame: number;
  ms: number;
}

function countChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function bigStepFrames(frames: readonly Frame[], limit: number): number[] {
  return frames.flatMap((frame, index) => {
    const next = frames[(index + 1) % frames.length];
    return countChanged(frame, next) >= limit ? [index + 1] : [];
  });
}

function frameStarts(durations: readonly number[]): number[] {
  return durations.reduce<number[]>((starts, ms) => [...starts, starts[starts.length - 1] + ms], [0]);
}

function findTightWindow(steps: readonly number[], durations: readonly number[]): Stretch | undefined {
  const starts = frameStarts(durations);
  const total = starts[starts.length - 1];
  const times = steps.map((frame) => starts[frame]);
  const count = steps.length;
  const tight = times.flatMap((time, index): Stretch[] => {
    const later = index + MAX_STEPS_PER_WINDOW;
    const laterTime = times[later % count] + Math.floor(later / count) * total;
    const gap = laterTime - time;
    return gap < WINDOW_MS ? [{ frame: steps[later % count] - 1, ms: WINDOW_MS - gap }] : [];
  });
  return tight[0];
}

function stretchUntilSafe(steps: readonly number[], durations: readonly number[], pass: number): number[] {
  const tight = findTightWindow(steps, durations);
  if (tight === undefined || pass >= MAX_PASSES) return [...durations];
  const next = durations.map((ms, index) => (index === tight.frame ? ms + tight.ms : ms));
  return stretchUntilSafe(steps, next, pass + 1);
}

/** Lengthens frames just enough that a clip, played as a loop, changes 20 percent of the grid at most 6 times a second. */
export function limitFlashRate(grid: GridSize, output: RecipeOutput): RecipeOutput {
  const steps = bigStepFrames(output.frames, FLASH_SHARE * grid.cols * grid.rows);
  if (steps.length === 0) return output;
  return { ...output, durations: stretchUntilSafe(steps, output.durations, 0) };
}
