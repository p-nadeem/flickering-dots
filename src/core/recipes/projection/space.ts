import type { Frame, GridSize } from '../../types';
import { createFrameFromPoints, getLinePoints } from '../helpers';
import type { Point } from '../helpers';

/** A point in model space as `[x, y, z]`; z grows away from the viewer. */
export type Vec3 = readonly [x: number, y: number, z: number];

/** A straight edge between two model points. */
export type Edge = readonly [from: Vec3, to: Vec3];

/** Where model space lands on the grid: centre, shortest side and model-to-dot scale. */
export interface Viewport {
  cx: number;
  cy: number;
  side: number;
  scale: number;
}

/** Distance from the viewer to the model centre, in model units. */
export const VIEW_DISTANCE = 3.2;
const SCALE_PER_DOT = 0.29;

/** Centres model space on the grid and scales it by its shortest side. */
export function getViewport({ cols, rows }: GridSize): Viewport {
  const side = Math.min(cols, rows);
  return { cx: (cols - 1) / 2, cy: (rows - 1) / 2, side, scale: (side - 1) * SCALE_PER_DOT };
}

/** Turns a point about the vertical (Y) axis. */
export function rotateY([x, y, z]: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

/** Turns a point about the horizontal (X) axis. */
export function rotateX([x, y, z]: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

/** Turns about Y by `spin`, then tips about X by `tilt`. */
export function orient(point: Vec3, spin: number, tilt: number): Vec3 {
  return rotateX(rotateY(point, spin), tilt);
}

/** Perspective-projects a model point to the nearest dot. */
export function projectPoint([x, y, z]: Vec3, view: Viewport): Point {
  const factor = VIEW_DISTANCE / (VIEW_DISTANCE + z);
  return [Math.round(view.cx + x * view.scale * factor), Math.round(view.cy + y * view.scale * factor)];
}

/** Draws each edge as a one-dot line between its projected ends. */
export function drawEdges(grid: GridSize, edges: readonly Edge[]): Frame {
  const view = getViewport(grid);
  const points = edges.flatMap(([from, to]) =>
    getLinePoints(projectPoint(from, view), projectPoint(to, view)),
  );
  return createFrameFromPoints(grid, points);
}

/** Lights the dot under each projected model point. */
export function drawPoints(grid: GridSize, points: readonly Vec3[]): Frame {
  const view = getViewport(grid);
  return createFrameFromPoints(
    grid,
    points.map((point) => projectPoint(point, view)),
  );
}

/** Mixes two numbers; `t` of 0 gives `from`, 1 gives `to`. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Mixes two model points. */
export function lerpVec(from: Vec3, to: Vec3, t: number): Vec3 {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
}

/** Eases in and out: slow at both ends. */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Eases out: fast start, slow finish. */
export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** `count` evenly spaced fractions from `1 / count` to 1. */
export function steps(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) / count);
}

/** Lights every cell lit in any of the frames. */
export function overlay(...frames: readonly Frame[]): Frame {
  return frames[0].map((_, index) => (frames.some((frame) => frame[index] === 1) ? 1 : 0));
}

/** Moves every lit cell by `dx` columns and `dy` rows, dropping cells pushed off the grid. */
export function shiftFrame(frame: Frame, grid: GridSize, dx: number, dy: number): Frame {
  return frame.map((_, index) => {
    const x = (index % grid.cols) - dx;
    const y = Math.floor(index / grid.cols) - dy;
    const isInside = x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
    return isInside ? frame[y * grid.cols + x] : 0;
  });
}

function litExtent(frames: readonly Frame[], length: number, position: (index: number) => number) {
  const lit = frames.flatMap((frame) => frame.flatMap((bit, index) => (bit === 1 ? [position(index)] : [])));
  return lit.length === 0
    ? { before: 0, after: 0 }
    : { before: Math.min(...lit), after: length - 1 - Math.max(...lit) };
}

function centringShift({ before, after }: { before: number; after: number }): number {
  return Math.floor((before + after) / 2) - before;
}

/** The one shift that centres everything lit across `frames`, with any odd spare dot after it. */
export function getCentringShift(grid: GridSize, frames: readonly Frame[]): Point {
  const across = litExtent(frames, grid.cols, (index) => index % grid.cols);
  const down = litExtent(frames, grid.rows, (index) => Math.floor(index / grid.cols));
  return [centringShift(across), centringShift(down)];
}
