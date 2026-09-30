import type { RecipeOutput } from '../../../../src/core/recipes';
import type { Frame, GridSize } from '../../../../src/core/types';

const BIG_CHANGE_SHARE = 0.2;
const WINDOW_MS = 1000;
export const MAX_BIG_CHANGES_PER_WINDOW = 6;

export function squareGrids(from: number, to = 16): GridSize[] {
  return Array.from({ length: to - from + 1 }, (_, index) => ({ cols: from + index, rows: from + index }));
}

export function gridsFrom(smallest: GridSize): GridSize[] {
  const extra: GridSize[] = [
    { cols: smallest.cols + 3, rows: smallest.rows },
    { cols: smallest.cols, rows: smallest.rows + 4 },
    { cols: 16, rows: Math.max(smallest.rows, 9) },
    { cols: Math.max(smallest.cols, 9), rows: 16 },
  ];
  const squares = squareGrids(Math.max(smallest.cols, smallest.rows));
  return [smallest, ...extra.filter((grid) => grid.cols <= 16 && grid.rows <= 16), ...squares];
}

export function changedCells(a: Frame, b: Frame): number {
  return a.reduce<number>((total, bit, index) => total + (bit === b[index] ? 0 : 1), 0);
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index + 1).reduce((sum, ms) => sum + ms, 0));
}

export function maxBigChangesPerSecond({ frames, durations }: RecipeOutput, isLoop: boolean): number {
  const passes = isLoop ? 2 : 1;
  const allFrames = Array.from({ length: passes }, () => frames).flat();
  const allDurations = Array.from({ length: passes }, () => durations).flat();
  const cells = frames[0].length;
  const ends = startTimes(allDurations);
  const times = allFrames
    .slice(1)
    .flatMap((frame, index) =>
      changedCells(allFrames[index], frame) >= BIG_CHANGE_SHARE * cells ? [ends[index]] : [],
    );
  const counts = times.map(
    (start) => times.filter((time) => time >= start && time < start + WINDOW_MS).length,
  );
  return Math.max(0, ...counts);
}

export function seamChange({ frames }: RecipeOutput): number {
  return changedCells(frames[frames.length - 1], frames[0]);
}

export function maxStepChange({ frames }: RecipeOutput): number {
  return Math.max(0, ...frames.slice(1).map((frame, index) => changedCells(frames[index], frame)));
}

export function totalMs({ durations }: RecipeOutput): number {
  return durations.reduce((sum, ms) => sum + ms, 0);
}

export function cellsOf(frame: Frame, cols: number): (readonly [number, number])[] {
  return frame.flatMap((bit, index) =>
    bit === 1 ? [[index % cols, Math.floor(index / cols)] as const] : [],
  );
}

type Cell = readonly [number, number];

const ORTHOGONAL_STEPS: readonly Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const EIGHT_STEPS: readonly Cell[] = [-1, 0, 1].flatMap((dy) =>
  [-1, 0, 1].filter((dx) => dx !== 0 || dy !== 0).map((dx): Cell => [dx, dy]),
);

function keyOf([x, y]: Cell): string {
  return `${x},${y}`;
}

function reach(
  keys: ReadonlySet<string>,
  frontier: readonly Cell[],
  seen: ReadonlySet<string>,
  steps: readonly Cell[],
): ReadonlySet<string> {
  const next = frontier
    .flatMap(([x, y]) => steps.map(([dx, dy]): Cell => [x + dx, y + dy]))
    .filter((cell) => keys.has(keyOf(cell)) && !seen.has(keyOf(cell)));
  const unique = next.filter(
    (cell, index) => next.findIndex((other) => keyOf(other) === keyOf(cell)) === index,
  );
  if (unique.length === 0) return seen;
  return reach(keys, unique, new Set([...seen, ...unique.map(keyOf)]), steps);
}

function isConnected(frame: Frame, cols: number, steps: readonly Cell[]): boolean {
  const cells = cellsOf(frame, cols);
  if (cells.length === 0) return true;
  const keys = new Set(cells.map(keyOf));
  return reach(keys, [cells[0]], new Set([keyOf(cells[0])]), steps).size === keys.size;
}

export function isEightConnected(frame: Frame, cols: number): boolean {
  return isConnected(frame, cols, EIGHT_STEPS);
}

export function isFourConnected(frame: Frame, cols: number): boolean {
  return isConnected(frame, cols, ORTHOGONAL_STEPS);
}

export function isBlank(frame: Frame): boolean {
  return frame.every((bit) => bit === 0);
}

export function gridName({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function digest({ frames, durations }: RecipeOutput): string {
  const text = frames.map((frame, index) => `${frame.join('')}:${durations[index]}`).join('|');
  const hash = [...text].reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), FNV_PRIME) >>> 0,
    FNV_OFFSET,
  );
  return `${frames.length} frames, ${totalMs({ frames, durations })} ms, ${hash.toString(16)}`;
}

export function rowsText(frame: Frame, cols: number): string[] {
  return Array.from({ length: frame.length / cols }, (_, y) =>
    frame
      .slice(y * cols, (y + 1) * cols)
      .map((bit) => (bit === 1 ? '#' : '.'))
      .join(''),
  );
}

export function framesText(output: RecipeOutput, cols: number): string[][] {
  return output.frames.map((frame) => rowsText(frame, cols));
}

export function litCount(frame: Frame): number {
  return frame.reduce<number>((total, bit) => total + bit, 0);
}

export function orthogonalNeighbours(frame: Frame, cols: number, [x, y]: readonly [number, number]): number {
  const rows = frame.length / cols;
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cols && ny < rows && frame[ny * cols + nx] === 1).length;
}
