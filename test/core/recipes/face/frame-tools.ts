import type { Frame, GridSize } from '../../../../src/core/types';

const BIG_CHANGE_SHARE = 0.2;
const WINDOW_MS = 1000;

export interface Timeline {
  frames: readonly Frame[];
  durations: readonly number[];
}

export function toArt(frame: Frame, cols: number): string[] {
  const rows = Math.ceil(frame.length / cols);
  return Array.from({ length: rows }, (_, y) =>
    frame
      .slice(y * cols, (y + 1) * cols)
      .map((bit) => (bit === 1 ? '#' : '.'))
      .join(''),
  );
}

export function changedCells(a: Frame, b: Frame): number {
  return a.filter((bit, index) => bit !== b[index]).length;
}

export function mirrorFrame(frame: Frame, cols: number): Frame {
  return frame.map((_, index) => frame[index - (index % cols) + cols - 1 - (index % cols)]);
}

export function isBigChange(a: Frame, b: Frame): boolean {
  return changedCells(a, b) >= BIG_CHANGE_SHARE * a.length;
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
}

export function unroll(clip: Timeline, laps: number): Timeline {
  return {
    frames: Array.from({ length: laps }, () => clip.frames).flat(),
    durations: Array.from({ length: laps }, () => clip.durations).flat(),
  };
}

export function bigChangeTimes(timeline: Timeline, entry?: Frame): number[] {
  const starts = startTimes(timeline.durations);
  return timeline.frames.flatMap((frame, index) => {
    const previous = index === 0 ? entry : timeline.frames[index - 1];
    return previous !== undefined && isBigChange(previous, frame) ? [starts[index]] : [];
  });
}

export function mostBigChangesPerSecond(timeline: Timeline, entry?: Frame): number {
  const times = bigChangeTimes(timeline, entry);
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

export function gridsBetween(min: GridSize, max: GridSize): GridSize[] {
  return Array.from({ length: max.cols - min.cols + 1 }, (_, colIndex) =>
    Array.from({ length: max.rows - min.rows + 1 }, (__, rowIndex) => ({
      cols: min.cols + colIndex,
      rows: min.rows + rowIndex,
    })),
  ).flat();
}
