import type { Frame, GridSize } from '../../types';
import { wrapIndex } from '../helpers';

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function getNeighbours(cell: number, grid: GridSize): number[] {
  const x = cell % grid.cols;
  const y = Math.floor(cell / grid.cols);
  return STEPS.map(([dx, dy]) => wrapIndex(y + dy, grid.rows) * grid.cols + wrapIndex(x + dx, grid.cols));
}

function flood(frame: Frame, grid: GridSize, start: number, seen: ReadonlySet<number>): Set<number> {
  const reached = new Set<number>([...seen, start]);
  const queue = [start];
  while (queue.length > 0) {
    const cell = queue.pop() ?? start;
    const fresh = getNeighbours(cell, grid).filter((next) => frame[next] === 1 && !reached.has(next));
    fresh.forEach((next) => reached.add(next));
    queue.push(...fresh);
  }
  return reached;
}

/** Number of separate lit blobs, joined orthogonally across the wrapping edges. */
export function countSpots(frame: Frame, grid: GridSize): number {
  return frame.reduce<{ seen: ReadonlySet<number>; count: number }>(
    (state, bit, cell) => {
      if (bit === 0 || state.seen.has(cell)) return state;
      return { seen: flood(frame, grid, cell, state.seen), count: state.count + 1 };
    },
    { seen: new Set<number>(), count: 0 },
  ).count;
}
