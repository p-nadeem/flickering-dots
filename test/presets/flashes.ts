import type { Clip, Frame } from '../../src/core/types';

const WINDOW_MS = 1000;

function getStartTimes(durations: readonly number[]): number[] {
  return durations.reduce<number[]>((starts, _, index) => {
    const previous = index === 0 ? 0 : (starts[index - 1] ?? 0) + (durations[index - 1] ?? 0);
    return [...starts, previous];
  }, []);
}

function getOnTimes(frames: readonly Frame[], starts: readonly number[], cell: number): number[] {
  return frames.flatMap((frame, index) => {
    const previous = frames[(index - 1 + frames.length) % frames.length];
    return frame[cell] === 1 && previous?.[cell] === 0 ? [starts[index] ?? 0] : [];
  });
}

function getBusiestWindow(times: readonly number[]): number {
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

export function countPeakFlashesPerSecond(clip: Clip): number {
  const starts = getStartTimes(clip.durations);
  const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);
  const cells = clip.frames[0]?.length ?? 0;
  const perCell = Array.from({ length: cells }, (_, cell) => {
    const once = getOnTimes(clip.frames, starts, cell);
    const loops = Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1;
    const sampled = Array.from({ length: loops }, (_, loop) => once.map((t) => t + loop * loopMs));
    return getBusiestWindow(sampled.flat());
  });
  return Math.max(0, ...perCell);
}
