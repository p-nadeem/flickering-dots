import type { Frame } from '../types';

const BIG_CHANGE_SHARE = 0.2;

/** Shortest time between two frame changes of a fifth of the grid, so no second holds more than six (WCAG 2.3.1). */
export const MIN_BIG_CHANGE_GAP_MS = 170;

function isBigChange(previous: Frame, next: Frame): boolean {
  const changed = next.reduce<number>((total, bit, cell) => total + (bit === previous[cell] ? 0 : 1), 0);
  return changed >= BIG_CHANGE_SHARE * next.length;
}

function bigChangeIndices(frames: readonly Frame[], isLoop: boolean): number[] {
  const count = frames.length;
  return frames.flatMap((frame, index) => {
    if (index === 0 && !isLoop) return [];
    return isBigChange(frames[(index - 1 + count) % count], frame) ? [index] : [];
  });
}

function stretchBefore(spaced: readonly number[], from: number, at: number): number[] {
  const count = spaced.length;
  const gap = Array.from({ length: at - from }, (_, step) => spaced[(from + step + count) % count]).reduce(
    (sum, ms) => sum + ms,
    0,
  );
  const before = (at - 1 + count) % count;
  return spaced.map((ms, index) => (index === before ? ms + Math.max(0, MIN_BIG_CHANGE_GAP_MS - gap) : ms));
}

/** Lengthens the frame before each big change so big changes sit at least `MIN_BIG_CHANGE_GAP_MS` apart; a loop counts its seam. */
export function spaceBigChanges(
  frames: readonly Frame[],
  durations: readonly number[],
  isLoop: boolean,
): number[] {
  const bigs = bigChangeIndices(frames, isLoop);
  return bigs.reduce<number[]>(
    (spaced, at, order) => {
      if (order === 0 && !isLoop) return spaced;
      const from = order === 0 ? bigs[bigs.length - 1] - frames.length : bigs[order - 1];
      return stretchBefore(spaced, from, at);
    },
    [...durations],
  );
}
