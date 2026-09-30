import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrame, wrapIndex } from '../helpers';
import { TAU, wholeWithin } from './shared';

const RUNG_SPACING = 3;
const MIN_RUNG_GAP = 3;
const BACK_HIDE_SIN = 0.5;
const HALF = 0.5;

/** The pose of the helix: how far it has turned, in columns, and how wide it swings. */
export interface HelixPose {
  turn: number;
  scale: number;
  rungs: readonly number[];
}

interface Strand {
  rowAt: (x: number) => number;
  isFrontAt: (x: number) => boolean;
}

/** Phases of the rungs along one turn, set off the quarter turns so they fall at different depths. */
export function rungPhases(cols: number, params: RecipeParams): number[] {
  const spacing = wholeWithin(params.length, RUNG_SPACING, 1, cols);
  const count = Math.max(1, Math.round(cols / spacing));
  return Array.from({ length: count }, (_, index) => Math.round(((index + HALF) * cols) / count));
}

function angleAt(grid: GridSize, pose: HelixPose, x: number): number {
  return (TAU * wrapIndex(x + pose.turn, grid.cols)) / grid.cols;
}

function strand(grid: GridSize, pose: HelixPose, sign: 1 | -1): Strand {
  const centre = (grid.rows - 1) / 2;
  return {
    rowAt: (x) => Math.round(centre + sign * centre * pose.scale * Math.sin(angleAt(grid, pose, x))),
    isFrontAt: (x) => sign * Math.cos(angleAt(grid, pose, x)) >= 0,
  };
}

function isShown(grid: GridSize, pose: HelixPose, line: Strand, x: number): boolean {
  return line.isFrontAt(x) || Math.abs(Math.sin(angleAt(grid, pose, x))) >= BACK_HIDE_SIN;
}

function runOwner(line: Strand, centre: number, left: number): number {
  const isLeftFarther = Math.abs(line.rowAt(left) - centre) > Math.abs(line.rowAt(left + 1) - centre);
  return isLeftFarther ? left : left + 1;
}

function isBetween(y: number, a: number, b: number): boolean {
  return y > Math.min(a, b) && y < Math.max(a, b);
}

function isRunCell(line: Strand, centre: number, left: number, x: number, y: number): boolean {
  return runOwner(line, centre, left) === x && isBetween(y, line.rowAt(left), line.rowAt(left + 1));
}

function isStrandCell(grid: GridSize, pose: HelixPose, line: Strand, x: number, y: number): boolean {
  if (!isShown(grid, pose, line, x)) return false;
  const centre = (grid.rows - 1) / 2;
  return line.rowAt(x) === y || isRunCell(line, centre, x - 1, x, y) || isRunCell(line, centre, x, x, y);
}

function rungColumns(grid: GridSize, pose: HelixPose): ReadonlySet<number> {
  return new Set(pose.rungs.map((phase) => wrapIndex(Math.round(phase - pose.turn), grid.cols)));
}

/** Draws both strands, the back one broken beside each crossing, with rungs where they are far enough apart. */
export function drawHelix(grid: GridSize, pose: HelixPose): Frame {
  const lines = [strand(grid, pose, 1), strand(grid, pose, -1)] as const;
  const rungs = rungColumns(grid, pose);
  return createFrame(grid, (x, y) => {
    if (lines.some((line) => isStrandCell(grid, pose, line, x, y))) return true;
    const [a, b] = lines.map((line) => line.rowAt(x));
    return (
      rungs.has(x) && Math.abs(a - b) >= MIN_RUNG_GAP && isBetween(y, Math.min(a, b) + 1, Math.max(a, b) - 1)
    );
  });
}

/** The two strand rows of each column, `a` above or below `b`. */
export function strandRows(grid: GridSize, pose: HelixPose): { a: number; b: number }[] {
  const [first, second] = [strand(grid, pose, 1), strand(grid, pose, -1)];
  return Array.from({ length: grid.cols }, (_, x) => ({ a: first.rowAt(x), b: second.rowAt(x) }));
}
