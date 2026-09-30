import { createRng } from '../../rng';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrame } from '../helpers';
import type { RecipeOutput } from '../helpers';
import { joinOutputs, range, readGlyph, RESULT_GLYPHS, resultMask, resultTail } from './shared';

const STEP_MS = 60;
const TAIL = 2;
const SLOW_SPEED = 2;
const FAST_CHANCE = 0.5;
const RESPAWN_REACH = 3;
const START_REACH_MAX = 7;
const MAX_FRAMES = 400;
const RAIN_DEFAULT_SEED = 1;

interface Stream {
  head: number;
  speed: number;
  tick: number;
}

interface RainState {
  streams: readonly Stream[];
  stuck: ReadonlySet<number>;
}

interface RainRun {
  grid: GridSize;
  target: Frame;
  need: number;
  random: () => number;
}

function spawnStream(random: () => number, reach: number): Stream {
  const head = -Math.floor(random() * reach);
  return { head, speed: random() < FAST_CHANCE ? 1 : SLOW_SPEED, tick: 0 };
}

function isDrained(stream: Stream, rows: number): boolean {
  return stream.head - TAIL >= rows;
}

function advance(stream: Stream, run: RainRun, isDone: boolean): Stream {
  const tick = stream.tick + 1;
  const speed = isDone ? 1 : stream.speed;
  const moved = { ...stream, tick, head: tick % speed === 0 ? stream.head + 1 : stream.head };
  if (!isDrained(moved, run.grid.rows) || isDone) return moved;
  return { ...spawnStream(run.random, RESPAWN_REACH), speed: moved.speed };
}

function stickAt(stream: Stream, x: number, run: RainRun): number[] {
  const { cols, rows } = run.grid;
  const index = stream.head * cols + x;
  return stream.head >= 0 && stream.head < rows && run.target[index] === 1 ? [index] : [];
}

function drawRain(state: RainState, grid: GridSize): Frame {
  return createFrame(grid, (x, y) => {
    const { head } = state.streams[x];
    return state.stuck.has(y * grid.cols + x) || (y <= head && y >= head - TAIL);
  });
}

function stepRain(state: RainState, run: RainRun): RainState {
  const isDone = state.stuck.size === run.need;
  const streams = state.streams.map((stream) => advance(stream, run, isDone));
  const stuck = new Set([...state.stuck, ...streams.flatMap((stream, x) => stickAt(stream, x, run))]);
  return { streams, stuck };
}

function isFinished(state: RainState, run: RainRun): boolean {
  return state.stuck.size === run.need && state.streams.every((stream) => isDrained(stream, run.grid.rows));
}

function fall(run: RainRun): Frame[] {
  const start: RainState = {
    streams: range(0, run.grid.cols).map(() =>
      spawnStream(run.random, Math.min(run.grid.rows, START_REACH_MAX)),
    ),
    stuck: new Set(),
  };
  const walk = (state: RainState, frames: readonly Frame[]): Frame[] => {
    const next = stepRain(state, run);
    if (isFinished(next, run) || frames.length >= MAX_FRAMES) return [...frames];
    return walk(next, [...frames, drawRain(next, run.grid)]);
  };
  return walk(start, []);
}

/** Digital rain decodes the glyph: heads stick on target dots, spawning stops once it is whole, then the rain drains. */
export function generateRainReveal(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const glyph = readGlyph(params.glyph, RESULT_GLYPHS, 'rain', 'check');
  const target = resultMask(glyph, grid);
  const run: RainRun = {
    grid,
    target,
    need: target.filter((bit) => bit === 1).length,
    random: createRng(params.seed ?? RAIN_DEFAULT_SEED),
  };
  const frames = fall(run);
  return joinOutputs({ frames, durations: frames.map(() => STEP_MS) }, resultTail(grid, target, glyph));
}
