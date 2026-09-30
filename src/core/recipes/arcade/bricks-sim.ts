import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { clamp } from './kit-b';

const TALL_WALL_ROWS = 8;
const PADDLE_HALF = 1;
const BRICK_WIDTH = 3;
const LOOKAHEAD_FLIGHTS = 3;
const MAX_FLIGHT_STEPS = 256;
const DIRECTIONS = [1, -1, 0] as const;

/** Where the wall, its bricks, the paddle and the ball's lowest row sit on a grid. */
export interface BrickLayout {
  cols: number;
  rows: number;
  wallRows: number;
  edges: readonly number[];
  paddleY: number;
  floorY: number;
}

/** The ball's cell and diagonal direction. */
export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/** The ball and the ids of the bricks still standing. */
export interface BrickState {
  ball: Ball;
  bricks: ReadonlySet<number>;
}

function brickCount(cols: number): number {
  const count = Math.max(1, Math.round(cols / BRICK_WIDTH));
  return cols % 2 === 1 && count % 2 === 0 ? count + 1 : count;
}

function brickEdges(cols: number): number[] {
  const count = brickCount(cols);
  return Array.from({ length: count + 1 }, (_, index) =>
    index <= count / 2
      ? Math.round((index * cols) / count)
      : cols - Math.round(((count - index) * cols) / count),
  );
}

/** Wall rows 0 to 1 (only row 0 below 8 rows) cut into mirrored bricks about 3 dots wide, the paddle at the bottom. */
export function planBricks(grid: GridSize): BrickLayout {
  const wallRows = grid.rows >= TALL_WALL_ROWS ? 2 : 1;
  return {
    cols: grid.cols,
    rows: grid.rows,
    wallRows,
    edges: brickEdges(grid.cols),
    paddleY: grid.rows - 1,
    floorY: grid.rows - 2,
  };
}

function bricksPerRow(layout: BrickLayout): number {
  return layout.edges.length - 1;
}

/** Every brick id, bottom row first, each row left to right. */
export function wallOrder(layout: BrickLayout): number[] {
  const perRow = bricksPerRow(layout);
  const rows = Array.from({ length: layout.wallRows }, (_, index) => layout.wallRows - 1 - index);
  return rows.flatMap((y) => Array.from({ length: perRow }, (_, slot) => y * perRow + slot));
}

function brickAt(layout: BrickLayout, x: number, y: number): number | undefined {
  if (y < 0 || y >= layout.wallRows || x < 0 || x >= layout.cols) return undefined;
  const slot = layout.edges.findIndex((edge, index) => index > 0 && x < edge) - 1;
  return y * bricksPerRow(layout) + slot;
}

/** The cells of the given bricks. */
export function brickPoints(layout: BrickLayout, bricks: ReadonlySet<number>): Point[] {
  const perRow = bricksPerRow(layout);
  return [...bricks].flatMap((id) => {
    const [y, slot] = [Math.floor(id / perRow), id % perRow];
    const [left, right] = [layout.edges[slot], layout.edges[slot + 1]];
    return Array.from({ length: right - left }, (_, offset): Point => [left + offset, y]);
  });
}

/** The column the paddle is centred on when the ball is at `x`. */
export function paddleCentre(layout: BrickLayout, x: number): number {
  return clamp(x, PADDLE_HALF, layout.cols - 1 - PADDLE_HALF);
}

/** The paddle's cells centred on `centre`. */
export function paddlePoints(layout: BrickLayout, centre: number): Point[] {
  return [-PADDLE_HALF, 0, PADDLE_HALF].map((offset): Point => [centre + offset, layout.paddleY]);
}

function withoutBrick(bricks: ReadonlySet<number>, id: number): ReadonlySet<number> {
  return new Set([...bricks].filter((brick) => brick !== id));
}

function hitBrick(
  layout: BrickLayout,
  bricks: ReadonlySet<number>,
  ball: Ball,
  dx: number,
): number | undefined {
  const straight = brickAt(layout, ball.x, ball.y - 1);
  if (straight !== undefined && bricks.has(straight)) return straight;
  const diagonal = brickAt(layout, ball.x + dx, ball.y - 1);
  return diagonal !== undefined && bricks.has(diagonal) ? diagonal : undefined;
}

function bounceDx(layout: BrickLayout, ball: Ball, dx: number): number {
  const nextX = ball.x + dx;
  return nextX < 0 || nextX >= layout.cols ? -dx : dx;
}

/** True when the ball sits on the paddle about to bounce. */
export function isOnPaddle(layout: BrickLayout, ball: Ball): boolean {
  return ball.dy > 0 && ball.y >= layout.floorY;
}

function advance(layout: BrickLayout, { ball, bricks }: BrickState, aimedDx: number): BrickState {
  const dx = bounceDx(layout, ball, aimedDx);
  const hit = ball.dy < 0 ? hitBrick(layout, bricks, ball, dx) : undefined;
  const isTop = ball.dy < 0 && ball.y === 0;
  const dy = isOnPaddle(layout, ball) || hit !== undefined || isTop ? -ball.dy : ball.dy;
  const next: Ball = { x: ball.x + dx, y: clamp(ball.y + dy, 0, layout.floorY), dx, dy };
  return { ball: next, bricks: hit === undefined ? bricks : withoutBrick(bricks, hit) };
}

function fly(layout: BrickLayout, state: BrickState, dx: number): BrickState {
  const step = (current: BrickState, count: number): BrickState => {
    const isDone = isOnPaddle(layout, current.ball) || current.bricks.size < state.bricks.size;
    return isDone || count >= MAX_FLIGHT_STEPS
      ? current
      : step(advance(layout, current, current.ball.dx), count + 1);
  };
  return step(advance(layout, state, dx), 1);
}

function flightsToHit(layout: BrickLayout, state: BrickState, dx: number, flightsLeft: number): number {
  const landed = fly(layout, state, dx);
  if (landed.bricks.size < state.bricks.size) return 1;
  if (flightsLeft <= 1) return Number.POSITIVE_INFINITY;
  return 1 + Math.min(...DIRECTIONS.map((next) => flightsToHit(layout, landed, next, flightsLeft - 1)));
}

function nearestBrickColumn(layout: BrickLayout, bricks: ReadonlySet<number>, x: number): number {
  const perRow = bricksPerRow(layout);
  const centres = [...bricks].map((id) => {
    const slot = id % perRow;
    return Math.floor((layout.edges[slot] + layout.edges[slot + 1] - 1) / 2);
  });
  return centres.reduce((best, centre) => (Math.abs(centre - x) < Math.abs(best - x) ? centre : best));
}

function carryTowardBrick(layout: BrickLayout, state: BrickState): BrickState {
  const toward = Math.sign(nearestBrickColumn(layout, state.bricks, state.ball.x) - state.ball.x);
  if (toward === 0) return advance(layout, state, 0);
  return { ...state, ball: { ...state.ball, x: state.ball.x + toward } };
}

function serveFromPaddle(layout: BrickLayout, state: BrickState): BrickState {
  const heading = state.ball.dx === 0 ? 1 : state.ball.dx;
  const choices = [heading, -heading, 0];
  const flights = choices.map((dx) => flightsToHit(layout, state, dx, LOOKAHEAD_FLIGHTS));
  const best = Math.min(...flights);
  if (best === Number.POSITIVE_INFINITY) return carryTowardBrick(layout, state);
  return advance(layout, state, choices[flights.indexOf(best)]);
}

/** Moves the ball one step: walls reflect, a brick breaks, and the paddle aims or carries the ball to a brick. */
export function stepBricks(layout: BrickLayout, state: BrickState): BrickState {
  const isServing = isOnPaddle(layout, state.ball) && state.bricks.size > 0;
  return isServing ? serveFromPaddle(layout, state) : advance(layout, state, state.ball.dx);
}
