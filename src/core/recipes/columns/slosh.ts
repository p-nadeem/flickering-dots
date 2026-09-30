import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import type { RecipeFn, RecipeOutput } from '../helpers';
import { glyphMask } from '../../glyphs';
import {
  evenDurations,
  frameFromHeights,
  joinOutputs,
  RESULT_HOLD_MS,
  TAU,
  withLastDuration,
} from './shared';

const FRAME_MS = 60;
const IDLE_MS = 120;
const IDLE_LEVEL = 0.4;
const IDLE_AMP = 0.3;
const SLOSH_PERIOD = 10;
const RIPPLE_PERIOD = 5;
const RIPPLE_SHARE = 0.3;
const EXCITE_AMP = 1.5;
const VIOLENT_AMP = 2;
const DECAY = 0.9;
const VIOLENT_DECAY = 0.95;
const EASE_ROWS = 0.25;
const FAST_EASE_ROWS = 0.5;
const LOW_LEVEL = 0.3;
const HIGH_LEVEL = 0.8;
const DRAIN_LEVEL = 0.5;
const PROGRESS_LEVELS = [0.25, 0.45, 0.65, 0.85];
const PROGRESS_STEP_FRAMES = 20;
const SETTLE_FRAMES = 6;
const FULL_HOLD_MS = 800;
const HOLE_GROWTH = 0.5;
const NO_HOLE = -1;

interface Oscillator {
  re: number;
  im: number;
}

interface Tank {
  level: number;
  target: number;
  slosh: Oscillator;
  ripple: Oscillator;
}

interface Segment {
  target: number;
  frames: number;
  rate: number;
  kick: number;
  decay: number;
}

const STILL: Oscillator = { re: 0, im: 0 };

function wallShape(grid: GridSize, x: number, modes: number): number {
  const u = grid.cols > 1 ? x / (grid.cols - 1) : 1 / 2;
  return Math.cos(Math.PI * modes * u);
}

function surface(grid: GridSize, level: number, slosh: number, ripple: number): number[] {
  return Array.from(
    { length: grid.cols },
    (_, x) => level + slosh * wallShape(grid, x, 1) + RIPPLE_SHARE * ripple * wallShape(grid, x, 2),
  );
}

function tankHeights(grid: GridSize, { level, slosh, ripple }: Tank): number[] {
  return surface(grid, level, slosh.im, ripple.im);
}

function turn({ re, im }: Oscillator, period: number, decay: number): Oscillator {
  const angle = TAU / period;
  return {
    re: decay * (re * Math.cos(angle) - im * Math.sin(angle)),
    im: decay * (re * Math.sin(angle) + im * Math.cos(angle)),
  };
}

function kicked({ re, im }: Oscillator, kick: number): Oscillator {
  return { re: re + kick, im };
}

function stepTank(tank: Tank, { rate, decay }: Segment): Tank {
  const gap = tank.target - tank.level;
  return {
    level: tank.level + Math.sign(gap) * Math.min(rate, Math.abs(gap)),
    target: tank.target,
    slosh: turn(tank.slosh, SLOSH_PERIOD, decay),
    ripple: turn(tank.ripple, RIPPLE_PERIOD, decay),
  };
}

function runSegment(start: Tank, segment: Segment): { tanks: Tank[]; last: Tank } {
  const excited: Tank = {
    level: start.level,
    target: segment.target,
    slosh: kicked(start.slosh, segment.kick),
    ripple: kicked(start.ripple, segment.kick),
  };
  const run = Array.from({ length: segment.frames }).reduce<Tank[]>(
    (states) => [...states, stepTank(states[states.length - 1], segment)],
    [excited],
  );
  return { tanks: run.slice(0, -1), last: run[run.length - 1] };
}

function runSegments(start: Tank, segments: readonly Segment[]): { tanks: Tank[]; last: Tank } {
  return segments.reduce<{ tanks: Tank[]; last: Tank }>(
    ({ tanks, last }, segment) => {
      const next = runSegment(last, segment);
      return { tanks: [...tanks, ...next.tanks], last: next.last };
    },
    { tanks: [], last: start },
  );
}

function stillTank(level: number): Tank {
  return { level, target: level, slosh: STILL, ripple: STILL };
}

function playOnce(level: number, segments: readonly Segment[]): Tank[] {
  return runSegments(stillTank(level), segments).tanks;
}

function playLoop(level: number, segments: readonly Segment[]): Tank[] {
  const warm = runSegments(stillTank(level), segments).last;
  return runSegments(warm, segments).tanks;
}

function easeFrames(from: number, to: number, rate: number): number {
  return Math.max(1, Math.ceil(Math.abs(to - from) / rate));
}

function segment(target: number, frames: number, rate = EASE_ROWS): Segment {
  return { target, frames, rate, kick: EXCITE_AMP, decay: DECAY };
}

function tankOutput(grid: GridSize, tanks: readonly Tank[]): RecipeOutput {
  const frames = tanks.map((tank) => frameFromHeights(grid, tankHeights(grid, tank)));
  return { frames, durations: evenDurations(frames.length, FRAME_MS) };
}

/** A tank at rest whose surface rocks gently; density sets the rocking height in rows. */
export const generateSlosh: RecipeFn = (grid, params) => {
  const level = IDLE_LEVEL * grid.rows;
  const amp = params.density ?? IDLE_AMP;
  const frames = Array.from({ length: SLOSH_PERIOD }, (_, frame) => {
    const slosh = amp * Math.cos((TAU * frame) / SLOSH_PERIOD);
    const ripple = amp * Math.cos((TAU * frame) / RIPPLE_PERIOD);
    return frameFromHeights(grid, surface(grid, level, slosh, ripple));
  });
  return { frames, durations: evenDurations(frames.length, IDLE_MS) };
};

/** The level eases between 30 and 80 percent and the liquid sloshes at each turn. */
export const generateSloshCycle: RecipeFn = (grid) => {
  const low = LOW_LEVEL * grid.rows;
  const high = HIGH_LEVEL * grid.rows;
  const frames = easeFrames(low, high, EASE_ROWS);
  return tankOutput(grid, playLoop(low, [segment(high, frames), segment(low, frames)]));
};

/** The level steps up in eased stages, sloshing at each update, then drains back to the start. */
export const generateSloshProgress: RecipeFn = (grid) => {
  const levels = PROGRESS_LEVELS.map((share) => share * grid.rows);
  const rises = levels.slice(1).map((target, index) => {
    const frames = Math.max(
      PROGRESS_STEP_FRAMES,
      easeFrames(levels[index], target, EASE_ROWS) + SETTLE_FRAMES,
    );
    return segment(target, frames);
  });
  const top = levels[levels.length - 1];
  const reset = segment(
    levels[0],
    easeFrames(top, levels[0], FAST_EASE_ROWS) + SETTLE_FRAMES,
    FAST_EASE_ROWS,
  );
  return tankOutput(grid, playLoop(levels[0], [...rises, reset]));
};

function drainIntoMask(grid: GridSize, mask: Frame): Frame[] {
  return Array.from({ length: grid.rows }, (_, index) =>
    createFrame(grid, (x, y) => y > index || mask[y * grid.cols + x] === 1),
  );
}

/** The tank fills to the top, holds flat, then drains from the top to leave the check. */
export const generateSloshFull: RecipeFn = (grid) => {
  const low = LOW_LEVEL * grid.rows;
  const fill = segment(grid.rows, easeFrames(low, grid.rows, FAST_EASE_ROWS), FAST_EASE_ROWS);
  const drain = drainIntoMask(grid, glyphMask('check', grid));
  return withLastDuration(
    joinOutputs([
      tankOutput(grid, playOnce(low, [fill])),
      { frames: [createFrame(grid, () => true)], durations: [FULL_HOLD_MS] },
      { frames: drain, durations: evenDurations(drain.length, FRAME_MS) },
    ]),
    RESULT_HOLD_MS,
  );
};

function drainedDepth(dx: number, radius: number): number {
  return Math.abs(dx) > radius ? 0 : Math.floor(Math.sqrt(radius * radius - dx * dx)) + 1;
}

function drainFrame(grid: GridSize, tank: Tank, radius: number): Frame {
  const centre = (grid.cols - 1) / 2;
  const heights = tankHeights(grid, tank).map((height, x) =>
    Math.max(0, Math.round(height) - drainedDepth(x - centre, radius)),
  );
  return frameFromHeights(grid, heights);
}

/** The liquid sloshes violently while dots turn off from the centre of the bottom outward until the tank is empty. */
export const generateSloshDrain: RecipeFn = (grid) => {
  const level = DRAIN_LEVEL * grid.rows;
  const reach = Math.hypot((grid.cols - 1) / 2, grid.rows - 1);
  const count = Math.ceil(reach / HOLE_GROWTH) + 1;
  const violent: Segment = {
    target: 0,
    frames: count,
    rate: EASE_ROWS,
    kick: VIOLENT_AMP,
    decay: VIOLENT_DECAY,
  };
  const frames = playOnce(level, [violent]).map((tank, index) =>
    drainFrame(grid, tank, index === 0 ? NO_HOLE : index * HOLE_GROWTH),
  );
  const firstBlank = frames.findIndex((frame) => frame.every((bit) => bit === 0));
  const played = firstBlank < 0 ? frames : frames.slice(0, firstBlank + 1);
  return withLastDuration(
    { frames: played, durations: evenDurations(played.length, FRAME_MS) },
    RESULT_HOLD_MS,
  );
};
