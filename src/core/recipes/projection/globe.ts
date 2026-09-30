import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { insetCheckStrokes, insetCrossStrokes } from './inset';
import { ringPoints } from './ring';
import { getViewport, overlay, rotateX } from './space';
import type { Vec3 } from './space';

const DEGREE = Math.PI / 180;
const SAMPLE_STEP = 3 * DEGREE;
const FULL_TURN = 2 * Math.PI;
const TILT = 0.35;
const FEW_MERIDIANS = 3;
const MANY_MERIDIANS = 4;
const MANY_MIN_SIDE = 11;
const EQUATOR_MIN_SIDE = 11;
const PERIOD_FRAMES = 7;
const FRAME_MS = 110;
const RIM_CLEARANCE = 1;
const RIDER_PERIODS = 4;
const RIDER_BLINK = 2;
const STILL_MS = 1000;
const RIDER_START = Math.PI / 2;

const TURN_SAMPLES = Array.from(
  { length: Math.round(FULL_TURN / SAMPLE_STEP) },
  (_, index) => index * SAMPLE_STEP,
);
const POLE_GAP = 20 * DEGREE;
const HALF_TURN_SAMPLES = Array.from(
  { length: Math.round((Math.PI - 2 * POLE_GAP) / SAMPLE_STEP) + 1 },
  (_, index) => index * SAMPLE_STEP - Math.PI / 2 + POLE_GAP,
);

/** Globe layout on a grid: centre, rim radius and how many meridians it carries. */
export interface GlobeLayout {
  cx: number;
  cy: number;
  radius: number;
  meridians: number;
  hasEquator: boolean;
}

/** Fits the globe to the grid's shortest side. */
export function getGlobeLayout(grid: GridSize): GlobeLayout {
  const { cx, cy, side } = getViewport(grid);
  return {
    cx,
    cy,
    radius: (side - 1) / 2,
    meridians: side < MANY_MIN_SIDE ? FEW_MERIDIANS : MANY_MERIDIANS,
    hasEquator: side >= EQUATOR_MIN_SIDE,
  };
}

function toDot(layout: GlobeLayout, [x, y]: Vec3): Point {
  return [Math.round(layout.cx + x * layout.radius), Math.round(layout.cy + y * layout.radius)];
}

/** The rim circle as a thin one-dot outline; `inset` pulls it in by whole dots. */
export function rimPoints(layout: GlobeLayout, inset = 0): Point[] {
  return ringPoints({ cx: layout.cx, cy: layout.cy, radius: layout.radius - inset });
}

function surfacePoint(latitude: number, longitude: number): Vec3 {
  const ring = Math.cos(latitude);
  return rotateX([ring * Math.sin(longitude), -Math.sin(latitude), ring * Math.cos(longitude)], TILT);
}

function isClearOfRim(layout: GlobeLayout, [x, y]: Point): boolean {
  return Math.hypot(x - layout.cx, y - layout.cy) <= layout.radius - RIM_CLEARANCE;
}

function frontDots(layout: GlobeLayout, points: readonly Vec3[]): Point[] {
  return points
    .filter(([, , z]) => z <= 0)
    .map((point) => toDot(layout, point))
    .filter((dot) => isClearOfRim(layout, dot));
}

/** The near half of one meridian (a great circle through both poles). */
export function meridianPoints(layout: GlobeLayout, longitude: number): Point[] {
  const halves = [longitude, longitude + Math.PI];
  return frontDots(
    layout,
    halves.flatMap((side) => HALF_TURN_SAMPLES.map((latitude) => surfacePoint(latitude, side))),
  );
}

/** The near half of the equator. */
export function equatorPoints(layout: GlobeLayout): Point[] {
  return frontDots(
    layout,
    TURN_SAMPLES.map((longitude) => surfacePoint(0, longitude)),
  );
}

/** Longitudes of the meridians at `turn` radians of spin. */
export function meridianLongitudes(layout: GlobeLayout, turn: number): number[] {
  return Array.from({ length: layout.meridians }, (_, index) => turn + (index * Math.PI) / layout.meridians);
}

/** The full globe: rim, meridians and, from 11 dots, the equator. */
export function globePoints(layout: GlobeLayout, turn: number): Point[] {
  const meridians = meridianLongitudes(layout, turn).flatMap((longitude) =>
    meridianPoints(layout, longitude),
  );
  const equator = layout.hasEquator ? equatorPoints(layout) : [];
  return [...rimPoints(layout), ...meridians, ...equator];
}

function withRider(grid: GridSize, frame: Frame, rider: Point | undefined): Frame {
  if (rider === undefined) return frame;
  const [x, y] = rider;
  return frame.map((bit, index) => {
    if (Math.floor(index / grid.cols) !== y) return bit;
    const across = Math.abs((index % grid.cols) - x);
    if (across === 0) return 1;
    return across === 1 ? 0 : bit;
  });
}

function spinFrame(grid: GridSize, layout: GlobeLayout, periodFrames: number, index: number): Frame {
  const turn = (Math.PI * index) / (layout.meridians * periodFrames);
  const globe = createFrameFromPoints(grid, globePoints(layout, turn));
  const isShown = index % RIDER_BLINK === 0;
  const [rider] = isShown ? frontDots(layout, [surfacePoint(0, RIDER_START + turn)]) : [];
  return withRider(grid, globe, rider);
}

/** Meridians sliding across a tilted globe while a blinking dot rides the equator; `frames: 1` holds it still. */
export function globeSpin(grid: GridSize, params: RecipeParams): RecipeOutput {
  const layout = getGlobeLayout(grid);
  const periodFrames = params.frames || PERIOD_FRAMES;
  if (periodFrames === 1)
    return { frames: [createFrameFromPoints(grid, globePoints(layout, 0))], durations: [STILL_MS] };
  const frames = Array.from({ length: periodFrames * RIDER_PERIODS }, (_, index) =>
    spinFrame(grid, layout, periodFrames, index),
  );
  return { frames, durations: frames.map(() => FRAME_MS) };
}

const LISTEN_MS = 300;
const SETTLE_MS = 120;
const HOLD_MS = 1500;
const CHECK_INSET = 2;
const GAP_ANGLE = -Math.PI / 4;
const GAP_STEPS = [3, 6] as const;
const SAG_ROWS = 2;

/** The bare rim breathing between its full radius and one dot in, at 300 ms. */
export function globeListen(grid: GridSize): RecipeOutput {
  const layout = getGlobeLayout(grid);
  const frames = [0, 1].map((inset) => createFrameFromPoints(grid, rimPoints(layout, inset)));
  return { frames, durations: frames.map(() => LISTEN_MS) };
}

function linesWithout(layout: GlobeLayout, removed: number): Point[] {
  const kept = meridianLongitudes(layout, 0).slice(removed);
  const equator = layout.hasEquator && kept.length > 0 ? equatorPoints(layout) : [];
  return [...kept.flatMap((longitude) => meridianPoints(layout, longitude)), ...equator];
}

/** The spin stops, the meridians leave one per 120 ms, and a check draws inside the rim. */
export function globeSettle(grid: GridSize): RecipeOutput {
  const layout = getGlobeLayout(grid);
  const rim = rimPoints(layout);
  const clearing = Array.from({ length: layout.meridians + 1 }, (_, removed) =>
    createFrameFromPoints(grid, [...rim, ...linesWithout(layout, removed)]),
  );
  const check = insetCheckStrokes(grid, CHECK_INSET);
  const rimFrame = clearing[clearing.length - 1];
  const drawn = check.frames.map((frame) => overlay(rimFrame, frame));
  return {
    frames: [...clearing, ...drawn],
    durations: [...clearing.map(() => SETTLE_MS), ...check.durations.slice(0, -1), HOLD_MS],
  };
}

function gapCells(layout: GlobeLayout, size: number): Point[] {
  const target: Point = [
    layout.cx + Math.cos(GAP_ANGLE) * layout.radius,
    layout.cy + Math.sin(GAP_ANGLE) * layout.radius,
  ];
  const byDistance = [...rimPoints(layout)].sort(
    (a, b) => Math.hypot(a[0] - target[0], a[1] - target[1]) - Math.hypot(b[0] - target[0], b[1] - target[1]),
  );
  return byDistance.slice(0, size);
}

function tear(frame: Frame, grid: GridSize, gap: readonly Point[]): Frame {
  const cells = new Set(gap.map(([x, y]) => y * grid.cols + x));
  return frame.map((bit, index) => (cells.has(index) ? 0 : bit));
}

function sagged(layout: GlobeLayout, removed: number, rows: number): Point[] {
  return linesWithout(layout, removed)
    .map(([x, y]): Point => [x, y + rows])
    .filter((dot) => isClearOfRim(layout, dot));
}

/** The spin stops, a gap tears open in the rim at the top right, the lines sag and fall away, and a cross draws inside. */
export function globeBreak(grid: GridSize): RecipeOutput {
  const layout = getGlobeLayout(grid);
  const rim = rimPoints(layout);
  const [small, wide] = GAP_STEPS.map((size) => gapCells(layout, size));
  const opening = [
    tear(createFrameFromPoints(grid, globePoints(layout, 0)), grid, []),
    tear(createFrameFromPoints(grid, [...rim, ...sagged(layout, 0, 0)]), grid, small),
  ];
  const falling = Array.from({ length: layout.meridians + SAG_ROWS }, (_, step) =>
    tear(
      createFrameFromPoints(grid, [
        ...rim,
        ...sagged(layout, Math.max(0, step - 1), Math.min(step + 1, SAG_ROWS)),
      ]),
      grid,
      wide,
    ),
  );
  const torn = tear(createFrameFromPoints(grid, rim), grid, wide);
  const cross = insetCrossStrokes(grid, CHECK_INSET);
  const drawn = cross.frames.map((frame) => overlay(torn, frame));
  const frames = [...opening, ...falling, torn, ...drawn];
  return {
    frames,
    durations: [
      ...[...opening, ...falling, torn].map(() => SETTLE_MS),
      ...cross.durations.slice(0, -1),
      HOLD_MS,
    ],
  };
}
