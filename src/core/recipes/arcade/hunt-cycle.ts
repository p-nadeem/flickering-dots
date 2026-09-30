import type { GridSize } from '../../types';
import type { Point } from '../helpers';

function range(from: number, to: number): number[] {
  const step = to >= from ? 1 : -1;
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, index) => from + index * step);
}

function evenRowsCycle(cols: number, rows: number): Point[] {
  const top = range(0, cols - 1).map((x): Point => [x, 0]);
  const zigzag = range(1, rows - 1).flatMap((y) =>
    (y % 2 === 1 ? range(cols - 1, 1) : range(1, cols - 1)).map((x): Point => [x, y]),
  );
  const back = range(rows - 1, 1).map((y): Point => [0, y]);
  return [...top, ...zigzag, ...back];
}

function spliceLastRow(cycle: readonly Point[], cols: number, rows: number): Point[] {
  const aboveRow = rows - 2;
  return cycle.flatMap(([x, y]): Point[] => {
    const isPairStart = y === aboveRow && x % 2 === 1 && x <= cols - 2;
    return isPairStart
      ? [
          [x, y],
          [x, rows - 1],
          [x - 1, rows - 1],
        ]
      : [[x, y]];
  });
}

/** A closed path through every cell (every cell but the bottom-right corner when both sides are odd), starting at the top-left. */
export function getHuntCycle({ cols, rows }: GridSize): Point[] {
  if (rows % 2 === 0) return evenRowsCycle(cols, rows);
  if (cols % 2 === 0) return evenRowsCycle(rows, cols).map(([x, y]): Point => [y, x]);
  return spliceLastRow(evenRowsCycle(cols, rows - 1), cols, rows);
}
