import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Centre, Point, RecipeOutput } from '../helpers';
import { firstVisits, snapPoint, tracePath } from './path';
import type { Vec } from './path';

/** Ring radius, rolling radius and pen distance of a hypotrochoid, and whether its lobes point at the corners. */
export interface RosetteSpec {
  ring: number;
  roller: number;
  pen: number;
  isDiagonal: boolean;
}

/** The rosette's cells: `path` in pen order with revisits, `order` each cell once in first-visit order. */
export interface Rosette {
  path: Point[];
  order: Point[];
}

const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;
const EIGHTH_TURN = Math.PI / 4;
const EXTENT_SAMPLES = 1440;
const DRAW_MS = 45;
const FULL_HOLD_MS = 400;
const REST_MS = 120;
const PROGRESS_STEP_MS = 60;
const PROGRESS_PAUSE_MS = 360;
const PROGRESS_PAUSE_CHANCE = 0.2;
const PROGRESS_FULL_MS = 800;
const PROGRESS_CLEAR_MS = 300;
const PROGRESS_STILL_SHARE = 0.6;
const STILL_MS = 1000;

/** Default seed of the looping progress pauses. */
export const SPIRO_SEED = 3;

const STAR: RosetteSpec = { ring: 4, roller: 3, pen: 2, isDiagonal: false };
const PETALS: RosetteSpec = { ring: 4, roller: 1, pen: 3, isDiagonal: false };
const CLOVER: RosetteSpec = { ring: 4, roller: 1, pen: 3, isDiagonal: true };
const WIDE_CLOVER: RosetteSpec = { ring: 4, roller: 1, pen: 2.5, isDiagonal: true };

const ROSETTES_BY_SIDE: Readonly<Record<number, RosetteSpec>> = {
  8: { ...STAR, isDiagonal: true },
  9: PETALS,
  10: CLOVER,
  11: CLOVER,
  12: CLOVER,
  13: CLOVER,
  14: WIDE_CLOVER,
  15: CLOVER,
  16: WIDE_CLOVER,
};

function greatestDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestDivisor(b, a % b);
}

/** The four-lobed hypotrochoid that reads best at this short side: a star up to 8, petals at 9, a clover above. */
export function rosetteSpec(grid: GridSize): RosetteSpec {
  return ROSETTES_BY_SIDE[Math.min(grid.cols, grid.rows)] ?? STAR;
}

function turnsOf({ ring, roller }: RosetteSpec): number {
  return roller / greatestDivisor(ring, roller);
}

function curve(spec: RosetteSpec): (angle: number) => Vec {
  const gap = spec.ring - spec.roller;
  const rotation = spec.isDiagonal ? -EIGHTH_TURN : -QUARTER_TURN;
  return (angle) => {
    const x = gap * Math.cos(angle) + spec.pen * Math.cos((gap * angle) / spec.roller);
    const y = gap * Math.sin(angle) - spec.pen * Math.sin((gap * angle) / spec.roller);
    return [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)];
  };
}

function extent(spec: RosetteSpec): number {
  const at = curve(spec);
  const span = turnsOf(spec) * FULL_TURN;
  return Math.max(
    ...Array.from({ length: EXTENT_SAMPLES }, (_, index) => {
      const [x, y] = at((index / EXTENT_SAMPLES) * span);
      return Math.max(Math.abs(x), Math.abs(y));
    }),
  );
}

function squareCentre({ cols, rows }: GridSize): Centre {
  const side = Math.min(cols, rows);
  const half = (side - 1) / 2;
  return { cx: Math.floor((cols - side) / 2) + half, cy: Math.floor((rows - side) / 2) + half };
}

/** Rasterises the rosette into one-dot-thin cells in pen order, centred in the grid's largest square. */
export function rosette(grid: GridSize): Rosette {
  const spec = rosetteSpec(grid);
  const at = curve(spec);
  const turns = turnsOf(spec);
  const scale = (Math.min(grid.cols, grid.rows) - 1) / 2 / extent(spec);
  const centre = squareCentre(grid);
  const path = tracePath(turns, centre, (share) => {
    const [x, y] = at(share * turns * FULL_TURN);
    return snapPoint(centre, [x * scale, y * scale]);
  });
  return { path, order: firstVisits(path) };
}

/** Frames showing the first 1, 2, ... cells of `order`. */
export function drawFrames(grid: GridSize, order: readonly Point[]): RecipeOutput['frames'] {
  return order.map((_, index) => createFrameFromPoints(grid, order.slice(0, index + 1)));
}

/** The rosette draws dot by dot, holds 400 ms, then erases in the same order. */
export function generateSpiro(grid: GridSize): RecipeOutput {
  const { order } = rosette(grid);
  const drawn = drawFrames(grid, order);
  const erased = order.map((_, index) => createFrameFromPoints(grid, order.slice(index + 1)));
  const full = drawn.length - 1;
  return {
    frames: [...drawn, ...erased],
    durations: [
      ...drawn.map((_, index) => (index === full ? FULL_HOLD_MS : DRAW_MS)),
      ...erased.map(() => DRAW_MS),
    ],
    still: full,
  };
}

/** The finished rosette with one pen gap running along the curve. */
export function generateSpiroRest(grid: GridSize): RecipeOutput {
  const { path, order } = rosette(grid);
  const frames = path.map(([penX, penY]) =>
    createFrameFromPoints(
      grid,
      order.filter(([x, y]) => x !== penX || y !== penY),
    ),
  );
  return { frames, durations: frames.map(() => REST_MS), still: 0 };
}

function progressLoop(grid: GridSize, order: readonly Point[], seed: number): RecipeOutput {
  const random = createRng(seed);
  const drawn = drawFrames(grid, order);
  const full = drawn.length - 1;
  const steps = drawn.map((_, index) => {
    if (index === full) return PROGRESS_FULL_MS;
    return random() < PROGRESS_PAUSE_CHANCE ? PROGRESS_PAUSE_MS : PROGRESS_STEP_MS;
  });
  return {
    frames: [...drawn, createFrameFromPoints(grid, [])],
    durations: [...steps, PROGRESS_CLEAR_MS],
    still: Math.floor(full * PROGRESS_STILL_SHARE),
  };
}

/** Progress as a rosette: `density` lights that share of the curve; without it the rosette fills in seeded bursts and clears. */
export function generateSpiroProgress(grid: GridSize, params: RecipeParams): RecipeOutput {
  const { order } = rosette(grid);
  if (params.density === undefined) return progressLoop(grid, order, params.seed ?? SPIRO_SEED);
  const count = Math.floor(params.density * order.length);
  return { frames: [createFrameFromPoints(grid, order.slice(0, count))], durations: [STILL_MS] };
}
