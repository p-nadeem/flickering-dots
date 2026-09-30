import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints, getCentre } from '../helpers';
import type { Centre, Point, RecipeOutput } from '../helpers';
import { cometCells, snapPoint, tracePath } from './path';

const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;
const LEVEL_MIN = 0.35;
const LEVELS_PER_TURN = 2;
const MIN_RADIUS = 1;

/** Frequencies, laps and timing of one oscilloscope figure. */
export interface LissajousSpec {
  xFrequency: number;
  yFrequency: number;
  turns: number;
  frameMs: number;
  trail: number;
  isLevelled: boolean;
}

/** The slow idle circle: one lap, a trail of 4, 120 ms per dot. */
export const CIRCLE_SPEC: LissajousSpec = {
  xFrequency: 1,
  yFrequency: 1,
  turns: 1,
  frameMs: 120,
  trail: 4,
  isLevelled: false,
};

/** The thinking figure: 3:2 with a quarter-lap phase drift per lap, closing after 4 laps, 50 ms per dot. */
export const KNOT_SPEC: LissajousSpec = {
  xFrequency: 3.25,
  yFrequency: 2,
  turns: 4,
  frameMs: 50,
  trail: 8,
  isLevelled: false,
};

/** The listening circle: its radius follows a seeded level list, two levels per lap over 4 laps. */
export const LEVEL_SPEC: LissajousSpec = {
  xFrequency: 1,
  yFrequency: 1,
  turns: 4,
  frameMs: 50,
  trail: 4,
  isLevelled: true,
};

/** Default seed of the listening level list. */
export const LEVEL_SEED = 5;

type Amplitude = (angle: number) => number;

function levelAmplitude(spec: LissajousSpec, seed: number): Amplitude {
  if (!spec.isLevelled) return () => 1;
  const random = createRng(seed);
  const levels = Array.from(
    { length: spec.turns * LEVELS_PER_TURN },
    () => LEVEL_MIN + (1 - LEVEL_MIN) * random(),
  );
  return (angle) => {
    const position = (angle * LEVELS_PER_TURN) / FULL_TURN;
    const index = Math.floor(position);
    const ease = (1 - Math.cos(Math.PI * (position - index))) / 2;
    return levels[index % levels.length] * (1 - ease) + levels[(index + 1) % levels.length] * ease;
  };
}

function radius(half: number, level: number): number {
  return Math.max(level * half, Math.min(MIN_RADIUS, half));
}

function figurePoint(spec: LissajousSpec, centre: Centre, amplitude: Amplitude): (angle: number) => Point {
  return (angle) => {
    const level = amplitude(angle);
    return snapPoint(centre, [
      radius(centre.cx, level) * Math.sin(spec.xFrequency * angle + QUARTER_TURN),
      radius(centre.cy, level) * Math.sin(spec.yFrequency * angle),
    ]);
  };
}

/** The ordered cells the oscilloscope dot visits over one whole loop of the figure. */
export function lissajousPath(grid: GridSize, spec: LissajousSpec, seed = LEVEL_SEED): Point[] {
  const centre = getCentre(grid);
  const pointAt = figurePoint(spec, centre, levelAmplitude(spec, seed));
  return tracePath(spec.turns, centre, (share) => pointAt(share * spec.turns * FULL_TURN));
}

/** A dot with a trail running along a Lissajous figure, one dot per frame, looping seamlessly. */
export function generateLissajous(grid: GridSize, spec: LissajousSpec, params: RecipeParams): RecipeOutput {
  const path = lissajousPath(grid, spec, params.seed ?? LEVEL_SEED);
  const trail = Math.min(params.trail ?? spec.trail, path.length - 1);
  const frames = path.map((_, head) => createFrameFromPoints(grid, cometCells(path, head, trail)));
  return { frames, durations: frames.map(() => spec.frameMs) };
}
