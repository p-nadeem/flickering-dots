import type { Point } from '../helpers';

const RING_TOLERANCE = 0.5;

/** A circle on the dot grid by centre and radius. */
export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

function toKey([x, y]: Point): string {
  return `${x},${y}`;
}

function offCircle({ cx, cy, radius }: Circle, [x, y]: Point): number {
  return Math.abs(Math.hypot(x - cx, y - cy) - radius);
}

function isCorner(kept: ReadonlySet<string>, [x, y]: Point): boolean {
  const hasHorizontal = kept.has(toKey([x - 1, y])) || kept.has(toKey([x + 1, y]));
  const hasVertical = kept.has(toKey([x, y - 1])) || kept.has(toKey([x, y + 1]));
  return hasHorizontal && hasVertical;
}

function rasterCells(circle: Circle): Point[] {
  const reach = Math.ceil(circle.radius + 1);
  const left = Math.floor(circle.cx - reach);
  const top = Math.floor(circle.cy - reach);
  const span = 2 * reach + 2;
  return Array.from({ length: span * span }, (_, index): Point => [
    left + (index % span),
    top + Math.floor(index / span),
  ]).filter((cell) => offCircle(circle, cell) < RING_TOLERANCE);
}

/** The cells of a one-dot circle outline, with corner cells thinned away so it never doubles. */
export function ringPoints(circle: Circle): Point[] {
  const cells = rasterCells(circle);
  const worstFirst = [...cells].sort((a, b) => offCircle(circle, b) - offCircle(circle, a));
  const kept = worstFirst.reduce<ReadonlySet<string>>(
    (keys, cell) => (isCorner(keys, cell) ? new Set([...keys].filter((key) => key !== toKey(cell))) : keys),
    new Set(cells.map(toKey)),
  );
  return cells.filter((cell) => kept.has(toKey(cell)));
}
