import type { Frame, GridSize } from '../../types';
import { createFrame, getCentre } from '../helpers';

/** Lattice of the corridor on a grid: the centre, the smallest half-extent per axis and the ring count. */
export interface CorridorGeometry {
  cx: number;
  cy: number;
  startX: number;
  startY: number;
  spanX: number;
  spanY: number;
  span: number;
}

/** One square ring: its centre and half-extents, all on the dot lattice. */
export interface Ring {
  ox: number;
  oy: number;
  hx: number;
  hy: number;
}

/** Offset of the vanishing point from the centre, in dots. */
export interface Drift {
  dx: number;
  dy: number;
}

const EVEN_START = 0.5;
const SMALL_GAP = 2;
const LARGE_GAP = 3;
const SMALL_GAP_MAX_SIDE = 4;
const DRIFT_MIN_SIDE = 9;
const DRIFT = 1;
const NO_DRIFT: Drift = { dx: 0, dy: 0 };

/** Ring lattice of `grid`: ring 0 is the centre dot (2 dots wide on an even side) and ring `span` the edge. */
export function getCorridorGeometry(grid: GridSize): CorridorGeometry {
  const { cx, cy } = getCentre(grid);
  const startX = grid.cols % 2 === 0 ? EVEN_START : 0;
  const startY = grid.rows % 2 === 0 ? EVEN_START : 0;
  const spanX = cx - startX;
  const spanY = cy - startY;
  return { cx, cy, startX, startY, spanX, spanY, span: Math.max(spanX, spanY) };
}

/** Rings between two neighbours in one frame: 2 up to a 4-dot short side, else 3, so each step shows a new ring phase. */
export function corridorGap(grid: GridSize): number {
  return Math.min(grid.cols, grid.rows) <= SMALL_GAP_MAX_SIDE ? SMALL_GAP : LARGE_GAP;
}

/** Radius of the vanishing point's circle: 1 dot from a 9-dot short side, else 0. */
export function corridorDrift(grid: GridSize): number {
  return Math.min(grid.cols, grid.rows) >= DRIFT_MIN_SIDE ? DRIFT : 0;
}

/** Ring `step` of the corridor, its centre pulled toward `drift` the farther away it is. */
export function ringAt(geometry: CorridorGeometry, step: number, drift: Drift = NO_DRIFT): Ring {
  const { cx, cy, startX, startY, spanX, spanY, span } = geometry;
  const far = 1 - step / (span + 1);
  return {
    ox: cx + Math.round(far * drift.dx),
    oy: cy + Math.round(far * drift.dy),
    hx: startX + Math.round((step * spanX) / span),
    hy: startY + Math.round((step * spanY) / span),
  };
}

/** Ring steps shown in a frame: every `gap`-th step from `phase` out to one step past the edge. */
export function ringSteps(geometry: CorridorGeometry, phase: number, gap: number): number[] {
  const first = ((phase % gap) + gap) % gap;
  const count = Math.floor((geometry.span + 1 - first) / gap) + 1;
  return Array.from({ length: count }, (_, index) => first + index * gap);
}

function isOnRing({ ox, oy, hx, hy }: Ring, x: number, y: number): boolean {
  const dx = Math.abs(x - ox);
  const dy = Math.abs(y - oy);
  return (dx === hx && dy <= hy) || (dy === hy && dx <= hx);
}

/** Draws the outlines of the rings. */
export function drawRings(grid: GridSize, rings: readonly Ring[]): Frame {
  return createFrame(grid, (x, y) => rings.some((ring) => isOnRing(ring, x, y)));
}
