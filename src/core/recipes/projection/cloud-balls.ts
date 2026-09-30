import type { Frame, GridSize } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point } from '../helpers';
import { VIEW_DISTANCE, getViewport } from './space';
import type { Vec3 } from './space';

const NEAR_DEPTH = -0.45;
const LIFT = 0.25;
const BALL_OFFSETS: readonly Point[] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

function ballCells(grid: GridSize, [x, y, z]: Vec3): Point[] {
  const view = getViewport(grid);
  const factor = VIEW_DISTANCE / (VIEW_DISTANCE + z);
  const px = view.cx + x * view.scale * factor;
  const py = view.cy + (y * factor - LIFT) * view.scale;
  if (z >= NEAR_DEPTH) return [[Math.round(px), Math.round(py)]];
  const left = Math.round(px - 0.5);
  const top = Math.round(py - 0.5);
  return BALL_OFFSETS.map(([dx, dy]): Point => [left + dx, top + dy]);
}

/** Lights each placed point as a 2x2 ball when it is near the viewer and a single dot when it is far. */
export function drawBalls(grid: GridSize, points: readonly Vec3[]): Frame {
  return createFrameFromPoints(
    grid,
    points.flatMap((point) => ballCells(grid, point)),
  );
}
