import { createRng } from '../../rng';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { MIN_BIG_CHANGE_GAP_MS } from '../flash-spacing';
import { createFrame } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { CHLADNI_FIGURE_COUNT, chladniFigures } from './chladni';
import {
  maskFromPoints,
  pointsOf,
  range,
  readGlyph,
  RESOLVE_DEFAULT_SEED,
  RESULT_GLYPHS,
  RESULT_HOLD_MS,
  resultMask,
} from './shared';

const SCATTER_MS = 70;
const FIGURE_MS = 600;
const SCATTER_REACHES = [2, 1] as const;
const FAIL_REACHES = [2, 2, 2, 2] as const;
const TOGGLE_MS = 400;
const TOGGLE_GRAINS = 4;
const CYCLE = 'chladni';
const FIGURE_PREFIX = 'chladni-';
const FIGURE_NAMES = range(1, CHLADNI_FIGURE_COUNT + 1).map((figure) => `${FIGURE_PREFIX}${figure}`);
/** Glyphs the settle variant draws: the figure cycle, one figure, or a result glyph. */
export const SETTLE_GLYPHS: readonly string[] = [CYCLE, ...FIGURE_NAMES, ...RESULT_GLYPHS];
const NEIGHBOURS: readonly Point[] = [-1, 0, 1]
  .flatMap((dy) => [-1, 0, 1].map((dx): Point => [dx, dy]))
  .filter(([dx, dy]) => dx !== 0 || dy !== 0);

type Random = () => number;

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

function jitter(random: Random, reach: number): number {
  return Math.round((random() * 2 - 1) * reach);
}

function scatter(grid: GridSize, mask: Frame, reach: number, random: Random): Frame {
  const moved = pointsOf(mask, grid).map(([x, y]): Point => [
    clamp(x + jitter(random, reach), grid.cols - 1),
    clamp(y + jitter(random, reach), grid.rows - 1),
  ]);
  return maskFromPoints(grid, moved);
}

function settleInto(grid: GridSize, mask: Frame, random: Random, holdMs: number): RecipeOutput {
  const scatters = SCATTER_REACHES.map((reach) => scatter(grid, mask, reach, random));
  return { frames: [...scatters, mask], durations: [...scatters.map(() => SCATTER_MS), holdMs] };
}

function cycleFigures(grid: GridSize, random: Random): RecipeOutput {
  const parts = chladniFigures(grid).map((figure) => settleInto(grid, figure, random, FIGURE_MS));
  return { frames: parts.flatMap((part) => part.frames), durations: parts.flatMap((part) => part.durations) };
}

function isLitAt(frame: Frame, grid: GridSize, [x, y]: Point): boolean {
  return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows && frame[y * grid.cols + x] === 1;
}

function hopFor(grid: GridSize, figure: Frame, grain: Point, random: Random): Frame | undefined {
  const empty = NEIGHBOURS.map(([dx, dy]): Point => [grain[0] + dx, grain[1] + dy]).filter(
    (cell) =>
      cell[0] >= 0 &&
      cell[1] >= 0 &&
      cell[0] < grid.cols &&
      cell[1] < grid.rows &&
      !isLitAt(figure, grid, cell),
  );
  if (empty.length === 0) return undefined;
  const target = empty[Math.floor(random() * empty.length)];
  const rest = pointsOf(figure, grid).filter(([x, y]) => x !== grain[0] || y !== grain[1]);
  return maskFromPoints(grid, [...rest, target]);
}

function restOn(grid: GridSize, figure: Frame, random: Random): RecipeOutput {
  const grains = pointsOf(figure, grid);
  const hops = range(0, TOGGLE_GRAINS).flatMap((): Frame[] => {
    const hop = hopFor(grid, figure, grains[Math.floor(random() * grains.length)], random);
    return hop ? [figure, hop] : [];
  });
  const frames = hops.length > 0 ? hops : [figure];
  return { frames, durations: frames.map(() => TOGGLE_MS), still: 0 };
}

/** Sand on a vibrating plate: grains scatter and settle into curated Chladni figures, one figure, or a result glyph. */
export function generateSettle(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const glyph = readGlyph(params.glyph, SETTLE_GLYPHS, 'settle', CYCLE);
  const random = createRng(params.seed ?? RESOLVE_DEFAULT_SEED);
  if (glyph === CYCLE) return cycleFigures(grid, random);
  if (glyph.startsWith(FIGURE_PREFIX)) {
    const figures = chladniFigures(grid);
    const figure = figures[(Number(glyph.slice(FIGURE_PREFIX.length)) - 1) % figures.length];
    return restOn(grid, figure, random);
  }
  return settleInto(grid, resultMask(glyph, grid), random, RESULT_HOLD_MS);
}

function fallOnce(grid: GridSize, frame: Frame): Frame {
  return createFrame(grid, (x, y) => {
    const isHere = isLitAt(frame, grid, [x, y]);
    const canLeave = isHere && y < grid.rows - 1 && !isLitAt(frame, grid, [x, y + 1]);
    const arrives = !isHere && isLitAt(frame, grid, [x, y - 1]);
    return (isHere && !canLeave) || arrives;
  });
}

function pileUp(grid: GridSize, start: Frame): Frame[] {
  const walk = (frame: Frame, frames: readonly Frame[]): Frame[] => {
    const next = fallOnce(grid, frame);
    return next.join('') === frame.join('') ? [...frames] : walk(next, [...frames, next]);
  };
  return walk(start, []);
}

/** The plate never settles: four scatters, then every grain slides down a row per frame into a pile, each step held long enough for flash safety. */
export function generateSettleFail(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const random = createRng(params.seed ?? RESOLVE_DEFAULT_SEED);
  const figure = chladniFigures(grid)[0];
  const scatters = FAIL_REACHES.map((reach) => scatter(grid, figure, reach, random));
  const falls = pileUp(grid, scatters[scatters.length - 1]);
  const frames = [...scatters, ...falls];
  return {
    frames,
    durations: frames.map((_, index) =>
      index === frames.length - 1 ? RESULT_HOLD_MS : MIN_BIG_CHANGE_GAP_MS,
    ),
  };
}
