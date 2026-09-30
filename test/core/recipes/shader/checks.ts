import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, toFrameText } from '../frame-text';

const FLASH_STEP_FRACTION = 0.2;
const WINDOW_MS = 1000;

export const MAX_STEPS_PER_WINDOW = 6;

export function squareGrids(from: number, to: number): GridSize[] {
  return Array.from({ length: to - from + 1 }, (_, index) => ({ cols: from + index, rows: from + index }));
}

export function gridName({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

export function countChanged(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function stepEndTimes(output: RecipeOutput, isLoop: boolean): number[] {
  const { frames, durations } = output;
  const cells = frames[0].length;
  const lastStep = isLoop ? frames.length : frames.length - 1;
  const ends = durations.map((_, index) => durations.slice(0, index + 1).reduce((sum, ms) => sum + ms, 0));
  return Array.from({ length: Math.max(0, lastStep) }, (_, index) => index).flatMap((index) => {
    const next = frames[(index + 1) % frames.length];
    const step = Math.abs(countLit(next) - countLit(frames[index]));
    return frames.length > 1 && step >= FLASH_STEP_FRACTION * cells ? [ends[index]] : [];
  });
}

function unroll(times: readonly number[], loopMs: number, loops: number): number[] {
  return Array.from({ length: loops }, (_, loop) => times.map((time) => time + loop * loopMs)).flat();
}

/** Most lit-count steps of 20 percent of the grid or more inside any 1 s window. */
export function peakStepsPerWindow(output: RecipeOutput, isLoop: boolean): number {
  const times = stepEndTimes(output, isLoop);
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const loops = isLoop ? Math.ceil((2 * WINDOW_MS) / loopMs) + 1 : 1;
  const all = unroll(times, loopMs, loops);
  return all.reduce((most, start) => {
    const inside = all.filter((time) => time >= start && time < start + WINDOW_MS).length;
    return Math.max(most, inside);
  }, 0);
}

export function largestStep(output: RecipeOutput): number {
  const { frames } = output;
  return frames.reduce((most, frame, index) => {
    if (index === 0) return most;
    return Math.max(most, countChanged(frames[index - 1], frame));
  }, 0);
}

export function seamChange(output: RecipeOutput): number {
  const { frames } = output;
  return countChanged(frames[frames.length - 1], frames[0]);
}

export function toRows(frame: Frame, cols: number): string[] {
  return toFrameText(frame, cols).split(' ');
}

export function isMirroredBothWays(frame: Frame, cols: number): boolean {
  const rows = toRows(frame, cols);
  const isLeftRight = rows.every((row) => row === [...row].reverse().join(''));
  const isTopBottom = rows.every((row, index) => row === rows[rows.length - 1 - index]);
  return isLeftRight && isTopBottom;
}

function isLitAt(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  const isInside = x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
  return isInside && frame[y * grid.cols + x] === 1;
}

const NEIGHBOURS = [-1, 0, 1]
  .flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const))
  .filter(([dx, dy]) => dx !== 0 || dy !== 0);

export function countIsolated(frame: Frame, grid: GridSize): number {
  return frame.filter((bit, index) => {
    if (bit !== 1) return false;
    const x = index % grid.cols;
    const y = Math.floor(index / grid.cols);
    return !NEIGHBOURS.some(([dx, dy]) => isLitAt(frame, grid, x + dx, y + dy));
  }).length;
}

const ORTHOGONAL = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function floodFrom(frame: Frame, grid: GridSize, start: number, seen: ReadonlySet<number>): Set<number> {
  const visit = (queue: readonly number[], found: ReadonlySet<number>): Set<number> => {
    if (queue.length === 0) return new Set(found);
    const [index, ...rest] = queue;
    const x = index % grid.cols;
    const y = Math.floor(index / grid.cols);
    const next = ORTHOGONAL.filter(([dx, dy]) => isLitAt(frame, grid, x + dx, y + dy))
      .map(([dx, dy]) => (y + dy) * grid.cols + x + dx)
      .filter((cell) => !found.has(cell) && !seen.has(cell));
    return visit([...rest, ...next], new Set([...found, ...next]));
  };
  return visit([start], new Set([start]));
}

export function countBlobs(frame: Frame, grid: GridSize): number {
  const lit = frame.flatMap((bit, index) => (bit === 1 ? [index] : []));
  const result = lit.reduce(
    (state, index) => {
      if (state.seen.has(index)) return state;
      const blob = floodFrom(frame, grid, index, state.seen);
      return { seen: new Set([...state.seen, ...blob]), count: state.count + 1 };
    },
    { seen: new Set<number>(), count: 0 },
  );
  return result.count;
}

export function totalMs(output: RecipeOutput): number {
  return output.durations.reduce((sum, ms) => sum + ms, 0);
}

export const MAX_CELL_FLASHES_PER_WINDOW = 3;

function cellOnStarts(output: RecipeOutput, cell: number): number[] {
  const { frames, durations } = output;
  const starts = durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
  return frames.flatMap((frame, index) => {
    const previous = frames[(index - 1 + frames.length) % frames.length];
    return frame[cell] === 1 && previous[cell] === 0 ? [starts[index]] : [];
  });
}

/** Most times one dot turns on inside any 1 s window, played as a loop. */
export function peakCellFlashesPerWindow(output: RecipeOutput): number {
  const loopMs = output.durations.reduce((sum, ms) => sum + ms, 0);
  const loops = Math.ceil((2 * WINDOW_MS) / loopMs) + 1;
  return Array.from({ length: output.frames[0].length }, (_, cell) => {
    const all = unroll(cellOnStarts(output, cell), loopMs, loops);
    return all.reduce((most, start) => {
      const inside = all.filter((time) => time >= start && time < start + WINDOW_MS).length;
      return Math.max(most, inside);
    }, 0);
  }).reduce((most, count) => Math.max(most, count), 0);
}
