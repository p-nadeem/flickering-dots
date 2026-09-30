import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import { framesEqual } from '../../frame';
import { mergeRepeatedFrames } from '../helpers';
import type { RecipeOutput } from '../helpers';
import { drawBalls, getMetaballGeometry, orbitBalls, pickBallCount, pickThreshold } from './metaball-field';
import type { MetaballGeometry } from './metaball-field';
import { pickCount, TAU } from './shared';

const LAVA_FRAMES = 24;
const LAVA_MS = 90;
const BREATH_FRAMES = 16;
const BREATH_MS = 160;
const BREATH_SWING = 0.2;
const VOICE_FRAMES = 16;
const VOICE_MS = 90;
const VOICE_LOW = 0.8;
const VOICE_RANGE = 0.4;
const VOICE_FRAMES_PER_KEY = 2;
const SINGLE_BALL_SCALE = 1.3;
const MAX_FRAMES = 256;
const STILL_TURN = 4;

function drawSingle(grid: GridSize, geometry: MetaballGeometry, scale: number, threshold: number) {
  const ball = { x: geometry.cx, y: geometry.cy, r: geometry.radius * SINGLE_BALL_SCALE * scale };
  return drawBalls(grid, [ball], threshold);
}

function voiceLevels(seed: number, count: number): number[] {
  const random = createRng(seed);
  const keyCount = Math.max(1, Math.ceil(count / VOICE_FRAMES_PER_KEY));
  const keys = Array.from({ length: keyCount }, () => VOICE_LOW + VOICE_RANGE * random());
  return Array.from({ length: count }, (_, index) => {
    const position = (index * keyCount) / count;
    const from = Math.floor(position);
    const mix = position - from;
    return keys[from] * (1 - mix) + keys[(from + 1) % keyCount] * mix;
  });
}

function generateSingle(grid: GridSize, params: RecipeParams): RecipeOutput {
  const geometry = getMetaballGeometry(grid);
  const threshold = pickThreshold(params);
  if (params.seed !== undefined) {
    const levels = voiceLevels(params.seed, pickCount(params.frames, VOICE_FRAMES, MAX_FRAMES));
    const frames = levels.map((level) => drawSingle(grid, geometry, level, threshold));
    return mergeRepeatedFrames({ frames, durations: frames.map(() => VOICE_MS) });
  }
  const count = pickCount(params.frames, BREATH_FRAMES, MAX_FRAMES);
  const frames = Array.from({ length: count }, (_, index) =>
    drawSingle(grid, geometry, 1 + BREATH_SWING * Math.sin((TAU * index) / count), threshold),
  );
  return mergeRepeatedFrames({ frames, durations: frames.map(() => BREATH_MS) });
}

/** Metaballs that drift, touch, merge through a neck and part again (still: the parted lobes); one ball breathes, or follows a seeded voice level. */
export function generateMetaball(grid: GridSize, params: RecipeParams): RecipeOutput {
  const ballCount = pickBallCount(params);
  if (ballCount === 1) return generateSingle(grid, params);
  const geometry = getMetaballGeometry(grid);
  const threshold = pickThreshold(params);
  const count = pickCount(params.frames, LAVA_FRAMES, MAX_FRAMES);
  const frames = Array.from({ length: count }, (_, index) =>
    drawBalls(grid, orbitBalls(geometry, (TAU * index) / count, ballCount), threshold),
  );
  const parted = frames[Math.floor(count / STILL_TURN)];
  const merged = mergeRepeatedFrames({ frames, durations: frames.map(() => LAVA_MS) });
  return { ...merged, still: merged.frames.findIndex((frame) => framesEqual(frame, parted)) };
}
