import type { Frame, GridSize } from '../../types';
import { createFrameFromPoints, getLinePoints } from '../helpers';
import type { Point } from '../helpers';
import { litPoints } from './morph';
import { lerp, smoothstep, steps } from './space';

const EDGE_MORPH_STEPS = 5;
const EDGE_MORPH_MS = 100;

/** Frames of an edge morph plus their durations. */
export interface EdgeMorphClip {
  frames: Frame[];
  durations: number[];
}

interface Corners {
  topLeft: Point;
  bottomLeft: Point;
  bottomRight: Point;
  topRight: Point;
}

function squareCorners(points: readonly Point[]): Corners {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return {
    topLeft: [left, top],
    bottomLeft: [left, bottom],
    bottomRight: [right, bottom],
    topRight: [right, top],
  };
}

function tickCorners(points: readonly Point[]): Corners {
  const byX = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const start = byX[0];
  const end = [...points].sort((a, b) => b[0] - a[0] || a[1] - b[1])[0];
  const vertex = [...points].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return { topLeft: start, bottomLeft: vertex, bottomRight: end, topRight: end };
}

function between(from: Point, to: Point, t: number): Point {
  return [Math.round(lerp(from[0], to[0], t)), Math.round(lerp(from[1], to[1], t))];
}

function drawOpenSquare(grid: GridSize, from: Corners, to: Corners, t: number): Frame {
  const at = (key: keyof Corners): Point => between(from[key], to[key], t);
  const path = [at('topLeft'), at('bottomLeft'), at('bottomRight'), at('topRight')];
  return createFrameFromPoints(
    grid,
    path.slice(1).flatMap((point, index) => getLinePoints(path[index], point)),
  );
}

/** Pulls a face-on square into the check: its left edge becomes the short arm, its bottom edge the long arm. */
export function squareToCheck(grid: GridSize, square: Frame, check: Frame): EdgeMorphClip {
  const from = squareCorners(litPoints(square, grid.cols));
  const to = tickCorners(litPoints(check, grid.cols));
  const frames = steps(EDGE_MORPH_STEPS).map((t, index) =>
    index === EDGE_MORPH_STEPS - 1 ? check : drawOpenSquare(grid, from, to, smoothstep(t)),
  );
  return { frames, durations: frames.map(() => EDGE_MORPH_MS) };
}
