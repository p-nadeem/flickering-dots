import type { GridSize } from '../../types';
import { getLinePoints, wrapIndex } from '../helpers';
import type { Point } from '../helpers';
import { isSamePoint } from './shots';

const LARGE_PAD = 3;
const SMALL_PAD = 2;
const LARGE_PAD_MIN_COLS = 9;
const LARGE_PAD_MIN_ROWS = 7;
const MARGIN_MIN_ROWS = 7;
const ZIGZAG_THIRDS = 3;

/** The square pad the trace runs into, at the right edge. */
export interface Pad {
  left: number;
  top: number;
  size: number;
}

/** The ordered trace cells from the left edge to the pad, and the pad. */
export interface CircuitLayout {
  trace: readonly Point[];
  pad: Pad;
}

/** Trace shapes in the order a seed offset picks them. */
export const TRACE_SHAPES = ['s', 'l', 'zigzag'] as const;

type TraceShape = (typeof TRACE_SHAPES)[number];

interface Anchors {
  margin: number;
  pad: Pad;
  entryY: number;
  entryX: number;
}

function padFor({ cols, rows }: GridSize, margin: number): Pad {
  const size = cols >= LARGE_PAD_MIN_COLS && rows >= LARGE_PAD_MIN_ROWS ? LARGE_PAD : SMALL_PAD;
  return { left: cols - size, top: rows - margin - size, size };
}

function anchorsFor(grid: GridSize): Anchors {
  const margin = grid.rows >= MARGIN_MIN_ROWS ? 1 : 0;
  const pad = padFor(grid, margin);
  return { margin, pad, entryY: pad.top + Math.floor((pad.size - 1) / 2), entryX: pad.left - 1 };
}

function sWaypoints({ margin, entryY, entryX }: Anchors): Point[] {
  const bend = Math.round(entryX / 2);
  return [
    [0, margin],
    [bend, margin],
    [bend, entryY],
    [entryX, entryY],
  ];
}

function lWaypoints({ margin, pad }: Anchors): Point[] {
  const column = pad.left + Math.floor((pad.size - 1) / 2);
  return [
    [0, margin],
    [column, margin],
    [column, Math.max(margin, pad.top - 1)],
  ];
}

function zigzagWaypoints(anchors: Anchors): Point[] | undefined {
  const { margin, entryY, entryX } = anchors;
  const first = Math.round(entryX / ZIGZAG_THIRDS);
  const second = Math.round((2 * entryX) / ZIGZAG_THIRDS);
  const middle = Math.round((margin + entryY) / 2);
  const fits = margin < middle && middle < entryY && first > 0 && first + 1 < second && second < entryX;
  if (!fits) return undefined;
  return [
    [0, margin],
    [first, margin],
    [first, middle],
    [second, middle],
    [second, entryY],
    [entryX, entryY],
  ];
}

function waypointsFor(shape: TraceShape, anchors: Anchors): Point[] {
  if (shape === 'l') return lWaypoints(anchors);
  if (shape === 'zigzag') return zigzagWaypoints(anchors) ?? sWaypoints(anchors);
  return sWaypoints(anchors);
}

function rasterize(waypoints: readonly Point[]): Point[] {
  return waypoints
    .slice(1)
    .reduce<Point[]>(
      (cells, to, index) => [...cells, ...getLinePoints(waypoints[index], to).slice(1)],
      [waypoints[0]],
    );
}

function withoutRepeats(cells: readonly Point[]): Point[] {
  return cells.filter((cell, index) => index === 0 || !isSamePoint(cell, cells[index - 1]));
}

/** The trace and pad for a grid; `shapeIndex` picks from `TRACE_SHAPES`, wrapping. */
export function getCircuitLayout(grid: GridSize, shapeIndex: number): CircuitLayout {
  const anchors = anchorsFor(grid);
  const shape = TRACE_SHAPES[wrapIndex(Math.trunc(shapeIndex), TRACE_SHAPES.length)];
  return { trace: withoutRepeats(rasterize(waypointsFor(shape, anchors))), pad: anchors.pad };
}

function padCells({ left, top, size }: Pad): Point[] {
  return Array.from({ length: size * size }, (_, index): Point => [
    left + (index % size),
    top + Math.floor(index / size),
  ]);
}

/** The pad's outline cells. */
export function padRing(pad: Pad): Point[] {
  const last = pad.size - 1;
  return padCells(pad).filter(
    ([x, y]) => x === pad.left || y === pad.top || x === pad.left + last || y === pad.top + last,
  );
}

/** Every cell of the pad. */
export function padSolid(pad: Pad): Point[] {
  return padCells(pad);
}
