import { GLYPH_NAMES, glyphMask, isGlyphName } from '../../glyphs';
import { createRng } from '../../rng';
import type { Frame, GridSize } from '../../types';
import { createFrame, createFrameFromPoints } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';

/** How long a resolved glyph holds at the end of a one-shot reveal, in ms. */
export const RESULT_HOLD_MS = 1500;

/** Default seed of the resolve variants. */
export const RESOLVE_DEFAULT_SEED = 7;

const SHAKE_MS = 80;
const SHAKE_OFFSETS = [1, -1] as const;
const SLOT_SEED_STEP = 7919;
const HALF = 0.5;

/** The shared result glyphs every resolve variant can reveal. */
export const RESULT_GLYPHS: readonly string[] = GLYPH_NAMES;

/** Whole numbers from `from` up to, not including, `to`. */
export function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, index) => from + index);
}

/** Eases 0 to 1 in and out along two parabolas. */
export function easeInOut(t: number): number {
  return t < HALF ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

/** Returns the lit cells of a frame as points in row-major order. */
export function pointsOf(frame: Frame, grid: GridSize): Point[] {
  return frame.flatMap((bit, index): Point[] =>
    bit === 1 ? [[index % grid.cols, Math.floor(index / grid.cols)]] : [],
  );
}

/** Lights the given points; points outside the grid are dropped. */
export function maskFromPoints(grid: GridSize, points: readonly Point[]): Frame {
  return createFrameFromPoints(grid, points);
}

/** Returns the named result glyph as a mask. */
export function resultMask(glyph: string, grid: GridSize): Frame {
  if (!isGlyphName(glyph))
    throw new Error(`flickering-dots resolve: unknown result glyph ${JSON.stringify(glyph)}`);
  return glyphMask(glyph, grid);
}

/** Reads `glyph`, falling back to `fallback`, and throws a readable error when the variant cannot draw it. */
export function readGlyph(
  glyph: string | undefined,
  allowed: readonly string[],
  kind: string,
  fallback: string,
): string {
  const name = glyph ?? fallback;
  if (allowed.includes(name)) return name;
  throw new Error(
    `flickering-dots resolve: glyph ${JSON.stringify(name)} is not a ${kind} glyph; use one of ${allowed.join(', ')}`,
  );
}

/** A seeded on/off field at `density`, the same for the same seed and slot. */
export function noiseFrame(grid: GridSize, seed: number, slot: number, density: number): Frame {
  const random = createRng(seed + slot * SLOT_SEED_STEP);
  return createFrame(grid, () => random() < density);
}

function shiftMask(grid: GridSize, mask: Frame, dx: number): Frame {
  return maskFromPoints(
    grid,
    pointsOf(mask, grid).map(([x, y]): Point => [x + dx, y]),
  );
}

function hasShakeRoom(grid: GridSize, mask: Frame): boolean {
  const xs = pointsOf(mask, grid).map(([x]) => x);
  return xs.length > 0 && Math.min(...xs) >= 1 && Math.max(...xs) <= grid.cols - 2;
}

/** Holds the resolved mask; a cross first shakes one column right and left at 80 ms when it has room. */
export function resultTail(grid: GridSize, mask: Frame, glyph: string): RecipeOutput {
  if (glyph !== 'cross' || !hasShakeRoom(grid, mask)) return { frames: [mask], durations: [RESULT_HOLD_MS] };
  const shaken = SHAKE_OFFSETS.map((dx) => shiftMask(grid, mask, dx));
  return { frames: [...shaken, mask], durations: [...shaken.map(() => SHAKE_MS), RESULT_HOLD_MS] };
}

/** Joins clips end to end. */
export function joinOutputs(...parts: readonly RecipeOutput[]): RecipeOutput {
  return {
    frames: parts.flatMap((part) => part.frames),
    durations: parts.flatMap((part) => part.durations),
  };
}
