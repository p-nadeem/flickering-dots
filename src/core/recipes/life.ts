import type { Frame, GridSize, RecipeParams } from '../types';
import { createRng } from '../rng';
import { createFrame, createFrameFromPoints, wrapIndex } from './helpers';
import type { Point, RecipeOutput } from './helpers';

const FRAME_MS = 120;
const NEIGHBOUR_OFFSETS = [-1, 0, 1] as const;
const SURVIVAL_COUNTS: readonly number[] = [2, 3];
const BIRTH_COUNT = 3;
const GLIDER_PHASES: readonly (readonly Point[])[] = [
  [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  [
    [0, 0],
    [2, 0],
    [1, 1],
    [2, 1],
    [1, 2],
  ],
  [
    [2, 0],
    [0, 1],
    [2, 1],
    [1, 2],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
  ],
];
const GLIDER_SIZE = 3;
const GLIDER_PERIOD = 4;
const GLIDER_MIN_SIDE = 5;
const FLEET_SPACING = 4;

/** Default params of the `life` recipe. */
export const LIFE_DEFAULTS = { seed: 11, frames: 16, density: 0.35 } as const satisfies RecipeParams;

function countNeighbours(frame: Frame, grid: GridSize, x: number, y: number): number {
  return NEIGHBOUR_OFFSETS.flatMap((dy) =>
    NEIGHBOUR_OFFSETS.filter((dx) => dx !== 0 || dy !== 0).map(
      (dx) => frame[wrapIndex(y + dy, grid.rows) * grid.cols + wrapIndex(x + dx, grid.cols)],
    ),
  ).filter((bit) => bit === 1).length;
}

function getNextGeneration(frame: Frame, grid: GridSize): Frame {
  return createFrame(grid, (x, y) => {
    const neighbours = countNeighbours(frame, grid, x, y);
    const isAlive = frame[y * grid.cols + x] === 1;
    return isAlive ? SURVIVAL_COUNTS.includes(neighbours) : neighbours === BIRTH_COUNT;
  });
}

function getGcd(a: number, b: number): number {
  return b === 0 ? a : getGcd(b, a % b);
}

function getFleetLoop(grid: GridSize): number {
  return (GLIDER_PERIOD * grid.cols * grid.rows) / getGcd(grid.cols, grid.rows);
}

function createFleet(grid: GridSize): Frame {
  const count = Math.floor(Math.min(grid.cols, grid.rows) / FLEET_SPACING);
  const span = FLEET_SPACING * (count - 1) + GLIDER_SIZE;
  const left = Math.floor((grid.cols - span) / 2);
  const top = Math.floor((grid.rows - span) / 2);
  const points = Array.from({ length: count }, (_, index) => {
    const offset = index * FLEET_SPACING;
    const phase = GLIDER_PHASES[index % GLIDER_PHASES.length];
    return phase.map(([x, y]): Point => [left + offset + x, top + offset + y]);
  }).flat();
  return createFrameFromPoints(grid, points);
}

function runGenerations(first: Frame, count: number, advance: (frame: Frame) => Frame): Frame[] {
  return Array.from({ length: Math.max(count - 1, 0) }).reduce<Frame[]>(
    (frames) => [...frames, advance(frames[frames.length - 1])],
    [first],
  );
}

function generateSoup(grid: GridSize, params: RecipeParams, density: number): Frame[] {
  const random = createRng(params.seed ?? LIFE_DEFAULTS.seed);
  const createSoup = () => createFrame(grid, () => random() < density);
  const count = params.frames || LIFE_DEFAULTS.frames;
  return runGenerations(createSoup(), count, (frame) => {
    const next = getNextGeneration(frame, grid);
    return next.includes(1) ? next : createSoup();
  });
}

function generateFleet(grid: GridSize, params: RecipeParams): Frame[] {
  const count = params.frames || getFleetLoop(grid);
  return runGenerations(createFleet(grid), count, (frame) => getNextGeneration(frame, grid));
}

function canFitGlider(grid: GridSize): boolean {
  return Math.min(grid.cols, grid.rows) >= GLIDER_MIN_SIDE;
}

/** Conway's Game of Life on a wrapping grid: a reseeding soup, or at density 0 a looping fleet of gliders in different phases. */
export function generateLife(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const density = params.density ?? LIFE_DEFAULTS.density;
  const isFleet = density === 0 && canFitGlider(grid);
  const frames = isFleet
    ? generateFleet(grid, params)
    : generateSoup(grid, params, density === 0 ? LIFE_DEFAULTS.density : density);
  return { frames, durations: frames.map(() => FRAME_MS) };
}
