import type { Frame } from '../../types';
import type { RecipeOutput } from '../helpers';

const WINDOW_MS = 1000;
const MAX_FLASHES_PER_WINDOW = 3;
const EXTRA_PASSES = 2;

interface CellPace {
  durations: readonly number[];
  time: number;
  onTimes: readonly (readonly number[])[];
}

function turningOn(previous: Frame, frame: Frame): number[] {
  return frame.flatMap((bit, cell) => (bit === 1 && previous[cell] === 0 ? [cell] : []));
}

function earliestStart(pace: CellPace, cells: readonly number[]): number {
  const limits = cells.map((cell) => {
    const times = pace.onTimes[cell];
    return times.length >= MAX_FLASHES_PER_WINDOW
      ? times[times.length - MAX_FLASHES_PER_WINDOW] + WINDOW_MS
      : 0;
  });
  return Math.max(pace.time, ...limits);
}

function paceFrame(frames: readonly Frame[], pace: CellPace, index: number): CellPace {
  const count = frames.length;
  const previousIndex = (index - 1 + count) % count;
  const cells = turningOn(frames[previousIndex], frames[index]);
  const start = earliestStart(pace, cells);
  const extra = start - pace.time;
  const durations =
    extra > 0 ? pace.durations.map((ms, at) => (at === previousIndex ? ms + extra : ms)) : pace.durations;
  const lit = new Set(cells);
  const onTimes = pace.onTimes.map((times, cell) =>
    lit.has(cell) ? [...times.slice(1 - MAX_FLASHES_PER_WINDOW), start] : times,
  );
  return { durations, time: start + durations[index], onTimes };
}

/** Lengthens frames so no cell turns on more than 3 times in any second, counting the clip as a loop. */
export function limitCellFlashes(output: RecipeOutput): RecipeOutput {
  const { frames } = output;
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const passes = Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + EXTRA_PASSES;
  const indexes = Array.from({ length: passes }, () => frames.map((_, index) => index)).flat();
  const paced = indexes.reduce<CellPace>((pace, index) => paceFrame(frames, pace, index), {
    durations: output.durations,
    time: 0,
    onTimes: frames[0].map(() => []),
  });
  return { ...output, durations: [...paced.durations] };
}
