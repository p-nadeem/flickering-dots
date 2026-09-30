import type { GridSize, RecipeParams } from '../types';
import { createFrame, getCentre } from './helpers';
import type { Centre, RecipeOutput } from './helpers';

const BEAT_MS = 80;
const REST_MS = BEAT_MS * 6;
const PEAK_MS = BEAT_MS * 5;
const HALF_CELL = 0.5;
const TOLERANCE = 0.01;
const LENGTH_SCALE = 5;

/** Default params of the `pulse` recipe; `length` 5 reaches the edge of the grid. */
export const PULSE_DEFAULTS = { length: 5 } as const satisfies RecipeParams;

function isOnRing(centre: Centre, x: number, y: number, ring: number, hasDiagonals: boolean): boolean {
  const dx = Math.abs(x - centre.cx);
  const dy = Math.abs(y - centre.cy);
  if (ring === 0) return dx <= HALF_CELL && dy <= HALF_CELL;
  const isWithinRing = Math.max(dx, dy) <= ring + TOLERANCE;
  const isOnAxis = dx <= HALF_CELL || dy <= HALF_CELL;
  const isOnDiagonal = hasDiagonals && Math.abs(dx - dy) < TOLERANCE;
  return isWithinRing && (isOnAxis || isOnDiagonal);
}

function getRingCount(centre: Centre, length: number | undefined): number {
  const scale = length ? length / LENGTH_SCALE : 1;
  return Math.max(1, Math.floor(Math.min(centre.cx, centre.cy) * scale + TOLERANCE));
}

/** A star that grows from the centre dot out to `length` and back. */
export function generatePulse(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const centre = getCentre(grid);
  const ringCount = getRingCount(centre, params.length);
  const drawRing = (ring: number, hasDiagonals: boolean) =>
    createFrame(grid, (x, y) => isOnRing(centre, x, y, ring, hasDiagonals));
  const growing = Array.from({ length: ringCount }, (_, index) => index + 1);
  const shrinking = Array.from({ length: ringCount - 1 }, (_, index) => ringCount - 1 - index);
  return {
    frames: [
      drawRing(0, false),
      ...growing.map((ring) => drawRing(ring, ring > 1 || ringCount === 1)),
      ...shrinking.map((ring) => drawRing(ring, ring > 1)),
    ],
    durations: [
      REST_MS,
      ...growing.map((ring) => (ring === ringCount ? PEAK_MS : BEAT_MS)),
      ...shrinking.map(() => BEAT_MS),
    ],
  };
}
