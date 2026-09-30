import type { Point } from '../helpers';
import { easeInOut, range } from './shared';

const USED_PENALTY = 1000;

/** Frames a morph takes by default. */
export const MORPH_STEPS = 6;

interface Pairing {
  pairs: readonly (readonly [Point, Point])[];
  uses: readonly number[];
}

function squaredDistance([ax, ay]: Point, [bx, by]: Point): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function nearestTarget(source: Point, targets: readonly Point[], uses: readonly number[]): number {
  const scores = targets.map((target, index) => squaredDistance(source, target) + USED_PENALTY * uses[index]);
  return scores.indexOf(Math.min(...scores));
}

function pairUp(sources: readonly Point[], targets: readonly Point[]): Pairing['pairs'] {
  const count = Math.max(sources.length, targets.length);
  const start: Pairing = { pairs: [], uses: targets.map(() => 0) };
  return range(0, count).reduce<Pairing>(({ pairs, uses }, index) => {
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

/** Moves grains from one mask to another by greedy nearest pairing, easing over `steps` frames that end on the target. */
export function morphPoints(from: readonly Point[], to: readonly Point[], steps = MORPH_STEPS): Point[][] {
  if (from.length === 0 || to.length === 0) return [[...to]];
  const pairs = pairUp(from, to);
  return range(1, steps + 1).map((step) => {
    const t = easeInOut(step / steps);
    return pairs.map(([[fx, fy], [tx, ty]]): Point => [lerp(fx, tx, t), lerp(fy, ty, t)]);
  });
}
