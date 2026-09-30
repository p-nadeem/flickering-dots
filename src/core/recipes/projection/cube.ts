import type { Frame, GridSize, RecipeParams } from '../../types';
import { glyphMask } from '../../glyphs';
import type { RecipeOutput } from '../helpers';
import { squareToCheck } from './cube-morph';
import { VIEW_DISTANCE, drawEdges, getCentringShift, orient, shiftFrame, smoothstep, steps } from './space';
import type { Edge, Vec3 } from './space';

const QUARTER_TURN = Math.PI / 2;
const EIGHTH_TURN = Math.PI / 4;
const TILT = 0.5;
const FACING_Z = -1 / VIEW_DISTANCE;
const TURN_FRAMES = 8;
const TURN_MS = 125;
const WAIT_MS = 250;
const REST_SPIN = Math.PI / 8;
const REST_TURN_FRAMES = 6;
const REST_TURN_MS = 80;
const REST_CYCLE_MS = 3000;
const LAND_MS = [120, 150, 200, 260] as const;
const SHAKE_SPINS = [0.12, 0, -0.12, 0] as const;
const SHAKE_MS = 70;
const START_MS = 120;
const HOLD_MS = 1500;

const SIGNS = [-1, 1] as const;
const VERTICES: readonly Vec3[] = SIGNS.flatMap((x) =>
  SIGNS.flatMap((y) => SIGNS.map((z): Vec3 => [x, y, z])),
);
const AXES = [0, 1, 2] as const;

interface CubeEdge {
  from: number;
  to: number;
  faces: readonly Vec3[];
}

function faceNormal(axis: number, sign: number): Vec3 {
  return [axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0];
}

function edgeBetween(from: number, to: number): CubeEdge {
  const [a, b] = [VERTICES[from], VERTICES[to]];
  const shared = AXES.filter((axis) => a[axis] === b[axis]);
  return { from, to, faces: shared.map((axis) => faceNormal(axis, a[axis])) };
}

const EDGES: readonly CubeEdge[] = VERTICES.flatMap((from, i) =>
  VERTICES.flatMap((to, j) =>
    j > i && from.filter((value, axis) => value !== to[axis]).length === 1 ? [edgeBetween(i, j)] : [],
  ),
);

interface CubeView {
  spin: number;
  tilt: number;
}

type EdgePlacer = (edges: readonly Edge[]) => Frame;

function isFacing(normal: Vec3, { spin, tilt }: CubeView): boolean {
  return orient(normal, spin, tilt)[2] < FACING_Z;
}

function visibleEdges(view: CubeView): Edge[] {
  const placed = VERTICES.map((vertex) => orient(vertex, view.spin, view.tilt));
  return EDGES.filter(({ faces }) => faces.some((normal) => isFacing(normal, view))).map(
    ({ from, to }): Edge => [placed[from], placed[to]],
  );
}

function spinViews(count: number): CubeView[] {
  return Array.from({ length: count }, (_, index) => ({ spin: (QUARTER_TURN * index) / count, tilt: TILT }));
}

function placeEdges(grid: GridSize): (edges: readonly Edge[]) => Frame {
  const loop = spinViews(TURN_FRAMES).map((view) => drawEdges(grid, visibleEdges(view)));
  const [dx, dy] = getCentringShift(grid, loop);
  return (edges) => shiftFrame(drawEdges(grid, edges), grid, dx, dy);
}

function drawFrontFace(grid: GridSize): Frame {
  const square = drawEdges(
    grid,
    visibleEdges({ spin: 0, tilt: 0 }).filter(([from, to]) => from[2] < 0 && to[2] < 0),
  );
  const [dx, dy] = getCentringShift(grid, [square]);
  return shiftFrame(square, grid, dx, dy);
}

function isUpright([from, to]: Edge): boolean {
  return Math.abs(from[0] - to[0]) < Math.abs(from[1] - to[1]);
}

function midpointX([from, to]: Edge): number {
  return (from[0] + to[0]) / 2;
}

function drawBroken(place: EdgePlacer, view: CubeView): Frame {
  const edges = visibleEdges(view);
  const upright = edges.filter(isUpright);
  const leftmost = upright.reduce(
    (best, edge) => (midpointX(edge) < midpointX(best) ? edge : best),
    upright[0],
  );
  return place(edges.filter((edge) => edge !== leftmost));
}

function drawCube(place: EdgePlacer, view: CubeView): Frame {
  return place(visibleEdges(view));
}

function spinLoop(grid: GridSize, params: RecipeParams, frameMs: number): RecipeOutput {
  const place = placeEdges(grid);
  const count = params.frames || TURN_FRAMES;
  const frames = spinViews(count).map((view) => drawCube(place, view));
  const still = Math.round((count * REST_SPIN) / QUARTER_TURN) % count;
  return { frames, durations: frames.map(() => frameMs), still };
}

/** A tilted wireframe cube turning a quarter turn per loop, hidden edges dropped from 12 dots. */
export function cubeSpin(grid: GridSize, params: RecipeParams): RecipeOutput {
  return spinLoop(grid, params, TURN_MS);
}

/** The cube spin at a patient 250 ms per frame. */
export function cubeWait(grid: GridSize, params: RecipeParams): RecipeOutput {
  return spinLoop(grid, params, WAIT_MS);
}

function restTurn(place: EdgePlacer, from: number): Frame[] {
  return steps(REST_TURN_FRAMES)
    .slice(0, -1)
    .map((t) => drawCube(place, { spin: from + EIGHTH_TURN * smoothstep(t), tilt: TILT }));
}

/** A still three-quarter view that makes one eased eighth turn every 3 s. */
export function cubeRest(grid: GridSize): RecipeOutput {
  const place = placeEdges(grid);
  const holdMs = REST_CYCLE_MS - (REST_TURN_FRAMES - 1) * REST_TURN_MS;
  const halves = [REST_SPIN, REST_SPIN + EIGHTH_TURN].map((spin) => {
    const turn = restTurn(place, spin);
    return {
      frames: [drawCube(place, { spin, tilt: TILT }), ...turn],
      durations: [holdMs, ...turn.map(() => REST_TURN_MS)],
    };
  });
  return {
    frames: halves.flatMap((half) => half.frames),
    durations: halves.flatMap((half) => half.durations),
    still: 0,
  };
}

/** The spin eases to a face-on square, whose left and bottom edges then pull into the check. */
export function cubeLand(grid: GridSize): RecipeOutput {
  const place = placeEdges(grid);
  const landing = LAND_MS.map((_, index) => {
    const t = (index + 1) / LAND_MS.length;
    return index === LAND_MS.length - 1
      ? drawFrontFace(grid)
      : drawCube(place, { spin: QUARTER_TURN * t, tilt: TILT * (1 - t) });
  });
  const morph = squareToCheck(grid, landing[landing.length - 1], glyphMask('check', grid));
  const start = drawCube(place, { spin: 0, tilt: TILT });
  return {
    frames: [start, ...landing, ...morph.frames],
    durations: [START_MS, ...LAND_MS, ...morph.durations.slice(0, -1), HOLD_MS],
  };
}

/** The resting cube twists a little each way on Y, then its nearest edge drops out and it holds. */
export function cubeShake(grid: GridSize): RecipeOutput {
  const place = placeEdges(grid);
  const rest: CubeView = { spin: REST_SPIN, tilt: TILT };
  const shaken = SHAKE_SPINS.map((offset) => drawCube(place, { spin: REST_SPIN + offset, tilt: TILT }));
  return {
    frames: [drawCube(place, rest), ...shaken, drawBroken(place, rest)],
    durations: [START_MS, ...shaken.map(() => SHAKE_MS), HOLD_MS],
  };
}
