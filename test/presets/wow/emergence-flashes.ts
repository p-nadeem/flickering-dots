import type { Clip, Frame } from '../../../src/core/types';

const WINDOW_MS = 1000;
const BIG_CHANGE_SHARE = 0.2;

function countChanged(left: Frame, right: Frame): number {
  return left.reduce<number>((sum, bit, cell) => (bit === right[cell] ? sum : sum + 1), 0);
}

function getStartTimes(durations: readonly number[]): number[] {
  return durations.reduce<number[]>(
    (starts, _, index) => [...starts, index === 0 ? 0 : starts[index - 1] + durations[index - 1]],
    [],
  );
}

function getBigChangeTimes(clip: Clip, isLooping: boolean): number[] {
  const limit = BIG_CHANGE_SHARE * clip.cols * clip.rows;
  const starts = getStartTimes(clip.durations);
  return clip.frames.flatMap((frame, index) => {
    if (index === 0 && !isLooping) return [];
    const previous = clip.frames[(index - 1 + clip.frames.length) % clip.frames.length];
    return countChanged(previous, frame) >= limit ? [starts[index]] : [];
  });
}

function getBusiestWindow(times: readonly number[]): number {
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

export function countPeakBigChanges(clip: Clip, isLooping: boolean): number {
  if (clip.frames.length < 2) return 0;
  const once = getBigChangeTimes(clip, isLooping);
  const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);
  const loops = isLooping ? Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1 : 1;
  const times = Array.from({ length: loops }, (_, loop) => once.map((t) => t + loop * loopMs)).flat();
  return getBusiestWindow(times);
}
