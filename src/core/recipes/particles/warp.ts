import { glyphMask } from '../../glyphs';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { bloomGlyph, nearestToCentre } from '../shader/bloom';
import { createFrame, getCentre, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { joinOutputs, stepsToOutput } from './steps';
import type { ParticlesBuilder, Step } from './steps';

const LOOP_FRAMES = 16;
const WARP_MS = 60;
const DRIFT_MS = 140;
const WARP_STRETCH = 3.5;
const MAX_STRETCH = 4;
const MIN_STARS = 8;
const MAX_STARS = 16;
const DRIFT_STARS = 6;
const CELLS_PER_STAR = 12;
const PHASE_STEP = (Math.sqrt(5) - 1) / 2;
const DIRECTIONS: readonly Point[] = [
  [1, 0],
  [-1, 0],
  [0, -1],
  [0, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
  [1, 1],
  [2, -1],
  [-2, 1],
  [-1, -2],
  [1, 2],
  [2, 1],
  [-2, -1],
  [-1, 2],
  [1, -2],
];
const INNER_RADIUS = 0.9;
const CORE_SHARE = 0.15;
const SAMPLE_STEP = 0.5;
const SNAP_FRAMES = 2;
const CONVERGE_FRAMES = 5;
const ARRIVAL_MS = 120;
const STOP_MS = 300;
const FALL_MS = 90;

interface Star {
  angle: number;
  phase: number;
}

interface Field {
  grid: GridSize;
  stars: Star[];
  maxRadius: number;
  core: number;
}

function createField(grid: GridSize, most = MAX_STARS): Field {
  const { cx, cy } = getCentre(grid);
  const fitting = Math.round((grid.cols * grid.rows) / CELLS_PER_STAR);
  const count = Math.min(most, Math.max(MIN_STARS, Math.min(MAX_STARS, fitting)));
  const stars = Array.from({ length: count }, (_, index) => {
    const [dx, dy] = DIRECTIONS[index % DIRECTIONS.length];
    return { angle: Math.atan2(dy, dx), phase: (index * PHASE_STEP) % 1 };
  });
  const maxRadius = Math.hypot(cx, cy) + 1;
  return { grid, stars, maxRadius, core: Math.max(INNER_RADIUS, CORE_SHARE * maxRadius) };
}

function radiusAt(field: Field, phase: number): number {
  return INNER_RADIUS * (field.maxRadius / INNER_RADIUS) ** phase;
}

function starPhase(star: Star, frame: number): number {
  return (star.phase + frame / LOOP_FRAMES) % 1;
}

function toPoint({ grid }: Field, angle: number, radius: number): Point {
  const { cx, cy } = getCentre(grid);
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function streakPoints(field: Field, star: Star, frame: number, stretch: number): Point[] {
  const phase = starPhase(star, frame);
  const head = radiusAt(field, phase);
  const tail = radiusAt(field, Math.max(0, phase - stretch / LOOP_FRAMES));
  const samples = Math.floor((head - tail) / SAMPLE_STEP) + 1;
  return Array.from({ length: samples }, (_, index) => head - index * SAMPLE_STEP)
    .filter((radius) => radius > field.core)
    .map((radius) => toPoint(field, star.angle, radius));
}

function fieldPoints(field: Field, frame: number, stretch: number): Point[] {
  return field.stars.flatMap((star) => streakPoints(field, star, frame, stretch));
}

function getStretch(params: RecipeParams): number {
  return params.density === undefined ? WARP_STRETCH : params.density * MAX_STRETCH;
}

function loopSteps(grid: GridSize, stretch: number, ms: number, most = MAX_STARS): RecipeOutput {
  const field = createField(grid, most);
  return stepsToOutput(
    grid,
    Array.from({ length: LOOP_FRAMES }, (_, frame): Step => ({
      points: fieldPoints(field, frame, stretch),
      ms,
    })),
  );
}

function convergePoints(field: Field, share: number): Point[] {
  return field.stars.flatMap((star) => {
    const radius = Math.max(field.core, radiusAt(field, starPhase(star, 0)) * share);
    return [toPoint(field, star.angle, radius)];
  });
}

function generateArrive(grid: GridSize): RecipeOutput {
  const field = createField(grid);
  const dot = nearestToCentre(grid, glyphMask('check', grid));
  const snap = Array.from({ length: SNAP_FRAMES + 1 }, (_, step): Step => ({
    points: fieldPoints(field, 0, (WARP_STRETCH * (SNAP_FRAMES - step)) / SNAP_FRAMES),
    ms: WARP_MS,
  }));
  const converge = Array.from({ length: CONVERGE_FRAMES - 1 }, (_, step): Step => ({
    points: convergePoints(field, 1 - (step + 1) / CONVERGE_FRAMES),
    ms: WARP_MS,
  }));
  const arrival: Step = { points: [dot], ms: ARRIVAL_MS };
  return joinOutputs([stepsToOutput(grid, [...snap, ...converge, arrival]), bloomGlyph(grid, 'check', dot)]);
}

function shiftDown(frame: Frame, grid: GridSize, rows: number): Frame {
  return createFrame(grid, (x, y) => y >= rows && frame[(y - rows) * grid.cols + x] === 1);
}

function generateStall(grid: GridSize): RecipeOutput {
  const field = createField(grid);
  const stopped = stepsToOutput(grid, [
    { points: fieldPoints(field, 0, WARP_STRETCH), ms: WARP_MS },
    { points: fieldPoints(field, 0, 0), ms: STOP_MS },
  ]);
  const still = stopped.frames[stopped.frames.length - 1];
  const falling = Array.from({ length: grid.rows }, (_, step) => shiftDown(still, grid, step + 1));
  return joinOutputs([
    stopped,
    mergeRepeatedFrames({ frames: falling, durations: falling.map(() => FALL_MS) }),
  ]);
}

/** Hyperspace variants: stars streaking along lattice-straight lines, six drifting stars, the arrival that blooms into a check, and the stall. */
export const WARP_BUILDERS: Readonly<
  Record<'warp' | 'warp-drift' | 'warp-arrive' | 'warp-stall', ParticlesBuilder>
> = {
  warp: (grid, params) => loopSteps(grid, getStretch(params), WARP_MS),
  'warp-drift': (grid) => loopSteps(grid, 0, DRIFT_MS, DRIFT_STARS),
  'warp-arrive': (grid) => generateArrive(grid),
  'warp-stall': (grid) => generateStall(grid),
};
