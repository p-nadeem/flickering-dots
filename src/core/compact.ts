import { framesEqual } from './frame';
import type { Clip } from './types';

interface Run {
  start: number;
  duration: number;
}

function toRuns({ frames, durations }: Clip): Run[] {
  return frames.reduce<Run[]>((runs, frame, index) => {
    const last = runs[runs.length - 1];
    if (last !== undefined && framesEqual(frames[last.start], frame)) {
      return [...runs.slice(0, -1), { start: last.start, duration: last.duration + durations[index] }];
    }
    return [...runs, { start: index, duration: durations[index] }];
  }, []);
}

function runIndexOf(runs: readonly Run[], frame: number): number {
  return runs.reduce((found, run, index) => (run.start <= frame ? index : found), 0);
}

/** Joins equal neighbouring frames of a clip into one frame holding their summed duration. */
export function mergeEqualNeighbours(clip: Clip): Clip {
  const runs = toRuns(clip);
  if (runs.length === clip.frames.length) return clip;
  const { still, ...rest } = clip;
  return {
    ...rest,
    frames: runs.map((run) => clip.frames[run.start]),
    durations: runs.map((run) => run.duration),
    ...(still === undefined ? {} : { still: runIndexOf(runs, still) }),
  };
}

/** For a looping clip whose last frame equals its first, drops the last frame and adds its time to the first. */
export function foldLoopSeam(clip: Clip): Clip {
  const last = clip.frames.length - 1;
  if (last < 1 || !framesEqual(clip.frames[last], clip.frames[0])) return clip;
  const { still, ...rest } = clip;
  return {
    ...rest,
    frames: clip.frames.slice(0, last),
    durations: clip.durations
      .slice(0, last)
      .map((ms, index) => (index === 0 ? ms + clip.durations[last] : ms)),
    ...(still === undefined ? {} : { still: still === last ? 0 : still }),
  };
}
