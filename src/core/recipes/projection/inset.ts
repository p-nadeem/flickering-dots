import type { Frame, GridSize } from '../../types';
import { generateCheck } from '../check';
import { generateCross } from '../cross';

const STROKE_MS = 45;

/** Frames of a drawing plus their durations. */
export interface DrawnClip {
  frames: Frame[];
  durations: number[];
}

/** The square left inside the grid's shortest side once `inset` dots are kept clear all round. */
export function innerSquare(grid: GridSize, inset: number): GridSize {
  const side = Math.max(1, Math.min(grid.cols, grid.rows) - 2 * inset);
  return { cols: side, rows: side };
}

/** Places a frame drawn on a smaller grid at the centre of `grid`. */
export function placeCentred(inner: Frame, innerGrid: GridSize, grid: GridSize): Frame {
  const left = Math.floor((grid.cols - innerGrid.cols) / 2);
  const top = Math.floor((grid.rows - innerGrid.rows) / 2);
  return Array.from({ length: grid.cols * grid.rows }, (_, index) => {
    const x = (index % grid.cols) - left;
    const y = Math.floor(index / grid.cols) - top;
    const isInside = x >= 0 && y >= 0 && x < innerGrid.cols && y < innerGrid.rows;
    return isInside ? inner[y * innerGrid.cols + x] : 0;
  });
}

/** The check recipe's strokes drawn cell by cell inside a square `inset` dots in from the shortest side. */
export function insetCheckStrokes(grid: GridSize, inset: number): DrawnClip {
  const innerGrid = innerSquare(grid, inset);
  const frames = generateCheck(innerGrid)
    .frames.slice(1)
    .map((frame) => placeCentred(frame, innerGrid, grid));
  return { frames, durations: frames.map(() => STROKE_MS) };
}

/** The cross recipe's strokes and shake inside a square `inset` dots in from the shortest side. */
export function insetCrossStrokes(grid: GridSize, inset: number): DrawnClip {
  const innerGrid = innerSquare(grid, inset);
  const cross = generateCross(innerGrid);
  return {
    frames: cross.frames.map((frame) => placeCentred(frame, innerGrid, grid)),
    durations: cross.durations,
  };
}
