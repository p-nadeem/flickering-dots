import type { Frame, GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { RESULT_HOLD_MS, pingPong } from './frames';
import { runField, sampleField, thresholdSample } from './gray-scott';
import type { Regime, SeedDisc } from './gray-scott';
import {
  MITOSIS,
  SPOT_THRESHOLD,
  getActiveRange,
  runMitosis,
  runSpots,
  spreadIndexes,
  toFrames,
} from './spots-timeline';

const SPOTS_SEED = 11;
const LOOP_FRAMES = 40;
const SPOT_MS = 110;
const PULSE_THRESHOLD = 0.15;
const BREATHE_THRESHOLD = 0.045;
const BREATHE_SAMPLES = 24;
const BREATHE_MS = 400;
const PULSE_LEAD_FRAMES = 6;
const PULSE_MS = 200;
const LABYRINTH: Regime = { feed: 0.037, kill: 0.06 };
const LABYRINTH_FRAMES = 16;
const LABYRINTH_STEPS = 50;
const CORAL_SAMPLE_STEPS = 150;
const CORAL_SEEDS: readonly SeedDisc[] = [
  { fx: 1 / 4, fy: 1, radius: 4 },
  { fx: 3 / 4, fy: 1, radius: 4 },
];

interface Tiling {
  frames: Frame[];
  samples: number[][];
  lastIndex: number;
}

function getSeed(params: RecipeParams): number {
  return params.seed ?? SPOTS_SEED;
}

function tile(grid: GridSize, params: RecipeParams): Tiling {
  const run = runMitosis(grid, getSeed(params));
  const all = toFrames(run.samples, grid);
  const { first, last } = getActiveRange(all, grid);
  const picks = spreadIndexes(first, last, LOOP_FRAMES);
  return {
    frames: picks.map((index) => all[index]),
    samples: picks.map((index) => run.samples[index]),
    lastIndex: last,
  };
}

/** Gray-Scott mitosis: one spot swells, splits and the spots push apart until they tile the grid, played forward and back. */
export function generateSpots(grid: GridSize, params: RecipeParams): RecipeOutput {
  const frames = pingPong(tile(grid, params).frames);
  return { frames, durations: frames.map(() => SPOT_MS), still: LOOP_FRAMES - 1 };
}

/** A single spot that grows and shrinks by one threshold step. */
export function generateSpotsBreathe(grid: GridSize, params: RecipeParams): RecipeOutput {
  const run = runMitosis(grid, getSeed(params), BREATHE_SAMPLES);
  const sample = run.samples[run.samples.length - 1];
  const frames = [
    thresholdSample(sample, grid, SPOT_THRESHOLD),
    thresholdSample(sample, grid, BREATHE_THRESHOLD),
  ];
  return { frames, durations: frames.map(() => BREATHE_MS), still: 0 };
}

/** Success: the tiling completes and every spot pulses one threshold step fatter, then holds. */
export function generateSpotsPulse(grid: GridSize, params: RecipeParams): RecipeOutput {
  const tiling = tile(grid, params);
  const lead = tiling.frames.slice(-PULSE_LEAD_FRAMES);
  const tiled = lead[lead.length - 1];
  const fat = thresholdSample(tiling.samples[tiling.samples.length - 1], grid, PULSE_THRESHOLD);
  return {
    frames: [...lead, fat, tiled],
    durations: [...lead.map(() => SPOT_MS), PULSE_MS, RESULT_HOLD_MS],
  };
}

/** Error: the regime shifts, the spots stretch and merge into a labyrinth, then freeze. */
export function generateSpotsLabyrinth(grid: GridSize, params: RecipeParams): RecipeOutput {
  const tiling = tile(grid, params);
  const run = runMitosis(grid, getSeed(params), tiling.lastIndex + 1);
  const fields = Array.from({ length: LABYRINTH_FRAMES }).reduce<(typeof run.last)[]>(
    (done) => [...done, runField(done[done.length - 1], run.lattice, LABYRINTH, LABYRINTH_STEPS)],
    [run.last],
  );
  const frames = fields.map((field) =>
    thresholdSample(sampleField(field, run.lattice), grid, SPOT_THRESHOLD),
  );
  return {
    frames,
    durations: frames.map((_, index) => (index === frames.length - 1 ? RESULT_HOLD_MS : SPOT_MS)),
  };
}

/** Growing: a colony seeded on the bottom edge splits and creeps up the grid, played forward and back. */
export function generateSpotsCoral(grid: GridSize, params: RecipeParams): RecipeOutput {
  const setup = {
    boundary: { wrapX: true, wrapY: false },
    discs: CORAL_SEEDS,
    seed: getSeed(params),
    regime: MITOSIS,
  };
  const run = runSpots(grid, setup, CORAL_SAMPLE_STEPS, LOOP_FRAMES);
  const frames = pingPong(toFrames(run.samples, grid));
  return { frames, durations: frames.map(() => SPOT_MS), still: LOOP_FRAMES - 1 };
}
