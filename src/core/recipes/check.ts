import type { GridSize } from '../types';
import { getResultSquare } from './cross';
import type { ResultSquare } from './cross';
import { createBlankFrame, createFrameFromPoints } from './helpers';
import type { Point, RecipeOutput } from './helpers';

const START_MS = 80;
const STROKE_MS = 45;
const HOLD_MS = 1500;
const MIN_ARM = 1;

interface TickArms {
  short: number;
  long: number;
}

function shortArmFor(long: number): number {
  return Math.max(MIN_ARM, Math.floor(long / 2));
}

function tickWidth({ short, long }: TickArms): number {
  return short + long + 1;
}

function fitArms(grid: GridSize, { inset, size }: ResultSquare): TickArms {
  const maxWidth = Math.min(grid.cols - 2 * inset, size + 1);
  const lengths = Array.from({ length: size - 1 }, (_, index) => size - 1 - index);
  const long =
    lengths.find((length) => tickWidth({ short: shortArmFor(length), long: length }) <= maxWidth) ?? MIN_ARM;
  return { short: shortArmFor(long), long };
}

function lowCentredStart(space: number, extent: number): number {
  return Math.ceil((space - extent) / 2);
}

function getTickPoints(grid: GridSize): Point[] {
  const square = getResultSquare(grid);
  const arms = fitArms(grid, square);
  const { short, long } = arms;
  const left = lowCentredStart(grid.cols, tickWidth(arms));
  const cornerY = square.top + lowCentredStart(square.size, long + 1) + long;
  const shortStroke = Array.from({ length: short + 1 }, (_, step): Point => [
    left + step,
    cornerY - short + step,
  ]);
  const longStroke = Array.from({ length: long }, (_, step): Point => [
    left + short + step + 1,
    cornerY - step - 1,
  ]);
  return [...shortStroke, ...longStroke];
}

/** A tick drawn cell by cell along two straight diagonals in the cross's square, seated low and right, then held. */
export function generateCheck(grid: GridSize): RecipeOutput {
  const stroke = getTickPoints(grid);
  const drawn = stroke.map((_, index) => createFrameFromPoints(grid, stroke.slice(0, index + 1)));
  return {
    frames: [createBlankFrame(grid), ...drawn],
    durations: [START_MS, ...drawn.map((_, index) => (index === drawn.length - 1 ? HOLD_MS : STROKE_MS))],
  };
}
