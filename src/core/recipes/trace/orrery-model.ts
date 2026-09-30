import type { GridSize, RecipeParams } from '../../types';
import { getCentre } from '../helpers';
import type { Centre, Point } from '../helpers';
import { centreBlock, snapPoint } from './path';
import type { Vec } from './path';

/** Where a body is, as an offset from the sun, at a time in frames (fractions allowed). */
export type Body = (time: number) => Vec;

/** Orbit radii, sun cells and trail length of the orrery on one grid; `inner` is 0 when the grid is too small for it. */
export interface OrreryLayout {
  centre: Centre;
  sun: Point[];
  outer: number;
  inner: number;
  moon: number;
  trail: number;
}

/** Loop length and body count of the orrery. */
export interface OrreryTiming {
  loop: number;
  bodies: number;
}

const FULL_TURN = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;
const WIDE_SIDE = 11;
const WIDE_MOON = 2;
const NARROW_MOON = 1;
const INNER_MIN = 2;
const OUTER_TURNS = 2;
const INNER_TURNS = 5;
const MOON_TURNS = 5;
const LARGE_SIDE = 15;
const TRAIL_STEP = 0.1;
const MOON_BODIES = 3;
const INNER_BODIES = 2;

/** Default loop in frames: the outer planet turns twice, the inner planet and the moon five times each. */
export const ORRERY_LOOP = 120;
/** Default loop from a 15-dot short side up, slower so no body moves more than one cell a frame. */
export const ORRERY_LARGE_LOOP = 180;
/** Default number of bodies: outer planet, inner planet and moon. */
export const ORRERY_BODIES = 3;
/** Frame length of the orrery, in ms. */
export const ORRERY_FRAME_MS = 60;

/** Sizes the orbits to the grid's short side: the moon's orbit touches the edge, the inner orbit sits halfway. */
export function orreryLayout(grid: GridSize, params: RecipeParams): OrreryLayout {
  const side = Math.min(grid.cols, grid.rows);
  const half = (side - 1) / 2;
  const moon = side >= WIDE_SIDE ? WIDE_MOON : NARROW_MOON;
  const outer = Math.max(0, half - moon);
  const inner = outer / 2 >= INNER_MIN ? outer / 2 : 0;
  const trail = params.trail ?? (side >= WIDE_SIDE ? 1 : 0);
  return { centre: getCentre(grid), sun: centreBlock(grid), outer, inner, moon, trail };
}

/** Reads the loop length (`frames`, default 120, or 180 from a 15-dot short side) and body count (`length`, default 3). */
export function orreryTiming(grid: GridSize, params: RecipeParams): OrreryTiming {
  const fallback = Math.min(grid.cols, grid.rows) >= LARGE_SIDE ? ORRERY_LARGE_LOOP : ORRERY_LOOP;
  return { loop: params.frames || fallback, bodies: params.length ?? ORRERY_BODIES };
}

/** A point on a circle; angles grow clockwise on screen from three o'clock. */
export function onCircle(radius: number, angle: number): Vec {
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

/** The outer planet's angle: it starts at twelve o'clock. */
export function outerAngle(time: number, loop: number): number {
  return -QUARTER_TURN + (FULL_TURN * OUTER_TURNS * time) / loop;
}

/** The inner planet's angle: it starts at six o'clock. */
export function innerAngle(time: number, loop: number): number {
  return QUARTER_TURN + (FULL_TURN * INNER_TURNS * time) / loop;
}

/** The moon's angle about the outer planet: it starts at three o'clock. */
export function moonAngle(time: number, loop: number): number {
  return (FULL_TURN * MOON_TURNS * time) / loop;
}

/** Adds two offsets. */
export function plus(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1]];
}

/** The body's cell now plus its `trail` previous distinct cells, sampled back along its motion. */
export function bodyCells(layout: OrreryLayout, body: Body, time: number, reach: number): Point[] {
  const samples = Math.ceil(reach / TRAIL_STEP);
  const cells = Array.from({ length: samples + 1 }, (_, step) =>
    snapPoint(layout.centre, body(time - step * TRAIL_STEP)),
  );
  const distinct = cells.filter(
    (cell, index) => index === 0 || cell[0] !== cells[index - 1][0] || cell[1] !== cells[index - 1][1],
  );
  return distinct.slice(0, layout.trail + 1);
}

/** Whether the inner planet and the moon are shown for this body count and layout. */
export function shownBodies(layout: OrreryLayout, bodies: number): { hasInner: boolean; hasMoon: boolean } {
  return { hasInner: bodies >= INNER_BODIES && layout.inner > 0, hasMoon: bodies >= MOON_BODIES };
}
