import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrame, getCentre } from '../helpers';
import { smoothBlobs } from './cleanup';
import { pickCount } from './shared';

/** One metaball: a centre and a radius in dots. */
export interface Ball {
  x: number;
  y: number;
  r: number;
}

/** Where the metaballs orbit on a grid: the centre, the base radius and the swing on each axis. */
export interface MetaballGeometry {
  cx: number;
  cy: number;
  radius: number;
  swingX: number;
  swingY: number;
}

const SMALL_GRID_SIDE = 9;
const SMALL_GRID_RADIUS = 0.25;
const RADIUS = 0.2;
const ORBIT_INSET = 0.9;
const SIDE_INSET = 1.2;
const VERTICAL_SWING = 0.8;
const SMALL_BALL_OFFSET = 0.9;
const SMALL_BALL_RADIUS = 0.4;
const FIELD_EPSILON = 0.01;
const MIN_THRESHOLD = 0.5;
const DEFAULT_THRESHOLD = 1;
const MAX_BALLS = 3;
const DEFAULT_BALLS = 3;
const DOUBLE_SPEED = 2;

/** Orbit geometry of the metaballs on `grid`. */
export function getMetaballGeometry(grid: GridSize): MetaballGeometry {
  const { cx, cy } = getCentre(grid);
  const shortSide = Math.min(grid.cols, grid.rows);
  const radius = shortSide * (shortSide < SMALL_GRID_SIDE ? SMALL_GRID_RADIUS : RADIUS);
  return { cx, cy, radius, swingX: cx - SIDE_INSET * radius, swingY: cy - ORBIT_INSET * radius };
}

/** Number of balls asked for, from 1 to 3 (3 by default). */
export function pickBallCount(params: RecipeParams): number {
  return pickCount(params.length, DEFAULT_BALLS, MAX_BALLS);
}

/** Field level a dot needs to light, from `density` (1 by default, never below 0.5). */
export function pickThreshold(params: RecipeParams): number {
  return Math.max(MIN_THRESHOLD, params.density ?? DEFAULT_THRESHOLD);
}

/** The first `count` balls at orbit angle `t`: two swing in a figure eight, a smaller third buds off the first and circles it. */
export function orbitBalls(geometry: MetaballGeometry, t: number, count: number): Ball[] {
  const { cx, cy, radius, swingX, swingY } = geometry;
  const sway = swingX * Math.sin(t);
  const bob = VERTICAL_SWING * swingY * Math.sin(DOUBLE_SPEED * t);
  const bud = SMALL_BALL_OFFSET * radius;
  const balls: Ball[] = [
    { x: cx + sway, y: cy + bob, r: radius },
    { x: cx - sway, y: cy - bob, r: radius },
    { x: cx + sway + bud * Math.cos(t), y: cy + bob + bud * Math.sin(t), r: SMALL_BALL_RADIUS * radius },
  ];
  return balls.slice(0, count);
}

/** Moves a ball `amount` of the way (0 to 1) toward the grid centre. */
export function towardCentre(ball: Ball, geometry: MetaballGeometry, amount: number): Ball {
  return {
    ...ball,
    x: ball.x + (geometry.cx - ball.x) * amount,
    y: ball.y + (geometry.cy - ball.y) * amount,
  };
}

function fieldAt(balls: readonly Ball[], x: number, y: number): number {
  return balls.reduce(
    (sum, ball) => sum + (ball.r * ball.r) / ((x - ball.x) ** 2 + (y - ball.y) ** 2 + FIELD_EPSILON),
    0,
  );
}

/** Lights every dot whose summed field reaches `threshold`, then rounds the blobs. */
export function drawBalls(grid: GridSize, balls: readonly Ball[], threshold: number): Frame {
  const raw = createFrame(grid, (x, y) => fieldAt(balls, x, y) >= threshold);
  return smoothBlobs(raw, grid);
}
