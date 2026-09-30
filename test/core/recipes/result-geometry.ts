import type { Frame, GridSize } from '../../../src/core/types';

export type Cell = readonly [x: number, y: number];

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const GRID_MIN = 3;
const GRID_MAX = 16;
const INSET_MIN_SIDE = 7;
const WINDOW_MS = 1000;
const MAX_FLASHES_PER_WINDOW = 3;
const CHANGES_PER_FLASH = 2;

export const ALL_GRIDS: readonly GridSize[] = Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, colIndex) =>
  Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (__, rowIndex) => ({
    cols: GRID_MIN + colIndex,
    rows: GRID_MIN + rowIndex,
  })),
).flat();

export function gridLabel({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function labelled(grids: readonly GridSize[]): (readonly [string, GridSize])[] {
  return grids.map((grid) => [gridLabel(grid), grid] as const);
}

export function litCells(frame: Frame, cols: number): Cell[] {
  return frame.flatMap((bit, index): Cell[] => (bit === 1 ? [[index % cols, Math.floor(index / cols)]] : []));
}

export function boundingBox(cells: readonly Cell[]): Box {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left + 1, height: Math.max(...ys) - top + 1 };
}

export function expectedInset({ cols, rows }: GridSize): number {
  return Math.min(cols, rows) >= INSET_MIN_SIDE ? 1 : 0;
}

export function expectedSide(grid: GridSize): number {
  const side = Math.min(grid.cols, grid.rows) - 2 * expectedInset(grid);
  const isExactlyCentred = (grid.cols - side) % 2 === 0 && (grid.rows - side) % 2 === 0;
  return side % 2 === 1 || isExactlyCentred ? side : side - 1;
}

export function centredStart(space: number, extent: number): number {
  return Math.floor((space - extent) / 2);
}

export function lowCentredStart(space: number, extent: number): number {
  return Math.ceil((space - extent) / 2);
}

function isBlank(frame: Frame): boolean {
  return frame.every((bit) => bit === 0);
}

function blankChangeTimes(frames: readonly Frame[], durations: readonly number[]): number[] {
  const starts = durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
  return frames
    .slice(1)
    .flatMap((frame, index) => (isBlank(frame) !== isBlank(frames[index]) ? [starts[index + 1]] : []));
}

export function maxFlashesPerSecond(frames: readonly Frame[], durations: readonly number[]): number {
  const times = blankChangeTimes(frames, durations);
  const counts = times.map(
    (start) => times.filter((time) => time >= start && time < start + WINDOW_MS).length,
  );
  return Math.max(0, ...counts) / CHANGES_PER_FLASH;
}

export function countBlinks(frames: readonly Frame[]): number {
  return frames.slice(1).filter((frame, index) => isBlank(frame) && !isBlank(frames[index])).length;
}

export { MAX_FLASHES_PER_WINDOW };
