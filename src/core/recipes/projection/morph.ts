import type { Frame, GridSize } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point } from '../helpers';
import { lerp, smoothstep, steps } from './space';

const USED_PENALTY = 1000;
const MORPH_STEPS = 6;
const MORPH_MS = 100;

/** Frames of a morph plus their durations. */
export interface MorphClip {
  frames: Frame[];
  durations: number[];
}

/** Lit cells of a frame as points, in row-major order. */
export function litPoints(frame: Frame, cols: number): Point[] {
  return frame.flatMap((bit, index): Point[] =>
    bit === 1 ? [[index % cols, Math.floor(index / cols)]] : [],
  );
}

function distance([ax, ay]: Point, [bx, by]: Point): number {
  return Math.hypot(ax - bx, ay - by);
}

function nearestTarget(source: Point, targets: readonly Point[], uses: readonly number[]): number {
  return targets.reduce(
    (best, target, index) => {
      const cost = distance(source, target) + uses[index] * USED_PENALTY;
      return cost < best.cost ? { index, cost } : best;
    },
    { index: 0, cost: Number.POSITIVE_INFINITY },
  ).index;
}

function pairUp(sources: readonly Point[], targets: readonly Point[]): (readonly [Point, Point])[] {
  const count = Math.max(sources.length, targets.length);
  const cycled = Array.from({ length: count }, (_, index) => sources[index % sources.length]);
  const start = { pairs: [] as (readonly [Point, Point])[], uses: targets.map(() => 0) };
  return cycled.reduce((state, source) => {
    const chosen = nearestTarget(source, targets, state.uses);
    return {
      pairs: [...state.pairs, [source, targets[chosen]] as const],
      uses: state.uses.map((used, index) => (index === chosen ? used + 1 : used)),
    };
  }, start).pairs;
}

function between([from, to]: readonly [Point, Point], t: number): Point {
  return [Math.round(lerp(from[0], to[0], t)), Math.round(lerp(from[1], to[1], t))];
}

/** Moves the lit cells of `source` onto the lit cells of `target` by nearest free cell, eased over 6 frames. */
export function morphFrames(grid: GridSize, source: Frame, target: Frame): MorphClip {
  const sources = litPoints(source, grid.cols);
  const targets = litPoints(target, grid.cols);
  if (sources.length === 0 || targets.length === 0) return { frames: [target], durations: [MORPH_MS] };
  const pairs = pairUp(sources, targets);
  const frames = steps(MORPH_STEPS).map((t, index) =>
    index === MORPH_STEPS - 1
      ? target
      : createFrameFromPoints(
          grid,
          pairs.map((pair) => between(pair, smoothstep(t))),
        ),
  );
  return { frames, durations: frames.map(() => MORPH_MS) };
}
