import type { GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { orreryBodies } from './orrery';
import {
  ORRERY_FRAME_MS,
  bodyCells,
  innerAngle,
  moonAngle,
  onCircle,
  orreryLayout,
  orreryTiming,
  outerAngle,
  plus,
  shownBodies,
} from './orrery-model';
import type { Body, OrreryLayout } from './orrery-model';
import { snapPoint } from './path';

const FULL_TURN = Math.PI * 2;
const ALIGN_FRAMES = 8;
const ALIGN_HOLD_MS = 500;
const PULSE_MS = 120;
const HOLD_MS = 1500;
const ESCAPE_GROWTH = 1.25;
const ESCAPE_MAX_FRAMES = 48;
interface Angles {
  outer: number;
  inner: number;
  moon: number;
}

function ease(share: number): number {
  return (1 - Math.cos(Math.PI * share)) / 2;
}

function nextAlignedAngle(angle: number): number {
  return Math.ceil(angle / FULL_TURN) * FULL_TURN;
}

function easedAngle(start: number, share: number): number {
  return start + (nextAlignedAngle(start) - start) * ease(share);
}

function alignedCells(layout: OrreryLayout, bodies: number, angles: Angles): Point[] {
  const { hasInner, hasMoon } = shownBodies(layout, bodies);
  const outer = onCircle(layout.outer, angles.outer);
  const moon = plus(outer, onCircle(layout.moon, angles.moon));
  return [
    ...layout.sun,
    snapPoint(layout.centre, outer),
    ...(hasInner ? [snapPoint(layout.centre, onCircle(layout.inner, angles.inner))] : []),
    ...(hasMoon ? [snapPoint(layout.centre, moon)] : []),
  ];
}

function sunFlare(sun: readonly Point[]): Point[] {
  const xs = sun.map(([x]) => x);
  const ys = sun.map(([, y]) => y);
  const left = Math.min(...xs) - 1;
  const right = Math.max(...xs) + 1;
  const top = Math.min(...ys) - 1;
  const bottom = Math.max(...ys) + 1;
  return [...sun, [left, top], [right, top], [left, bottom], [right, bottom]];
}

/** The planets and moon ease into one row to the right of the sun over 8 frames, hold 500 ms, the sun flares once, and the row holds. */
export function generateOrreryAlign(grid: GridSize, params: RecipeParams): RecipeOutput {
  const layout = orreryLayout(grid, params);
  const { loop, bodies } = orreryTiming(grid, params);
  const start: Angles = { outer: outerAngle(0, loop), inner: innerAngle(0, loop), moon: moonAngle(0, loop) };
  const steps = Array.from({ length: ALIGN_FRAMES + 1 }, (_, step) => {
    const share = step / ALIGN_FRAMES;
    const angles = {
      outer: easedAngle(start.outer, share),
      inner: easedAngle(start.inner, share),
      moon: easedAngle(start.moon, share),
    };
    return alignedCells(layout, bodies, angles);
  });
  const row = steps[ALIGN_FRAMES];
  const cells = [...steps, [...row, ...sunFlare(layout.sun)], row];
  return mergeRepeatedFrames({
    frames: cells.map((points) => createFrameFromPoints(grid, points)),
    durations: [
      ...steps.map((_, step) => (step === ALIGN_FRAMES ? ALIGN_HOLD_MS : ORRERY_FRAME_MS)),
      PULSE_MS,
      HOLD_MS,
    ],
  });
}

function escapingOuter(layout: OrreryLayout, loop: number): Body {
  const startAngle = outerAngle(0, loop);
  const start = onCircle(layout.outer, startAngle);
  const speed = layout.outer * (outerAngle(1, loop) - startAngle);
  const growth = Math.log(ESCAPE_GROWTH);
  return (time) => {
    if (time <= 0) return onCircle(layout.outer, outerAngle(time, loop));
    const distance = (speed * (ESCAPE_GROWTH ** time - 1)) / growth;
    return plus(start, [-Math.sin(startAngle) * distance, Math.cos(startAngle) * distance]);
  };
}

function isOutside({ cols, rows }: GridSize, [x, y]: Point): boolean {
  return x < 0 || y < 0 || x >= cols || y >= rows;
}

function escapeCells(
  grid: GridSize,
  params: RecipeParams,
  time: number,
): { cells: Point[]; isGone: boolean } {
  const layout = orreryLayout(grid, params);
  const { loop, bodies } = orreryTiming(grid, params);
  const { hasInner, hasMoon } = shownBodies(layout, bodies);
  const outer = escapingOuter(layout, loop);
  const leaving = [
    ...bodyCells(layout, outer, time, loop),
    ...(hasMoon
      ? [snapPoint(layout.centre, plus(outer(time), onCircle(layout.moon, moonAngle(time, loop))))]
      : []),
  ];
  const inner = hasInner ? bodyCells(layout, orreryBodies(layout, loop).inner, time, loop) : [];
  const isGone = leaving.every((cell) => isOutside(grid, cell));
  return { cells: [...layout.sun, ...inner, ...(isGone ? [] : leaving)], isGone };
}

/** The outer planet leaves on its tangent, speeding up, and takes its moon off the grid; the sun and inner planet hold. */
export function generateOrreryEscape(grid: GridSize, params: RecipeParams): RecipeOutput {
  const flight = Array.from({ length: ESCAPE_MAX_FRAMES }, (_, time) => escapeCells(grid, params, time));
  const goneAt = flight.findIndex(({ isGone }) => isGone);
  const shown = flight.slice(0, goneAt < 0 ? flight.length : goneAt + 1);
  return {
    frames: shown.map(({ cells }) => createFrameFromPoints(grid, cells)),
    durations: shown.map((_, index) => (index === shown.length - 1 ? HOLD_MS : ORRERY_FRAME_MS)),
  };
}
