import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';

const NO_COLUMN = -1;

/** The sorted bar heights: a staircase rising to the right, at least 1 row each. */
export function staircase({ cols, rows }: GridSize): number[] {
  return Array.from({ length: cols }, (_, x) => Math.max(1, Math.round(((x + 1) * rows) / cols)));
}

/** True when the heights never fall from left to right. */
export function isSorted(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}

function swapped(values: readonly number[], first: number, second: number): number[] {
  return values.map((value, index) => {
    if (index === first) return values[second];
    return index === second ? values[first] : value;
  });
}

/** A seeded Fisher-Yates shuffle of `values`, reversed when it happens to come out sorted. */
export function shuffleValues(values: readonly number[], random: () => number): number[] {
  const last = values.length - 1;
  const shuffled = Array.from({ length: Math.max(0, last) }, (_, step) => last - step).reduce<number[]>(
    (current, index) => swapped(current, index, Math.floor(random() * (index + 1))),
    [...values],
  );
  return isSorted(shuffled) ? [...shuffled].reverse() : shuffled;
}

function sortedPairValue(values: readonly number[], index: number, isLeft: boolean): number {
  const partner = isLeft ? index + 1 : index - 1;
  if (partner < 0 || partner >= values.length) return values[index];
  return isLeft ? Math.min(values[index], values[partner]) : Math.max(values[index], values[partner]);
}

/** One odd-even transposition pass: pairs (i, i+1) with i of the pass's parity swap when out of order. */
export function oddEvenPass(values: readonly number[], pass: number): number[] {
  return values.map((_, index) => sortedPairValue(values, index, index % 2 === pass % 2));
}

function slideLeft(values: readonly number[], at: number): number[][] {
  if (at <= 0 || values[at - 1] <= values[at]) return [];
  const moved = swapped(values, at - 1, at);
  return [moved, ...slideLeft(moved, at - 1)];
}

/** The start and every step of an insertion sort: each step slides one bar one column left. */
export function insertionSteps(values: readonly number[]): number[][] {
  return values
    .slice(1)
    .reduce<number[][]>(
      (steps, _, offset) => [...steps, ...slideLeft(steps[steps.length - 1], offset + 1)],
      [[...values]],
    );
}

/** Draws bottom-anchored bars, leaving column `hidden` dark. */
export function drawBars(grid: GridSize, values: readonly number[], hidden: number = NO_COLUMN): Frame {
  return createFrame(grid, (x, y) => x !== hidden && y >= grid.rows - values[x]);
}
