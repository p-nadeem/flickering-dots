import type { Frame, GridSize, RecipeParams } from '../../types';
import { generateEllipsis } from '../ellipsis';
import { mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { generateHop } from '../hop';
import {
  easeInOut,
  joinOutputs,
  maskFromPoints,
  pointsOf,
  range,
  readGlyph,
  RESULT_GLYPHS,
  resultMask,
  resultTail,
} from './shared';

const MORPH_STEPS = 6;
const STEP_MS = 60;
const SAMPLE_MS = 20;
const FLIGHT_SAMPLES = (MORPH_STEPS * STEP_MS) / SAMPLE_MS;
const USED_PENALTY = 1000;
const ELLIPSIS = 'ellipsis';
/** Glyphs the morph variant flies into. */
export const MORPH_GLYPHS: readonly string[] = [...RESULT_GLYPHS, ELLIPSIS];

type Pair = readonly [from: Point, to: Point];

interface Pairing {
  pairs: readonly Pair[];
  uses: readonly number[];
}

function squaredDistance([ax, ay]: Point, [bx, by]: Point): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function nearestTarget(source: Point, targets: readonly Point[], uses: readonly number[]): number {
  const scores = targets.map((target, index) => squaredDistance(source, target) + USED_PENALTY * uses[index]);
  return scores.indexOf(Math.min(...scores));
}

function pairUp(sources: readonly Point[], targets: readonly Point[]): readonly Pair[] {
  const start: Pairing = { pairs: [], uses: targets.map(() => 0) };
  return range(0, Math.max(sources.length, targets.length)).reduce<Pairing>(({ pairs, uses }, index) => {
    const source = sources[index % sources.length];
    const chosen = nearestTarget(source, targets, uses);
    return {
      pairs: [...pairs, [source, targets[chosen]] as const],
      uses: uses.map((used, at) => (at === chosen ? used + 1 : used)),
    };
  }, start).pairs;
}

function lerp(from: number, to: number, t: number): number {
  return Math.round(from + (to - from) * t);
}

/** Flies every lit dot of `from` to its greedy nearest dot of `to` along eased paths: `steps + 1` frames from `from` to `to`. */
export function morphMasks(grid: GridSize, from: Frame, to: Frame, steps = MORPH_STEPS): Frame[] {
  const sources = pointsOf(from, grid);
  const targets = pointsOf(to, grid);
  if (sources.length === 0 || targets.length === 0) return [to];
  const pairs = pairUp(sources, targets);
  return range(0, steps + 1).map((step) => {
    const t = easeInOut(step / steps);
    return maskFromPoints(
      grid,
      pairs.map(([[fx, fy], [tx, ty]]): Point => [lerp(fx, tx, t), lerp(fy, ty, t)]),
    );
  });
}

function flyMasks(grid: GridSize, from: Frame, to: Frame): RecipeOutput {
  const frames = morphMasks(grid, from, to, FLIGHT_SAMPLES);
  return mergeRepeatedFrames({ frames, durations: frames.map(() => SAMPLE_MS) });
}

function lastOf(frames: readonly Frame[]): Frame {
  return frames[frames.length - 1];
}

function morphEnds(grid: GridSize, glyph: string): readonly [from: Frame, to: Frame] {
  if (glyph === ELLIPSIS) return [resultMask('cross', grid), lastOf(generateEllipsis(grid).frames)];
  return [lastOf(generateHop(grid).frames), resultMask(glyph, grid)];
}

/** The hopping dots fly apart and become the glyph over eased time, each distinct position shown once; the ellipsis glyph flows the cross back into three dots. */
export function generateMorph(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const glyph = readGlyph(params.glyph, MORPH_GLYPHS, 'morph', 'check');
  const [from, to] = morphEnds(grid, glyph);
  const flown = flyMasks(grid, from, to);
  const tail = resultTail(grid, to, glyph);
  const keep = tail.frames.length > 1 ? flown.frames.length : flown.frames.length - 1;
  const flight = { frames: flown.frames.slice(0, keep), durations: flown.durations.slice(0, keep) };
  return joinOutputs(flight, tail);
}
