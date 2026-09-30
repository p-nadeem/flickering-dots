import { glyphMask } from '../../glyphs';
import type { GlyphName } from '../../glyphs';
import type { Frame, GridSize } from '../../types';
import { getCentre } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';

const BLOOM_STEP = 1.5;
const BLOOM_MS = 60;
const HOLD_MS = 1500;

function cellDistance(grid: GridSize, index: number, [x, y]: Point): number {
  return Math.hypot((index % grid.cols) - x, Math.floor(index / grid.cols) - y);
}

/** The lit cell of `mask` nearest the grid centre, where a bloom starts. */
export function nearestToCentre(grid: GridSize, mask: Frame): Point {
  const { cx, cy } = getCentre(grid);
  const lit = mask.flatMap((bit, index) => (bit === 1 ? [index] : []));
  const best = lit.reduce((kept, index) =>
    cellDistance(grid, index, [cx, cy]) < cellDistance(grid, kept, [cx, cy]) ? index : kept,
  );
  return [best % grid.cols, Math.floor(best / grid.cols)];
}

/** A shared glyph growing out of `origin` (the grid centre by default), 1.5 dots further per 60 ms frame, then held for 1500 ms. */
export function bloomGlyph(grid: GridSize, name: GlyphName, origin?: Point): RecipeOutput {
  const mask = glyphMask(name, grid);
  const { cx, cy } = getCentre(grid);
  const from: Point = origin ?? [cx, cy];
  const distance = (index: number) => cellDistance(grid, index, from);
  const reach = Math.max(...mask.map((bit, index) => (bit === 1 ? distance(index) : 0)));
  const count = Math.max(1, Math.ceil(reach / BLOOM_STEP));
  const frames = Array.from({ length: count }, (_, step): Frame =>
    mask.map((bit, index) => (bit === 1 && distance(index) <= (step + 1) * BLOOM_STEP ? 1 : 0)),
  );
  return { frames, durations: frames.map((_, step) => (step === count - 1 ? HOLD_MS : BLOOM_MS)) };
}
