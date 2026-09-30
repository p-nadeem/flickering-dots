import type { Frame, GridSize } from '../../types';
import { createRng } from '../../rng';
import { createFrame } from '../helpers';

const SCALE = 3;
const DIFFUSION_U = 1;
const DIFFUSION_V = 0.5;
const EDGE_WEIGHT = 0.2;
const CORNER_WEIGHT = 0.05;
const SEED_U = 0.5;
const SEED_V = 0.25;
const SEED_NOISE = 0.02;
const NEIGHBOURS = 8;
const EDGE_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
const CORNER_OFFSETS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;

/** Feed and kill rates of one Gray-Scott regime. */
export interface Regime {
  feed: number;
  kill: number;
}

/** Which edges wrap around; a closed edge reflects. */
export interface Boundary {
  wrapX: boolean;
  wrapY: boolean;
}

/** Chemical concentrations on the fine lattice, `SCALE` cells per dot on each axis. */
export interface Field {
  u: Float64Array;
  v: Float64Array;
}

/** A fine lattice with its precomputed neighbour table. */
export interface Lattice {
  grid: GridSize;
  width: number;
  height: number;
  neighbours: Int32Array;
}

/** A seed disc on the fine lattice, as fractions of its width and height plus a radius in fine cells. */
export interface SeedDisc {
  fx: number;
  fy: number;
  radius: number;
}

function neighbourCoord(value: number, delta: number, size: number, wraps: boolean): number {
  const moved = value + delta;
  if (wraps) return (moved + size) % size;
  return Math.min(size - 1, Math.max(0, moved));
}

/** Builds the fine lattice behind `grid` and its neighbour table. */
export function createLattice(grid: GridSize, boundary: Boundary): Lattice {
  const width = grid.cols * SCALE;
  const height = grid.rows * SCALE;
  const offsets = [...EDGE_OFFSETS, ...CORNER_OFFSETS];
  const neighbours = Int32Array.from({ length: width * height * NEIGHBOURS }, (_, slot) => {
    const cell = Math.floor(slot / NEIGHBOURS);
    const [dx, dy] = offsets[slot % NEIGHBOURS];
    const x = neighbourCoord(cell % width, dx, width, boundary.wrapX);
    const y = neighbourCoord(Math.floor(cell / width), dy, height, boundary.wrapY);
    return y * width + x;
  });
  return { grid, width, height, neighbours };
}

/** Uniform u = 1 with seeded noise, and u = 0.5, v = 0.25 inside the seed discs. */
export function seedField(lattice: Lattice, discs: readonly SeedDisc[], seed: number): Field {
  const random = createRng(seed);
  const { width, height } = lattice;
  const isSeeded = (cell: number): boolean =>
    discs.some((disc) => {
      const dx = (cell % width) - disc.fx * (width - 1);
      const dy = Math.floor(cell / width) - disc.fy * (height - 1);
      return dx * dx + dy * dy <= disc.radius * disc.radius;
    });
  const cells = Array.from({ length: width * height }, (_, cell) => {
    const inside = isSeeded(cell);
    const u = (inside ? SEED_U : 1) + SEED_NOISE * (random() - 1 / 2);
    const v = inside ? SEED_V + SEED_NOISE * (random() - 1 / 2) : 0;
    return { u, v };
  });
  return { u: Float64Array.from(cells, (cell) => cell.u), v: Float64Array.from(cells, (cell) => cell.v) };
}

function laplacian(values: Float64Array, neighbours: Int32Array, cell: number): number {
  const at = cell * NEIGHBOURS;
  const edges =
    values[neighbours[at]] +
    values[neighbours[at + 1]] +
    values[neighbours[at + 2]] +
    values[neighbours[at + 3]];
  const corners =
    values[neighbours[at + 4]] +
    values[neighbours[at + 5]] +
    values[neighbours[at + 6]] +
    values[neighbours[at + 7]];
  return EDGE_WEIGHT * edges + CORNER_WEIGHT * corners - values[cell];
}

function stepField(field: Field, lattice: Lattice, { feed, kill }: Regime): Field {
  const { u, v } = field;
  const { neighbours } = lattice;
  const nextU = new Float64Array(u.length);
  const nextV = new Float64Array(v.length);
  for (let cell = 0; cell < u.length; cell += 1) {
    const reaction = u[cell] * v[cell] * v[cell];
    nextU[cell] = u[cell] + DIFFUSION_U * laplacian(u, neighbours, cell) - reaction + feed * (1 - u[cell]);
    nextV[cell] = v[cell] + DIFFUSION_V * laplacian(v, neighbours, cell) + reaction - (feed + kill) * v[cell];
  }
  return { u: nextU, v: nextV };
}

/** Runs `steps` steps in one regime. */
export function runField(field: Field, lattice: Lattice, regime: Regime, steps: number): Field {
  return Array.from({ length: steps }).reduce<Field>((current) => stepField(current, lattice, regime), field);
}

/** Mean v over each dot's block of fine cells. */
export function sampleField(field: Field, lattice: Lattice): number[] {
  const { grid, width } = lattice;
  const block = Array.from(
    { length: SCALE * SCALE },
    (_, index) => [index % SCALE, Math.floor(index / SCALE)] as const,
  );
  return Array.from({ length: grid.cols * grid.rows }, (_, dot) => {
    const left = (dot % grid.cols) * SCALE;
    const top = Math.floor(dot / grid.cols) * SCALE;
    const sum = block.reduce((total, [dx, dy]) => total + field.v[(top + dy) * width + left + dx], 0);
    return sum / block.length;
  });
}

/** Lights the dots whose mean v is above `threshold`. */
export function thresholdSample(sample: readonly number[], grid: GridSize, threshold: number): Frame {
  return createFrame(grid, (x, y) => sample[y * grid.cols + x] > threshold);
}
