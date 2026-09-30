import { generateCheck } from './recipes/check';
import { centredStart, generateCross, getResultSquare } from './recipes/cross';
import { createFrame } from './recipes/helpers';
import { assertRecipeGrid } from './recipes/validate';
import type { Frame, GridSize } from './types';

/** Names of the shared glyphs engines draw for success and error moments. */
export const GLYPH_NAMES = ['check', 'cross', 'sparkle', 'plus'] as const;

/** One of the shared glyphs in `GLYPH_NAMES`. */
export type GlyphName = (typeof GLYPH_NAMES)[number];

interface GlyphSquare {
  size: number;
  left: number;
  top: number;
}

type LobeRule = (along: number, across: number, size: number) => boolean;

const SPARKLE_CORE_DIVISOR = 2;

/** True when `name` is one of `GLYPH_NAMES`. */
export function isGlyphName(name: string): name is GlyphName {
  return GLYPH_NAMES.some((glyph) => glyph === name);
}

function lastFrame(frames: readonly Frame[]): Frame {
  return [...frames[frames.length - 1]];
}

function isExactlyCentred({ cols, rows }: GridSize, size: number): boolean {
  return (cols - size) % 2 === 0 && (rows - size) % 2 === 0;
}

function fullSquare(grid: GridSize): GlyphSquare {
  const shortSide = Math.min(grid.cols, grid.rows);
  const size = shortSide % 2 === 1 || isExactlyCentred(grid, shortSide) ? shortSide : shortSide - 1;
  return { size, left: centredStart(grid.cols, size), top: centredStart(grid.rows, size) };
}

function distanceFromCentre(position: number, start: number, size: number): number {
  const evenOffset = size % 2 === 0 ? 1 / 2 : 0;
  return Math.abs(position - start - (size - 1) / 2) - evenOffset;
}

function lobeMask(grid: GridSize, { size, left, top }: GlyphSquare, isLit: LobeRule): Frame {
  return createFrame(grid, (x, y) => {
    const isInside = x >= left && x < left + size && y >= top && y < top + size;
    return isInside && isLit(distanceFromCentre(x, left, size), distanceFromCentre(y, top, size), size);
  });
}

function sparkleCore(size: number): number {
  const reach = Math.floor((size - 1) / 2);
  const doubledAxisTrim = size % 2 === 0 ? 1 : 0;
  return Math.floor((reach - doubledAxisTrim) / SPARKLE_CORE_DIVISOR);
}

const isPlusCell: LobeRule = (along, across) => along === 0 || across === 0;

const isSparkleCell: LobeRule = (along, across, size) => along * across <= sparkleCore(size);

const GLYPH_BUILDERS: Readonly<Record<GlyphName, (grid: GridSize) => Frame>> = {
  check: (grid) => lastFrame(generateCheck(grid).frames),
  cross: (grid) => lastFrame(generateCross(grid).frames),
  sparkle: (grid) => lobeMask(grid, fullSquare(grid), isSparkleCell),
  plus: (grid) => lobeMask(grid, getResultSquare(grid), isPlusCell),
};

/** Returns a shared glyph as a centred on/off mask sized to the grid; check and cross match their recipes' final frames. */
export function glyphMask(name: GlyphName, grid: GridSize): Frame {
  if (!isGlyphName(name)) {
    throw new Error(
      `flickering-dots glyphMask: unknown glyph ${JSON.stringify(name)}; use one of ${GLYPH_NAMES.join(', ')}`,
    );
  }
  assertRecipeGrid(grid);
  return GLYPH_BUILDERS[name](grid);
}
