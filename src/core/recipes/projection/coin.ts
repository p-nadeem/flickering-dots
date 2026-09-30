import { glyphMask } from '../../glyphs';
import type { GlyphName } from '../../glyphs';
import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import type { RecipeOutput } from '../helpers';
import { placeCentred } from './inset';
import { getViewport } from './space';

const TURN_TWELFTHS = [0, 1, 3, 5, 6, 7, 9, 11] as const;
const TWELFTHS = 12;
const FACE_MS = 200;
const TURNING_MS = 160;
const EDGE_MS = 160;
const EDGE_SHOWN = 0.1;
const FACE_SHOWN = 0.5;
const GLYPH_SHOWN = 0.8;
const GLYPH_MIN_SIDE = 3;
const OUTER_REACH = 1.2;
const RIM_WIDTH = 1;
const ODD_EDGE_HALF_WIDTH = 0.5;
const EVEN_EDGE_HALF_WIDTH = 1;
const GLYPH_INSET_MIN_SIDE = 7;
const FACE_ON = 0.99;
const LAND_PACES = [1, 1.25] as const;
const WOBBLE_WIDTH = 0.85;
const WOBBLE_MS = 170;
const HOLD_MS = 1500;
const REST_CYCLE_MS = 4000;
const REST_TURN = [1, 2, 1] as const;
const DECIDE_PACES = [1.5, 1.25, 1] as const;
const DECIDE_EDGE_FRAME = 2;
const FULL_TURN = 2 * Math.PI;

/** The two faces of the coin, front first; either may be blank. */
export interface CoinFaces {
  front?: GlyphName;
  back?: GlyphName;
}

interface CoinShape {
  cx: number;
  cy: number;
  radius: number;
  edgeHalfWidth: number;
}

function getShape(grid: GridSize): CoinShape {
  const { cx, cy, side } = getViewport(grid);
  const edgeHalfWidth = side % 2 === 1 ? ODD_EDGE_HALF_WIDTH : EVEN_EDGE_HALF_WIDTH;
  return { cx, cy, radius: (side - 1) / 2, edgeHalfWidth };
}

function faceGrid(grid: GridSize, shape: CoinShape): GridSize {
  const inner = shape.radius - RIM_WIDTH;
  const fitted = Math.floor(Math.SQRT2 * inner + 1);
  const box = fitted % 2 === getViewport(grid).side % 2 ? fitted : fitted - 1;
  const side = box + 2 >= GLYPH_INSET_MIN_SIDE ? box + 2 : box;
  return { cols: Math.max(1, side), rows: Math.max(1, side) };
}

function getFace(grid: GridSize, shape: CoinShape, glyph: GlyphName): Frame | undefined {
  const inner = faceGrid(grid, shape);
  return inner.cols < GLYPH_MIN_SIDE ? undefined : placeCentred(glyphMask(glyph, inner), inner, grid);
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function isInsideDisc(shape: CoinShape, width: number, x: number, y: number): boolean {
  const halfWidth = Math.max(width * shape.radius, shape.edgeHalfWidth);
  const dx = (x - shape.cx) / halfWidth;
  const dy = (y - shape.cy) / shape.radius;
  return dx * dx + dy * dy <= OUTER_REACH;
}

function isOnRim(shape: CoinShape, width: number, x: number, y: number): boolean {
  if (!isInsideDisc(shape, width, x, y)) return false;
  return width <= FACE_SHOWN || NEIGHBOURS.some(([dx, dy]) => !isInsideDisc(shape, width, x + dx, y + dy));
}

function isOnFace(
  grid: GridSize,
  shape: CoinShape,
  mask: Frame,
  width: number,
  x: number,
  y: number,
): boolean {
  const sourceX = Math.round(shape.cx + (x - shape.cx) / width);
  return sourceX >= 0 && sourceX < grid.cols && mask[y * grid.cols + sourceX] === 1;
}

/** The coin at `turn` (a fraction of a full turn): an ellipse of width |cos|, showing the face turned to the viewer. */
export function drawCoin(grid: GridSize, faces: CoinFaces, turn: number): Frame {
  const shape = getShape(grid);
  const signed = Math.cos(FULL_TURN * turn);
  const width = Math.abs(signed);
  const glyph = signed > 0 ? faces.front : faces.back;
  const face = width > GLYPH_SHOWN && glyph !== undefined ? getFace(grid, shape, glyph) : undefined;
  return createFrame(
    grid,
    (x, y) => isOnRim(shape, width, x, y) || (face !== undefined && isOnFace(grid, shape, face, width, x, y)),
  );
}

function turnFrames(grid: GridSize, faces: CoinFaces): Frame[] {
  return TURN_TWELFTHS.map((_, index) => drawCoin(grid, faces, turnAt(index)));
}

function turnAt(index: number): number {
  return TURN_TWELFTHS[index % TURN_TWELFTHS.length] / TWELFTHS;
}

function spinMs(index: number): number {
  const width = Math.abs(Math.cos(FULL_TURN * turnAt(index)));
  if (width > FACE_ON) return FACE_MS;
  return width > EDGE_SHOWN ? TURNING_MS : EDGE_MS;
}

/** A coin spinning through both faces, 8 frames per turn: face, narrowing, edge-on, narrowing, other face. */
export function coinSpin(grid: GridSize, faces: CoinFaces): RecipeOutput {
  const frames = turnFrames(grid, faces);
  return { frames, durations: frames.map((_, index) => spinMs(index)), still: 0 };
}

/** Two slowing turns that land on the front face and hold; `wobble` adds a last squeeze and settle. */
export function coinLand(grid: GridSize, faces: CoinFaces, wobble: boolean): RecipeOutput {
  const turn = turnFrames(grid, faces);
  const face = turn[0];
  const turns = LAND_PACES.flatMap((pace) =>
    turn.map((frame, index) => ({ frame, ms: Math.round(spinMs(index) * pace) })),
  );
  const settle = wobble
    ? [
        { frame: face, ms: WOBBLE_MS },
        { frame: drawCoin(grid, faces, Math.acos(WOBBLE_WIDTH) / FULL_TURN), ms: WOBBLE_MS },
      ]
    : [];
  const steps = [...turns, ...settle, { frame: face, ms: HOLD_MS }];
  return { frames: steps.map(({ frame }) => frame), durations: steps.map(({ ms }) => ms) };
}

/** The coin face-on, turning a quarter and back once every 4 s. */
export function coinRest(grid: GridSize, faces: CoinFaces): RecipeOutput {
  const turns = REST_TURN.map((step) => ({
    frame: drawCoin(grid, faces, turnAt(step)),
    ms: spinMs(step),
  }));
  const turnMs = turns.reduce((sum, { ms }) => sum + ms, 0);
  return {
    frames: [drawCoin(grid, faces, 0), ...turns.map(({ frame }) => frame)],
    durations: [REST_CYCLE_MS - turnMs, ...turns.map(({ ms }) => ms)],
    still: 0,
  };
}

/** The spin speeds up over three turns, then freezes edge-on as a vertical line. */
export function coinDecide(grid: GridSize, faces: CoinFaces): RecipeOutput {
  const turn = turnFrames(grid, faces);
  const order = turn.map((_, step) => (DECIDE_EDGE_FRAME + 1 + step) % TURN_TWELFTHS.length);
  const steps = DECIDE_PACES.flatMap((pace) =>
    order.map((index) => ({ frame: turn[index], ms: Math.round(spinMs(index) * pace) })),
  );
  return {
    frames: steps.map(({ frame }) => frame),
    durations: steps.map(({ ms }, index) => (index === steps.length - 1 ? HOLD_MS : ms)),
  };
}
