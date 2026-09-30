import type { GridSize } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { createRng } from '../../rng';
import { edgeDots, placeSky, spanningEdges } from './constellation-layout';
import {
  clampCount,
  diagonalPoints,
  fallShots,
  mergedOutput,
  pickIndex,
  plusPoints,
  shot,
  shotsToOutput,
  shuffled,
  withoutPoints,
} from './shots';
import type { Shot } from './shots';
import type { NetworkOptions } from './network-options';

const SPARKLE_MS = 70;
const LINE_MS = 40;
const HOLD_FRAMES = 6;
const HOLD_FRAME_MS = 100;
const TWINKLES = 2;
const DISSOLVE_STEPS = 8;
const DISSOLVE_MS = 70;
const FADE_MS = 90;
const DARK_MS = 300;
const DEFAULT_STARS = 5;
const MAX_STARS = 8;
const MIN_STARS = 2;
const LOCK_SPARKLE_MS = 80;
const LOCK_HOLD_MS = 1500;
const SNAP_SETTLE_MS = 300;
const SNAP_CRACK_MS = 150;
const SNAP_GAP_MS = 400;
const SNAP_DROP_STEPS = 4;
const SNAP_DROP_MS = 60;
const FALL_MS = 70;
const END_MS = 600;
const WIDE_GAP_MIN_DOTS = 5;
const SMALL_RADIUS = 1;
const BIG_RADIUS = 2;

interface Sky {
  stars: Point[];
  lines: Point[];
}

function buildSky(grid: GridSize, count: number, rng: () => number): Sky {
  const stars = placeSky(grid, count, rng);
  return { stars, lines: spanningEdges(stars).flatMap(edgeDots) };
}

function sparkleShapes(star: Point): Point[][] {
  return [
    [star],
    plusPoints(star, SMALL_RADIUS),
    plusPoints(star, BIG_RADIUS),
    diagonalPoints(star, SMALL_RADIUS),
    [star],
  ];
}

function appearShots(stars: readonly Point[]): Shot[] {
  return stars.flatMap((star, index) =>
    sparkleShapes(star).map((shape) => shot([...stars.slice(0, index), ...shape], SPARKLE_MS)),
  );
}

function revealShots({ stars, lines }: Sky): Shot[] {
  return lines.map((_, index) => shot([...stars, ...lines.slice(0, index + 1)], LINE_MS));
}

function holdShots({ stars, lines }: Sky, rng: () => number): Shot[] {
  const twinkleFrames = shuffled(
    rng,
    Array.from({ length: HOLD_FRAMES }, (_, index) => index),
  ).slice(0, TWINKLES);
  return Array.from({ length: HOLD_FRAMES }, (_, frame) => {
    const dark = twinkleFrames.includes(frame) ? [stars[pickIndex(rng, stars.length)]] : [];
    return shot([...withoutPoints(stars, dark), ...lines], HOLD_FRAME_MS);
  });
}

function dissolveShots(
  stars: readonly Point[],
  lines: readonly Point[],
  steps: number,
  ms: number,
  rng: () => number,
): Shot[] {
  const order = shuffled(rng, lines);
  return Array.from({ length: steps }, (_, step) =>
    shot([...stars, ...order.slice(Math.round((order.length * (step + 1)) / steps))], ms),
  );
}

function fadeShots(stars: readonly Point[]): Shot[] {
  return stars.map((_, index) => {
    const kept = stars.slice(0, stars.length - index - 1);
    return shot(kept, kept.length === 0 ? DARK_MS : FADE_MS);
  });
}

function starCount(length: number | undefined, fallback: number): number {
  return clampCount(length, fallback, MIN_STARS, MAX_STARS);
}

/** Stars sparkle in one by one, spanning-tree lines join them, hold with twinkles, then dissolve. */
export function generateConstellation(grid: GridSize, { seed, length }: NetworkOptions): RecipeOutput {
  const rng = createRng(seed);
  const sky = buildSky(grid, starCount(length, DEFAULT_STARS), rng);
  const shots = [
    ...appearShots(sky.stars),
    ...revealShots(sky),
    ...holdShots(sky, rng),
    ...dissolveShots(sky.stars, sky.lines, DISSOLVE_STEPS, DISSOLVE_MS, rng),
    ...fadeShots(sky.stars),
  ];
  return mergedOutput(grid, shots);
}

function formShots(sky: Sky): Shot[] {
  const appear = sky.stars.map((_, index) => shot(sky.stars.slice(0, index + 1), SPARKLE_MS));
  return [...appear, ...revealShots(sky)];
}

/** The constellation forms, every star flares at once over a dark sky, then the figure holds. */
export function generateConstellationLock(grid: GridSize, { seed, length }: NetworkOptions): RecipeOutput {
  const sky = buildSky(grid, starCount(length, DEFAULT_STARS), createRng(seed));
  const synced = [
    (star: Point) => plusPoints(star, SMALL_RADIUS),
    (star: Point) => plusPoints(star, BIG_RADIUS),
    (star: Point) => diagonalPoints(star, SMALL_RADIUS),
  ].map((shape) => shot(sky.stars.flatMap(shape), LOCK_SPARKLE_MS));
  return shotsToOutput(grid, [
    ...formShots(sky),
    ...synced,
    shot([...sky.stars, ...sky.lines], LOCK_HOLD_MS),
  ]);
}

function longestEdgeDots(sky: Sky): Point[] {
  return spanningEdges(sky.stars)
    .map(edgeDots)
    .reduce<Point[]>((longest, dots) => (dots.length > longest.length ? dots : longest), []);
}

function gapCells(dots: readonly Point[]): { crack: Point[]; gap: Point[] } {
  if (dots.length === 0) return { crack: [], gap: [] };
  const middle = Math.floor(dots.length / 2);
  const crack = [dots[middle]];
  return { crack, gap: dots.length >= WIDE_GAP_MIN_DOTS ? dots.slice(middle - 1, middle + 2) : crack };
}

/** The constellation forms, a gap opens mid-line, the lines drop out and the stars fall off the bottom. */
export function generateConstellationSnap(grid: GridSize, { seed, length }: NetworkOptions): RecipeOutput {
  const rng = createRng(seed);
  const sky = buildSky(grid, starCount(length, DEFAULT_STARS), rng);
  const { crack, gap } = gapCells(longestEdgeDots(sky));
  const broken = withoutPoints(sky.lines, gap);
  const widening =
    gap.length > crack.length
      ? [shot([...sky.stars, ...withoutPoints(sky.lines, crack)], SNAP_CRACK_MS)]
      : [];
  const before = [
    ...formShots(sky),
    shot([...sky.stars, ...sky.lines], SNAP_SETTLE_MS),
    ...widening,
    shot([...sky.stars, ...broken], SNAP_GAP_MS),
  ];
  const falling = fallShots(sky.stars, [], grid.rows, FALL_MS);
  const after = [
    ...dissolveShots(sky.stars, broken, SNAP_DROP_STEPS, SNAP_DROP_MS, rng),
    ...falling.slice(0, -1),
    ...falling.slice(-1).map(({ points }) => shot(points, END_MS)),
  ];
  return shotsToOutput(grid, [...before, ...after], before.length - 1);
}
