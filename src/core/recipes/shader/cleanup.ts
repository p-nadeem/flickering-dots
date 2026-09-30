import { framesEqual } from '../../frame';
import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import { isLitAt } from './shared';

const SIDES = [1, -1] as const;
const SPUR_MAX_NEIGHBOURS = 1;
const CORNER_REACH = 3;
const MAX_SPUR_PASSES = 4;
const AROUND = [-1, 0, 1]
  .flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const))
  .filter(([dx, dy]) => dx !== 0 || dy !== 0);

function litSides(frame: Frame, grid: GridSize, x: number, y: number, isHorizontal: boolean): number[] {
  return SIDES.filter((side) =>
    isHorizontal ? isLitAt(frame, grid, x + side, y) : isLitAt(frame, grid, x, y + side),
  );
}

function isSpur(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  const count = litSides(frame, grid, x, y, true).length + litSides(frame, grid, x, y, false).length;
  return count <= SPUR_MAX_NEIGHBOURS;
}

function isBoxCorner(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  const across = litSides(frame, grid, x, y, true);
  const down = litSides(frame, grid, x, y, false);
  if (across.length !== 1 || down.length !== 1) return false;
  const [dx] = across;
  const [dy] = down;
  const hasLongEdges =
    isLitAt(frame, grid, x + CORNER_REACH * dx, y) && isLitAt(frame, grid, x, y + CORNER_REACH * dy);
  const isOpenOutside = !isLitAt(frame, grid, x + dx, y - dy) && !isLitAt(frame, grid, x - dx, y + dy);
  return hasLongEdges && isOpenOutside;
}

function dropSpurs(frame: Frame, grid: GridSize, pass: number): Frame {
  const kept = createFrame(grid, (x, y) => isLitAt(frame, grid, x, y) && !isSpur(frame, grid, x, y));
  if (pass >= MAX_SPUR_PASSES || framesEqual(kept, frame)) return kept;
  return dropSpurs(kept, grid, pass + 1);
}

/** Rounds blobs: drops dots that stick out on a single neighbour, then the square corners of blocks at least four dots wide and tall. */
export function smoothBlobs(frame: Frame, grid: GridSize): Frame {
  const trimmed = dropSpurs(frame, grid, 1);
  return createFrame(grid, (x, y) => isLitAt(trimmed, grid, x, y) && !isBoxCorner(trimmed, grid, x, y));
}

/** Drops lit dots that touch no other lit dot, diagonals included. */
export function dropIsolated(frame: Frame, grid: GridSize): Frame {
  return createFrame(
    grid,
    (x, y) => isLitAt(frame, grid, x, y) && AROUND.some(([dx, dy]) => isLitAt(frame, grid, x + dx, y + dy)),
  );
}
