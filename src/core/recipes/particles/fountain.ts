import type { GridSize, RecipeParams } from '../../types';
import { generateCheck } from '../check';
import { generateCross } from '../cross';
import type { Point, RecipeOutput } from '../helpers';
import { getMiddleColumn, getRowPoints, joinOutputs, keyedRandom, stepsToOutput } from './steps';
import type { ParticlesBuilder, Step } from './steps';

const FRAME_MS = 50;
const DRAIN_MS = 60;
const LOOP_FRAMES = 60;
const WARMUP_FRAMES = LOOP_FRAMES;
const MAX_FLIGHT_FRAMES = 40;
const PULSE_SHARE = 0.25;
const HEIGHT_MIN = 0.62;
const HEIGHT_SPREAD = 0.08;
const LAND_MIN = 0.7;
const LAND_SPREAD = 0.25;
const SPREAD_POWER = 2;
const GRAVITY = 0.08;
const NOZZLE_FROM_BOTTOM = 2;
const HALF_CELL = 0.5;
const DESIGN_ROWS = 11;
const PROGRESS_START = 0.15;
const PROGRESS_RAMP_FRAMES = 45;
const BURST_HEIGHT = 1.4;
const BUBBLER_HEIGHT = 0.3;
const BURST_AFTER = 10;
const BURST_FRAMES = 6;
const BURST_EXTRA_KEY = LOOP_FRAMES;
const SPUTTER_AFTER = 8;
const SPUTTER_PATTERN = [3, 6, 3, 6, 2] as const;

interface Emission {
  key: number;
  height: number;
}

type Schedule = (frame: number) => Emission[];

interface Scene {
  grid: GridSize;
  seed: number;
  schedule: Schedule;
}

function loopKey(frame: number): number {
  return ((frame % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES;
}

function flightPoint(scene: Scene, emission: Emission, age: number): Point {
  const { grid, seed } = scene;
  const nozzleY = grid.rows - NOZZLE_FROM_BOTTOM;
  const gravity = (GRAVITY * grid.rows) / DESIGN_ROWS;
  const peak = nozzleY * (HEIGHT_MIN + HEIGHT_SPREAD * keyedRandom(seed, emission.key, 0)) * emission.height;
  const speed = Math.sqrt(2 * gravity * peak);
  const flight = (speed + Math.sqrt(speed * speed + 2 * gravity)) / gravity;
  const middle = getMiddleColumn(grid);
  const room = Math.min(middle, grid.cols - 1 - middle) + HALF_CELL;
  const land =
    room * (LAND_MIN + LAND_SPREAD * keyedRandom(seed, emission.key, 1)) * Math.sqrt(emission.height);
  const side = emission.key % 2 === 0 ? -1 : 1;
  const offset = Math.round(land * Math.min(1, age / flight) ** SPREAD_POWER);
  return [middle + side * offset, nozzleY - speed * age + (gravity * age * age) / 2];
}

function particlePoints(scene: Scene, frame: number): Point[] {
  const basin = scene.grid.rows - 1;
  return Array.from({ length: MAX_FLIGHT_FRAMES }, (_, age) => age + 1).flatMap((age) =>
    scene.schedule(frame - age).flatMap((emission) => {
      const point = flightPoint(scene, emission, age);
      return Math.round(point[1]) < basin ? [point] : [];
    }),
  );
}

function sceneStep(scene: Scene, frame: number, hasNozzle: boolean): Step {
  const { grid } = scene;
  const nozzle: Point[] = hasNozzle ? [[getMiddleColumn(grid), grid.rows - NOZZLE_FROM_BOTTOM]] : [];
  const basin = getRowPoints(grid.rows - 1, 0, grid.cols - 1);
  return { points: [...basin, ...nozzle, ...particlePoints(scene, frame)], ms: FRAME_MS };
}

function recordScene(scene: Scene, count: number, isNozzleOn: (frame: number) => boolean): RecipeOutput {
  const frames = Array.from({ length: count }, (_, index) => WARMUP_FRAMES + index);
  return stepsToOutput(
    scene.grid,
    frames.map((frame) => sceneStep(scene, frame, isNozzleOn(frame))),
  );
}

function jetSchedule(params: RecipeParams): Schedule {
  const density = params.density ?? 1;
  return (frame) => {
    const key = loopKey(frame);
    return [{ key, height: density * (1 + PULSE_SHARE * Math.sin((2 * Math.PI * key) / LOOP_FRAMES)) }];
  };
}

function progressSchedule(params: RecipeParams): Schedule {
  const density = params.density ?? 1;
  return (frame) => {
    const key = loopKey(frame);
    const progress = Math.min(1, key / PROGRESS_RAMP_FRAMES);
    return [{ key, height: density * (PROGRESS_START + (1 - PROGRESS_START) * progress) }];
  };
}

function burstSchedule(params: RecipeParams): Schedule {
  const steady = jetSchedule(params);
  const start = WARMUP_FRAMES + BURST_AFTER;
  return (frame) => {
    if (frame < start) return steady(frame);
    const key = loopKey(frame);
    if (frame >= start + BURST_FRAMES) return [{ key, height: BUBBLER_HEIGHT }];
    return [
      { key, height: BURST_HEIGHT },
      { key: key + BURST_EXTRA_KEY, height: BURST_HEIGHT },
    ];
  };
}

function isSputtering(offset: number): boolean {
  const ends = SPUTTER_PATTERN.reduce<number[]>((all, length) => [...all, (all.at(-1) ?? 0) + length], []);
  const run = ends.findIndex((end) => offset < end);
  return run !== -1 && run % 2 === 0;
}

function sputterSchedule(params: RecipeParams): Schedule {
  const steady = jetSchedule(params);
  const start = WARMUP_FRAMES + SPUTTER_AFTER;
  return (frame) => (frame < start || isSputtering(frame - start) ? steady(frame) : []);
}

function framesUntilLanded(lastEmission: number): number {
  return lastEmission - WARMUP_FRAMES + MAX_FLIGHT_FRAMES;
}

function overBasin(grid: GridSize, output: RecipeOutput): RecipeOutput {
  const basin = grid.cols * (grid.rows - 1);
  return {
    ...output,
    frames: output.frames.map((frame) => frame.map((bit, index) => (index >= basin ? 1 : bit))),
  };
}

function generateBurstJet(grid: GridSize, params: RecipeParams, seed: number): RecipeOutput {
  const scene = { grid, seed, schedule: burstSchedule(params) };
  const jet = recordScene(scene, framesUntilLanded(WARMUP_FRAMES + BURST_AFTER + BURST_FRAMES), () => true);
  return joinOutputs([jet, overBasin(grid, generateCheck(grid))]);
}

function drainBasin(grid: GridSize): RecipeOutput {
  const steps = Array.from({ length: grid.cols }, (_, index): Step => ({
    points: getRowPoints(grid.rows - 1, index + 1, grid.cols - 1),
    ms: DRAIN_MS,
  }));
  return stepsToOutput(grid, steps);
}

function generateSputter(grid: GridSize, params: RecipeParams, seed: number): RecipeOutput {
  const scene = { grid, seed, schedule: sputterSchedule(params) };
  const stop = WARMUP_FRAMES + SPUTTER_AFTER + SPUTTER_PATTERN.reduce((sum, length) => sum + length, 0);
  const count = framesUntilLanded(stop);
  const settled = Array.from({ length: count }, (_, index) => WARMUP_FRAMES + index).find(
    (frame) => frame >= stop && particlePoints(scene, frame).length === 0,
  );
  const flow = recordScene(
    scene,
    (settled ?? WARMUP_FRAMES + count) - WARMUP_FRAMES + 1,
    (frame) => frame < stop,
  );
  return joinOutputs([flow, drainBasin(grid), generateCross(grid)]);
}

/** Fountain variants: the looping jet (density sets its height), the rising progress jet, the burst that ends on the tick and the sputter that ends on the cross. */
export const FOUNTAIN_BUILDERS: Readonly<
  Record<'jet' | 'jet-progress' | 'jet-burst' | 'jet-sputter', ParticlesBuilder>
> = {
  jet: (grid, params, seed) =>
    recordScene({ grid, seed, schedule: jetSchedule(params) }, LOOP_FRAMES, () => true),
  'jet-progress': (grid, params, seed) =>
    recordScene({ grid, seed, schedule: progressSchedule(params) }, LOOP_FRAMES, () => true),
  'jet-burst': generateBurstJet,
  'jet-sputter': generateSputter,
};
