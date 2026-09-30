import { glyphMask } from '../../glyphs';
import type { GlyphName } from '../../glyphs';
import type { Frame, GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { drawBalls } from './cloud-balls';
import { CLOUD_POINTS, cloudCube, cloudShapes, cloudSphere, glyphPoints } from './cloud-shapes';
import { getViewport, lerp, lerpVec, orient, projectPoint, shiftFrame, smoothstep, steps } from './space';
import type { Vec3 } from './space';

const TILT = 0.4;
const MORPH_FRAMES = 10;
const HOLD_FRAMES = 14;
const SPIN_TURNS = 1.25;
const FRAME_MS = 100;
const STILL_SHAPE = 2;
const STILL_HOLD_FRAME = 4;
const LAND_FRAMES = 8;
const IDLE_FRAMES = 126;
const IDLE_MS = 120;
const LAND_FROM_SPIN = -Math.PI / 2;
const SHAKE_OFFSETS = [-1, 1] as const;
const SHAKE_MS = 60;
const FORMED_MS = 500;
const HOLD_MS = 1500;
const FULL_TURN = 2 * Math.PI;

interface CloudPose {
  spin: number;
  tilt: number;
}

function drawCloud(grid: GridSize, points: readonly Vec3[], { spin, tilt }: CloudPose): Frame {
  return drawBalls(
    grid,
    points.map((point) => orient(point, spin, tilt)),
  );
}

function blend(from: readonly Vec3[], to: readonly Vec3[], t: number): Vec3[] {
  return from.map((point, index) => lerpVec(point, to[index], t));
}

function cyclePoints(shapes: readonly Vec3[][], index: number): Vec3[] {
  const segment = MORPH_FRAMES + HOLD_FRAMES;
  const shape = Math.floor(index / segment);
  const local = index % segment;
  const from = shapes[shape];
  if (local < HOLD_FRAMES) return from;
  const t = smoothstep((local - HOLD_FRAMES + 1) / MORPH_FRAMES);
  return blend(from, shapes[(shape + 1) % shapes.length], t);
}

/** Balls cycling ring, helix, cube and sphere while the cloud turns one and three quarter times per loop. */
export function cloudCycle(grid: GridSize): RecipeOutput {
  const shapes = cloudShapes();
  const segment = MORPH_FRAMES + HOLD_FRAMES;
  const count = shapes.length * segment;
  const frames = Array.from({ length: count }, (_, index) =>
    drawCloud(grid, cyclePoints(shapes, index), {
      spin: (FULL_TURN * SPIN_TURNS * index) / count,
      tilt: TILT,
    }),
  );
  return { frames, durations: frames.map(() => FRAME_MS), still: STILL_SHAPE * segment + STILL_HOLD_FRAME };
}

/** A three-band sphere of balls turning slowly once per loop. */
export function cloudIdle(grid: GridSize, params: RecipeParams): RecipeOutput {
  const sphere = cloudSphere();
  const count = params.frames || IDLE_FRAMES;
  const frames = Array.from({ length: count }, (_, index) =>
    drawCloud(grid, sphere, { spin: (FULL_TURN * index) / count, tilt: TILT }),
  );
  return { frames, durations: frames.map(() => IDLE_MS) };
}

function screenOrder(grid: GridSize, points: readonly Vec3[], pose: CloudPose): Vec3[] {
  const view = getViewport(grid);
  const keyed = points.map((point) => ({
    point,
    dot: projectPoint(orient(point, pose.spin, pose.tilt), view),
  }));
  return keyed.sort((a, b) => a.dot[0] - b.dot[0] || a.dot[1] - b.dot[1]).map(({ point }) => point);
}

function landing(grid: GridSize, glyph: GlyphName): Frame[] {
  const start: CloudPose = { spin: LAND_FROM_SPIN, tilt: TILT };
  const from = screenOrder(grid, cloudCube(), start);
  const to = glyphPoints(grid, glyphMask(glyph, grid), CLOUD_POINTS);
  return steps(LAND_FRAMES).map((step) => {
    const t = smoothstep(step);
    return drawCloud(grid, blend(from, to, t), { spin: lerp(start.spin, 0, t), tilt: lerp(TILT, 0, t) });
  });
}

function shakeFrames(grid: GridSize, cross: Frame): Frame[] {
  return [cross, ...SHAKE_OFFSETS.map((dx) => shiftFrame(cross, grid, dx, 0))];
}

/** The cloud flows into a flat glyph while its spin eases to face the viewer; a cross then shakes a column each way. */
export function cloudLand(grid: GridSize, glyph: GlyphName): RecipeOutput {
  const cube = cloudCube();
  const morph = landing(grid, glyph).slice(0, -1);
  const settled = glyphMask(glyph, grid);
  const shake = glyph === 'cross' ? shakeFrames(grid, settled) : [];
  return {
    frames: [drawCloud(grid, cube, { spin: 0, tilt: TILT }), ...morph, ...shake, settled],
    durations: [
      FRAME_MS,
      ...morph.map(() => FRAME_MS),
      ...shake.map((_, index) => (index === 0 ? FORMED_MS : SHAKE_MS)),
      HOLD_MS,
    ],
  };
}
