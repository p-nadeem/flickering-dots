import { wrapIndex } from '../helpers';
import type { Centre, Point } from '../helpers';

interface Run {
  first: number;
  size: number;
}

function stepLength(a: Point, b: Point): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function isCorner(path: readonly Point[], index: number): boolean {
  const before = path[wrapIndex(index - 1, path.length)];
  const after = path[wrapIndex(index + 1, path.length)];
  const cell = path[index];
  const isDiagonal = Math.abs(before[0] - after[0]) === 1 && Math.abs(before[1] - after[1]) === 1;
  return isDiagonal && stepLength(before, cell) === 1 && stepLength(after, cell) === 1;
}

function cornerRuns(corners: readonly boolean[], start: number): Run[] {
  const order = corners.map((_, step) => wrapIndex(start + step, corners.length));
  return order.reduce<Run[]>((runs, index, step) => {
    if (!corners[index]) return runs;
    const last = runs[runs.length - 1];
    const continues = step > 0 && corners[order[step - 1]] && last !== undefined;
    if (continues) return [...runs.slice(0, -1), { first: last.first, size: last.size + 1 }];
    return [...runs, { first: index, size: 1 }];
  }, []);
}

function spread(path: readonly Point[], indexes: readonly number[], { cx, cy }: Centre): number {
  return indexes.reduce((total, index) => total + Math.hypot(path[index][0] - cx, path[index][1] - cy), 0);
}

function removedFromRun(path: readonly Point[], { first, size }: Run, pivot: Centre): number[] {
  const at = (offset: number): number => wrapIndex(first + offset, path.length);
  const offsets = Array.from({ length: size }, (_, offset) => offset);
  if (size % 2 === 1) return offsets.filter((offset) => offset % 2 === 0).map(at);
  const even = offsets.filter((offset) => offset % 2 === 0).map(at);
  const odd = offsets.filter((offset) => offset % 2 === 1).map(at);
  const difference = spread(path, even, pivot) - spread(path, odd, pivot);
  if (Math.abs(difference) < Number.EPSILON * size) return [];
  return difference > 0 ? even : odd;
}

/** Removes every other elbow cell of each run of L-shaped steps so strokes stay one dot thin; in an even run the cells farther from `pivot` go, so mirror images thin alike. */
export function thinCorners(path: readonly Point[], pivot: Centre): Point[] {
  const corners = path.map((_, index) => path.length > 2 && isCorner(path, index));
  const start = corners.indexOf(false);
  if (start < 0) return [...path];
  const removed = new Set(cornerRuns(corners, start).flatMap((run) => removedFromRun(path, run, pivot)));
  return path.filter((_, index) => !removed.has(index));
}
