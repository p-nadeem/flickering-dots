import { createLruCache } from '../../lru-cache';
import type { Frame, GridSize } from '../../types';
import { createLattice, runField, sampleField, seedField, thresholdSample } from './gray-scott';
import type { Boundary, Field, Lattice, Regime, SeedDisc } from './gray-scott';
import { countSpots } from './spot-count';

/** The mitosis regime: spots swell and split in two. */
export const MITOSIS: Regime = { feed: 0.0367, kill: 0.0649 };
/** Mean v above which a dot is lit. */
export const SPOT_THRESHOLD = 0.2;
const TORUS: Boundary = { wrapX: true, wrapY: true };

const CENTRE_SEED: readonly SeedDisc[] = [{ fx: 1 / 2, fy: 1 / 2, radius: 4 }];
const SAMPLE_STEPS = 25;
const MAX_SAMPLES = 280;
const LEAD_SAMPLES = 12;
const TAIL_SAMPLES = 8;
const MITOSIS_CACHE_LIMIT = 8;

const mitosisRuns = createLruCache<SpotRun>(MITOSIS_CACHE_LIMIT);

/** Mean v per dot at every sample, and the fine field at the last one. */
export interface SpotRun {
  lattice: Lattice;
  samples: number[][];
  last: Field;
}

/** Runs the reaction, sampling every `sampleSteps` steps. */
export function runSpots(
  grid: GridSize,
  setup: { boundary: Boundary; discs: readonly SeedDisc[]; seed: number; regime: Regime },
  sampleSteps: number,
  count: number,
): SpotRun {
  const lattice = createLattice(grid, setup.boundary);
  const start = seedField(lattice, setup.discs, setup.seed);
  return Array.from({ length: count }).reduce<SpotRun>(
    (run) => {
      const last = runField(run.last, lattice, setup.regime, sampleSteps);
      return { lattice, samples: [...run.samples, sampleField(last, lattice)], last };
    },
    { lattice, samples: [], last: start },
  );
}

/** Mitosis from one centred spot on a torus; the last few runs are kept, so the spots variants share one simulation. */
export function runMitosis(grid: GridSize, seed: number, samples: number = MAX_SAMPLES): SpotRun {
  const key = `${grid.cols}x${grid.rows}:${seed}:${samples}`;
  const run =
    mitosisRuns.read(key) ??
    runSpots(grid, { boundary: TORUS, discs: CENTRE_SEED, seed, regime: MITOSIS }, SAMPLE_STEPS, samples);
  mitosisRuns.write(key, run);
  return run;
}

/** The sample range worth showing: from just before the first split to just after the spot count settles. */
export function getActiveRange(frames: readonly Frame[], grid: GridSize): { first: number; last: number } {
  const counts = frames.map((frame) => countSpots(frame, grid));
  const split = counts.findIndex((count) => count >= 2);
  const settled = counts.reduce(
    (latest, count, index) => (index > 0 && count !== counts[index - 1] ? index : latest),
    0,
  );
  if (split < 0) return { first: 0, last: frames.length - 1 };
  return {
    first: Math.max(0, split - LEAD_SAMPLES),
    last: Math.min(frames.length - 1, settled + TAIL_SAMPLES),
  };
}

/** `count` indexes spread evenly from `first` to `last`. */
export function spreadIndexes(first: number, last: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) =>
    Math.round(first + ((last - first) * index) / (count - 1)),
  );
}

/** Thresholds every sample at the spot threshold. */
export function toFrames(
  samples: readonly (readonly number[])[],
  grid: GridSize,
  threshold: number = SPOT_THRESHOLD,
): Frame[] {
  return samples.map((sample) => thresholdSample(sample, grid, threshold));
}
