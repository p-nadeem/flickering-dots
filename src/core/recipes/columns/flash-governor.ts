import type { Frame } from '../../types';
import type { Shot } from './clip-merge';

const WINDOW_MS = 1000;
const MAX_CELL_RISES = 3;
const MAX_BIG_CHANGES = 6;
const BIG_CHANGE_SHARE = 0.2;

interface Walk {
  durations: number[];
  now: number;
  rises: readonly (readonly number[])[];
  bigs: readonly number[];
}

function delayFor(times: readonly number[], limit: number, now: number): number {
  if (times.length < limit) return 0;
  return Math.max(0, times[times.length - limit] + WINDOW_MS - now);
}

function risingCells(previous: Frame, next: Frame): number[] {
  return next.flatMap((bit, cell) => (bit === 1 && previous[cell] === 0 ? [cell] : []));
}

function isBigChange(previous: Frame, next: Frame): boolean {
  const changed = next.reduce<number>((total, bit, cell) => total + (bit === previous[cell] ? 0 : 1), 0);
  return changed >= BIG_CHANGE_SHARE * next.length;
}

function step(walk: Walk, previous: Frame, next: Frame, index: number): Walk {
  const rising = risingCells(previous, next);
  const isBig = isBigChange(previous, next);
  const now = walk.now + walk.durations[index - 1];
  const delay = Math.max(
    isBig ? delayFor(walk.bigs, MAX_BIG_CHANGES, now) : 0,
    ...rising.map((cell) => delayFor(walk.rises[cell], MAX_CELL_RISES, now)),
  );
  const at = now + delay;
  const risingSet = new Set(rising);
  return {
    durations: walk.durations.map((ms, position) => (position === index - 1 ? ms + delay : ms)),
    now: at,
    rises: walk.rises.map((times, cell) => (risingSet.has(cell) ? [...times, at] : times)),
    bigs: isBig ? [...walk.bigs, at] : walk.bigs,
  };
}

function walkShots(shots: readonly Shot[]): number[] {
  const start: Walk = {
    durations: shots.map((shot) => shot.ms),
    now: 0,
    rises: shots[0].frame.map((bit) => (bit === 1 ? [0] : [])),
    bigs: [],
  };
  const walked = shots
    .slice(1)
    .reduce((walk, shot, offset) => step(walk, shots[offset].frame, shot.frame, offset + 1), start);
  return walked.durations;
}

/** Lengthens frames where needed so no cell turns on more than 3 times, and at most 6 changes of 20 percent or more of the grid happen, in any 1 s. */
export function governFlashes(shots: readonly Shot[], isLoop: boolean): Shot[] {
  if (shots.length < 2) return [...shots];
  if (!isLoop) {
    const durations = walkShots(shots);
    return shots.map((shot, index) => ({ frame: shot.frame, ms: durations[index] }));
  }
  const durations = walkShots([...shots, ...shots, shots[0]]).slice(shots.length, 2 * shots.length);
  return shots.map((shot, index) => ({ frame: shot.frame, ms: durations[index] }));
}
