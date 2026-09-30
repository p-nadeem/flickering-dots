import type { Frame, GridSize } from '../../types';
import { getViewport } from './space';

const TUBE_RADIUS = 0.8;
const RING_RADIUS = 2.2;
const VIEW_DEPTH = 5;
const EDGE_MARGIN = 1.5;
const THETA_STEP = 0.07;
const PHI_STEP = 0.02;
const FULL_TURN = 2 * Math.PI;
const LIGHT_OFFSET = 0.2;
const LIGHT_RANGE = 1.6;
const BAYER_SIZE = 4;
const BAYER_LEVELS = 16;
const BAYER_4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** How the torus is turned: `a` about X, then `b` about the view axis. */
export interface TorusPose {
  a: number;
  b: number;
}

interface Sample {
  cell: number;
  depth: number;
  light: number;
}

interface Angle {
  cos: number;
  sin: number;
}

function angles(step: number): Angle[] {
  return Array.from({ length: Math.ceil(FULL_TURN / step) }, (_, index) => ({
    cos: Math.cos(index * step),
    sin: Math.sin(index * step),
  }));
}

const THETAS = angles(THETA_STEP);
const PHIS = angles(PHI_STEP);

/** Distance from the torus centre to its outer edge, in dots, on a grid. */
export function torusOuterRadius(grid: GridSize): number {
  return (getProjectionScale(grid) * (RING_RADIUS + TUBE_RADIUS)) / VIEW_DEPTH;
}

/** Distance from the torus centre to the edge of its hole, in dots, on a grid. */
export function torusInnerRadius(grid: GridSize): number {
  return (getProjectionScale(grid) * (RING_RADIUS - TUBE_RADIUS)) / VIEW_DEPTH;
}

function getProjectionScale(grid: GridSize): number {
  const reach = RING_RADIUS + TUBE_RADIUS;
  const widest = reach / Math.sqrt(VIEW_DEPTH * VIEW_DEPTH - reach * reach);
  return Math.max(0, getViewport(grid).side / 2 - EDGE_MARGIN) / widest;
}

interface View {
  cx: number;
  cy: number;
  scale: number;
  cosA: number;
  sinA: number;
  cosB: number;
  sinB: number;
}

function toView(grid: GridSize, pose: TorusPose): View {
  const { cx, cy } = getViewport(grid);
  return {
    cx,
    cy,
    scale: getProjectionScale(grid),
    cosA: Math.cos(pose.a),
    sinA: Math.sin(pose.a),
    cosB: Math.cos(pose.b),
    sinB: Math.sin(pose.b),
  };
}

function sampleAt(grid: GridSize, view: View, theta: Angle, phi: Angle): Sample | undefined {
  const { cx, cy, scale, cosA, sinA, cosB, sinB } = view;
  const circleX = RING_RADIUS + TUBE_RADIUS * theta.cos;
  const circleY = TUBE_RADIUS * theta.sin;
  const x = circleX * (cosB * phi.cos + sinA * sinB * phi.sin) - circleY * cosA * sinB;
  const y = circleX * (sinB * phi.cos - sinA * cosB * phi.sin) + circleY * cosA * cosB;
  const depth = 1 / (VIEW_DEPTH + cosA * circleX * phi.sin + circleY * sinA);
  const column = Math.round(cx + scale * depth * x);
  const row = Math.round(cy - scale * depth * y);
  if (column < 0 || row < 0 || column >= grid.cols || row >= grid.rows) return undefined;
  const light =
    phi.cos * theta.cos * sinB -
    cosA * theta.cos * phi.sin -
    sinA * theta.sin +
    cosB * (cosA * theta.sin - theta.cos * sinA * phi.sin);
  return { cell: row * grid.cols + column, depth, light };
}

function keepNearest(nearest: Map<number, Sample>, sample: Sample | undefined): void {
  if (sample === undefined) return;
  const kept = nearest.get(sample.cell);
  if (kept === undefined || sample.depth > kept.depth) nearest.set(sample.cell, sample);
}

function isDitheredOn(cell: number, light: number, cols: number, dim: number): boolean {
  const threshold = BAYER_4[Math.floor(cell / cols) % BAYER_SIZE][(cell % cols) % BAYER_SIZE];
  return (light + LIGHT_OFFSET - dim) / LIGHT_RANGE > (threshold + 0.5) / BAYER_LEVELS;
}

/** The nearest surface sample under every dot the torus covers, in dot order. */
export function torusSamples(grid: GridSize, pose: TorusPose): Sample[] {
  const view = toView(grid, pose);
  const nearest = new Map<number, Sample>();
  THETAS.forEach((theta) => PHIS.forEach((phi) => keepNearest(nearest, sampleAt(grid, view, theta, phi))));
  return [...nearest.values()].sort((p, q) => p.cell - q.cell);
}

/** The torus shaded by its light, thresholded through a 4x4 ordered dither; `dim` lowers the light. */
export function drawTorus(grid: GridSize, pose: TorusPose, dim = 0): Frame {
  const lit = new Set(
    torusSamples(grid, pose)
      .filter(({ cell, light }) => isDitheredOn(cell, light, grid.cols, dim))
      .map(({ cell }) => cell),
  );
  return Array.from({ length: grid.cols * grid.rows }, (_, index) => (lit.has(index) ? 1 : 0));
}
