import type { Frame, GridSize } from '../../types';
import { getViewport, lerpVec } from './space';
import type { Vec3 } from './space';

const CUBE_HALF = 0.8;
const SPHERE_RADIUS = 1.2;
const SPHERE_BANDS: readonly (readonly [latitude: number, count: number, offset: number])[] = [
  [-0.62, 6, 0],
  [0, 8, 0.5],
  [0.62, 6, 0.5],
];
const RING_RADIUS = 1.4;
const RING_BALLS = 12;
const HELIX_RADIUS = 0.85;
const HELIX_HALF_HEIGHT = 1.2;
const HELIX_TURNS = 1;
const STRANDS = 2;
const FULL_TURN = 2 * Math.PI;
const SIGNS = [-1, 1] as const;

/** How many balls the cloud carries: a cube's 8 corners and 12 edge midpoints. */
export const CLOUD_POINTS = 20;

function byLongitude(points: readonly Vec3[]): Vec3[] {
  return [...points].sort((a, b) => Math.atan2(a[0], a[2]) - Math.atan2(b[0], b[2]));
}

const CORNERS: readonly Vec3[] = SIGNS.flatMap((x) =>
  SIGNS.flatMap((y) => SIGNS.map((z): Vec3 => [x, y, z])),
);
const CUBE_EDGES = CORNERS.flatMap((from, i) =>
  CORNERS.flatMap((to, j) =>
    j > i && from.filter((value, axis) => value !== to[axis]).length === 1 ? [[from, to] as const] : [],
  ),
);

function cubePoints(): Vec3[] {
  const midpoints = CUBE_EDGES.map(([from, to]) => lerpVec(from, to, 0.5));
  return [...CORNERS, ...midpoints].map(([x, y, z]): Vec3 => [CUBE_HALF * x, CUBE_HALF * y, CUBE_HALF * z]);
}

function spherePoints(): Vec3[] {
  return SPHERE_BANDS.flatMap(([latitude, count, offset]) => {
    const radius = SPHERE_RADIUS * Math.sqrt(1 - latitude * latitude);
    return Array.from({ length: count }, (_, index): Vec3 => {
      const angle = (FULL_TURN * (index + offset)) / count;
      return [radius * Math.cos(angle), SPHERE_RADIUS * latitude, radius * Math.sin(angle)];
    });
  });
}

function ringPoints(): Vec3[] {
  return Array.from({ length: CLOUD_POINTS }, (_, index) => {
    const angle = (FULL_TURN * Math.floor((index * RING_BALLS) / CLOUD_POINTS)) / RING_BALLS;
    return [RING_RADIUS * Math.cos(angle), 0, RING_RADIUS * Math.sin(angle)];
  });
}

function helixPoints(): Vec3[] {
  const perStrand = CLOUD_POINTS / STRANDS;
  return Array.from({ length: CLOUD_POINTS }, (_, index) => {
    const t = Math.floor(index / STRANDS) / (perStrand - 1);
    const angle = FULL_TURN * HELIX_TURNS * t + Math.PI * (index % STRANDS);
    return [HELIX_RADIUS * Math.cos(angle), HELIX_HALF_HEIGHT * (2 * t - 1), HELIX_RADIUS * Math.sin(angle)];
  });
}

/** The cube the cloud lands from. */
export function cloudCube(): Vec3[] {
  return byLongitude(cubePoints());
}

/** The four shapes the cloud cycles through, ring first, each sorted by longitude so point i flows to point i. */
export function cloudShapes(): Vec3[][] {
  return [ringPoints(), helixPoints(), cubePoints(), spherePoints()].map(byLongitude);
}

/** The three-band sphere the idle cloud turns. */
export function cloudSphere(): Vec3[] {
  return byLongitude(spherePoints());
}

/** Model points that land exactly on the lit cells of `mask` when seen face-on, reused in turn to fill `count`. */
export function glyphPoints(grid: GridSize, mask: Frame, count: number): Vec3[] {
  const { cx, cy, scale } = getViewport(grid);
  const cells = mask.flatMap((bit, index): Vec3[] =>
    bit === 1 ? [[((index % grid.cols) - cx) / scale, (Math.floor(index / grid.cols) - cy) / scale, 0]] : [],
  );
  const sorted = [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return Array.from({ length: count }, (_, index) => sorted[Math.floor((index * sorted.length) / count)]);
}
