import type { GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
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
import type { Body, OrreryLayout, OrreryTiming } from './orrery-model';
import { snapOffset, snapPoint } from './path';

const INNER_SHARE = 5;
const OUTER_SHARE = 2;
const ECLIPSE_LOOP = 40;
const ECLIPSE_PASSES = 2;
const ECLIPSE_PHASE = Math.PI;
const FULL_TURN = Math.PI * 2;

/** The orrery's bodies as functions of time in frames. */
export interface OrreryBodies {
  outer: Body;
  inner: Body;
  moon: Body;
}

/** The three bodies of a loop `loop` frames long. */
export function orreryBodies(layout: OrreryLayout, loop: number): OrreryBodies {
  const outer: Body = (time) => onCircle(layout.outer, outerAngle(time, loop));
  return {
    outer,
    inner: (time) => onCircle(layout.inner, innerAngle(time, loop)),
    moon: (time) => plus(outer(time), onCircle(layout.moon, moonAngle(time, loop))),
  };
}

function orreryCells(layout: OrreryLayout, { loop, bodies }: OrreryTiming, time: number): Point[] {
  const { hasInner, hasMoon } = shownBodies(layout, bodies);
  const { outer, inner, moon } = orreryBodies(layout, loop);
  return [
    ...layout.sun,
    ...bodyCells(layout, outer, time, loop / OUTER_SHARE),
    ...(hasInner ? bodyCells(layout, inner, time, loop / INNER_SHARE) : []),
    ...(hasMoon ? [snapPoint(layout.centre, moon(time))] : []),
  ];
}

/** Planets circle the sun at different speeds with short trails and a moon circles the outer one; 120 frames at 60 ms by default (180 from a 15-dot side). */
export function generateOrrery(grid: GridSize, params: RecipeParams): RecipeOutput {
  const layout = orreryLayout(grid, params);
  const timing = orreryTiming(grid, params);
  const frames = Array.from({ length: timing.loop }, (_, time) =>
    createFrameFromPoints(grid, orreryCells(layout, timing, time)),
  );
  return { frames, durations: frames.map(() => ORRERY_FRAME_MS), still: 0 };
}

function isEclipse(time: number): boolean {
  const passLength = ECLIPSE_LOOP / ECLIPSE_PASSES;
  return time % passLength === passLength / 2;
}

function eclipseCells(layout: OrreryLayout, time: number): Point[] {
  if (isEclipse(time)) return [];
  const reach = layout.outer + layout.moon;
  const offset = reach * Math.cos((FULL_TURN * time) / ECLIPSE_LOOP + ECLIPSE_PHASE);
  const moonX = snapOffset(layout.centre.cx, offset);
  const rows = [...new Set(layout.sun.map(([, y]) => y))];
  return [...layout.sun, ...rows.map((y): Point => [moonX, y])];
}

/** The moon swings edge-on through the sun; the sun goes dark for the one frame of each pass where the moon covers it. */
export function generateOrreryEclipse(grid: GridSize, params: RecipeParams): RecipeOutput {
  const layout = orreryLayout(grid, params);
  const frames = Array.from({ length: ECLIPSE_LOOP }, (_, time) =>
    createFrameFromPoints(grid, eclipseCells(layout, time)),
  );
  return { frames, durations: frames.map(() => ORRERY_FRAME_MS), still: 0 };
}
