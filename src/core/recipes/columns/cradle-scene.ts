import type { Frame, GridSize } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point } from '../helpers';
import type { Shot } from './clip-merge';

const BALLS = 5;
const SIDE_MARGIN = 2;
const MAX_REACH = 2;
const RISE_MS = [60, 110] as const;
const APEX_MS = 280;
const CLACK_MS = 40;

/** Which end ball swings: 1 for the right end, -1 for the left end. */
export type Side = 1 | -1;

/** Where the cradle sits: the ball row, its first column, the ball count and how far an end ball swings. */
export interface CradleLayout {
  row: number;
  left: number;
  count: number;
  reach: number;
}

/** Five balls centred on a row (fewer on narrow grids), with the swing room centred above them and any odd spare row above. */
export function cradleLayout(grid: GridSize): CradleLayout {
  const count = Math.min(BALLS, Math.max(1, grid.cols - SIDE_MARGIN));
  const left = Math.floor((grid.cols - count) / 2);
  const reach = Math.max(1, Math.min(left, grid.rows - 1, MAX_REACH));
  const top = Math.ceil((grid.rows - (reach + 1)) / 2);
  return { row: top + reach, left, count, reach };
}

/** The end ball's column on `side`. */
export function endColumn(layout: CradleLayout, side: Side): number {
  return side > 0 ? layout.left + layout.count - 1 : layout.left;
}

/** The balls at rest, leaving out the end ball on `without` when given. */
export function restPoints(layout: CradleLayout, without?: Side): Point[] {
  const skip = without === undefined ? -1 : endColumn(layout, without);
  return Array.from({ length: layout.count }, (_, index): Point => [layout.left + index, layout.row]).filter(
    ([x]) => x !== skip,
  );
}

/** The frame with the end ball on `side` lifted `lift` cells along its diagonal arc. */
export function swingFrame(grid: GridSize, layout: CradleLayout, side: Side, lift: number): Frame {
  if (lift === 0) return createFrameFromPoints(grid, restPoints(layout));
  const ball: Point = [endColumn(layout, side) + side * lift, layout.row - lift];
  return createFrameFromPoints(grid, [...restPoints(layout, side), ball]);
}

function liftMs(lift: number, height: number): number {
  return lift === height ? APEX_MS : RISE_MS[lift - 1];
}

/** One swing out to `height` and back on `side`, ending on the clack frame with all balls in the row. */
export function swingShots(grid: GridSize, layout: CradleLayout, side: Side, height: number): Shot[] {
  const up = Array.from({ length: height }, (_, index) => index + 1);
  const lifts = [...up, ...up.slice(0, -1).reverse()];
  return [
    ...lifts.map((lift) => ({ frame: swingFrame(grid, layout, side, lift), ms: liftMs(lift, height) })),
    { frame: swingFrame(grid, layout, side, 0), ms: CLACK_MS },
  ];
}
