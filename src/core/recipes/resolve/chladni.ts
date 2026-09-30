import { glyphMask } from '../../glyphs';
import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';

type Mode = readonly [n: number, m: number, sign: 1 | -1];

const ASTERISK: Mode = [1, 3, -1];
const RING: Mode = [0, 2, 1];
const CROSSHAIR: Mode = [1, 3, 1];
const CURATED_MODES: readonly Mode[] = [ASTERISK, RING, CROSSHAIR];
const ZERO_TOLERANCE = 1e-9;
const HALF = 0.5;
const CORNERS = [
  [-HALF, -HALF],
  [HALF, -HALF],
  [HALF, HALF],
  [-HALF, HALF],
] as const;

/** How many curated Chladni figures there are before the symmetry filter. */
export const CHLADNI_FIGURE_COUNT = CURATED_MODES.length;

function plateValue([n, m, sign]: Mode, grid: GridSize, x: number, y: number): number {
  const u = (Math.PI * x) / Math.max(1, grid.cols - 1);
  const v = (Math.PI * y) / Math.max(1, grid.rows - 1);
  return Math.cos(n * u) * Math.cos(m * v) + sign * Math.cos(m * u) * Math.cos(n * v);
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

function isZero(value: number): boolean {
  return Math.abs(value) <= ZERO_TOLERANCE;
}

function isNodal(mode: Mode, grid: GridSize, x: number, y: number): boolean {
  if (isZero(plateValue(mode, grid, x, y))) return true;
  const corners = CORNERS.map(([dx, dy]) =>
    plateValue(mode, grid, clamp(x + dx, grid.cols - 1), clamp(y + dy, grid.rows - 1)),
  );
  const crosses = Math.min(...corners) < -ZERO_TOLERANCE && Math.max(...corners) > ZERO_TOLERANCE;
  const runsAlongEdge = corners.some(
    (value, index) => isZero(value) && isZero(corners[(index + 1) % corners.length]),
  );
  return crosses || runsAlongEdge;
}

function isFourFold(frame: Frame, grid: GridSize): boolean {
  const { cols, rows } = grid;
  return frame.every((bit, index) => {
    const x = index % cols;
    const y = Math.floor(index / cols);
    const isMirrored = bit === frame[y * cols + cols - 1 - x] && bit === frame[(rows - 1 - y) * cols + x];
    return isMirrored && (cols !== rows || bit === frame[x * cols + y]);
  });
}

function isKept(frame: Frame, grid: GridSize, index: number, all: readonly Frame[]): boolean {
  const isLit = frame.includes(1);
  const isFirst = all.findIndex((other) => other.join('') === frame.join('')) === index;
  return isLit && isFirst && isFourFold(frame, grid);
}

/** The curated Chladni figures (asterisk, ring, crosshair) drawn as nodal lines, keeping those symmetric four ways at this grid. */
export function chladniFigures(grid: GridSize): Frame[] {
  const drawn = CURATED_MODES.map((mode) => createFrame(grid, (x, y) => isNodal(mode, grid, x, y)));
  const kept = drawn.filter((frame, index) => isKept(frame, grid, index, drawn));
  return kept.length > 0 ? kept : [glyphMask('plus', grid)];
}
