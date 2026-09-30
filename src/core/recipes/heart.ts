import type { Frame, GridSize } from '../types';
import { createBlankFrame, createFrameFromPoints } from './helpers';
import type { Point, RecipeOutput } from './helpers';

const LARGE_MS = 140;
const SMALL_MS = 100;
const HOLD_MS = 700;
const MIN_WIDTH = 3;
const MIN_EVEN_WIDTH = 6;
const WIDE_TOP_WIDTH = 5;
const SHRINK = 2;

interface Span {
  start: number;
  end: number;
}

function isEven(value: number): boolean {
  return value % 2 === 0;
}

function heartHeight(width: number): number {
  return width - (isEven(width) ? 2 : 1);
}

function isDrawable(width: number): boolean {
  return width >= MIN_WIDTH && (!isEven(width) || width >= MIN_EVEN_WIDTH);
}

function fits(width: number, grid: GridSize): boolean {
  return isDrawable(width) && width <= grid.cols && heartHeight(width) <= grid.rows;
}

function pickWidth(grid: GridSize): number | undefined {
  const widths = Array.from({ length: Math.max(0, grid.cols) }, (_, index) => grid.cols - index);
  const fitting = widths.filter((width) => fits(width, grid));
  return fitting.find((width) => isEven(width) === isEven(grid.cols)) ?? fitting[0];
}

function topSpans(width: number): Span[] {
  const gap = isEven(width) ? 2 : 1;
  const margin = width >= WIDE_TOP_WIDTH ? 1 : 0;
  const bump = (width - gap - 2 * margin) / 2;
  return [
    { start: margin, end: margin + bump },
    { start: width - margin - bump, end: width - margin },
  ];
}

function taperRowCount(width: number): number {
  return Math.floor((width - 1) / 2);
}

function heartRows(width: number): Span[][] {
  const taperRows = taperRowCount(width);
  const fullRows = heartHeight(width) - 1 - taperRows;
  const full = Array.from({ length: fullRows }, () => [{ start: 0, end: width }]);
  const taper = Array.from({ length: taperRows }, (_, index) => [
    { start: index + 1, end: width - index - 1 },
  ]);
  return [topSpans(width), ...full, ...taper];
}

function toPoints(rows: readonly Span[][], left: number, top: number): Point[] {
  return rows.flatMap((spans, y) =>
    spans.flatMap(({ start, end }) =>
      Array.from({ length: end - start }, (_, index): Point => [left + start + index, top + y]),
    ),
  );
}

function beat(large: Frame, small: Frame): RecipeOutput {
  return { frames: [large, small, large, small], durations: [LARGE_MS, SMALL_MS, LARGE_MS, HOLD_MS] };
}

function shiftSpans(spans: readonly Span[], offset: number): Span[] {
  return spans.map(({ start, end }) => ({ start: start + offset, end: end + offset }));
}

function smallRows(width: number): Span[][] {
  const inner = width - SHRINK;
  if (isDrawable(inner)) return [[], ...heartRows(inner).map((spans) => shiftSpans(spans, SHRINK / 2))];
  const rows = heartRows(width);
  return [[], ...rows.slice(rows.length - taperRowCount(width))];
}

/** A heart that beats twice (large, small, large, small held), centred on the grid. */
export function generateHeart(grid: GridSize): RecipeOutput {
  const width = pickWidth(grid);
  if (width === undefined) {
    const dot: Point = [Math.floor((grid.cols - 1) / 2), Math.floor((grid.rows - 1) / 2)];
    return beat(createFrameFromPoints(grid, [dot]), createBlankFrame(grid));
  }
  const left = Math.floor((grid.cols - width) / 2);
  const top = Math.floor((grid.rows - heartHeight(width)) / 2);
  const large = createFrameFromPoints(grid, toPoints(heartRows(width), left, top));
  const small = createFrameFromPoints(grid, toPoints(smallRows(width), left, top));
  return beat(large, small);
}
