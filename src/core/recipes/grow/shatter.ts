import type { GridSize } from '../../types';
import { toPoint } from './lattice';
import type { Cells } from './lattice';

interface Shard {
  x: number;
  y: number;
}

const CHANGE_SHARE = 0.15;
const MIN_CHANGE = 2;

function drawn(grid: GridSize, shards: readonly Shard[], releases: readonly number[], frame: number): Cells {
  return new Set(
    shards
      .map(({ x, y }, index) => ({ x, y: index < releases.length ? y + frame - releases[index] : y }))
      .filter(({ y }) => y < grid.rows)
      .map(({ x, y }) => y * grid.cols + x),
  );
}

function difference(a: Cells, b: Cells): number {
  return [...a].filter((cell) => !b.has(cell)).length + [...b].filter((cell) => !a.has(cell)).length;
}

function releaseFor(
  grid: GridSize,
  shards: readonly Shard[],
  releases: readonly number[],
  frame: number,
  previous: Cells,
): number[] {
  const cap = Math.max(MIN_CHANGE, Math.floor(CHANGE_SHARE * grid.cols * grid.rows));
  const isIdle = releases.every((at, index) => shards[index].y + frame - at >= grid.rows);
  let current = isIdle && releases.length < shards.length ? [...releases, frame - 1] : [...releases];
  while (current.length < shards.length) {
    const trial = [...current, frame - 1];
    if (difference(previous, drawn(grid, shards, trial, frame)) > cap) break;
    current = trial;
  }
  return current;
}

/** Drops the cells out of the bottom edge one row per frame, releasing them bottom first so each frame changes about 15 percent of the grid at most. */
export function shatterFrames(grid: GridSize, cells: Cells): Cells[] {
  const shards: Shard[] = [...cells]
    .map((index) => toPoint(grid, index))
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([x, y]) => ({ x, y }));
  let frames: Cells[] = [];
  let releases: number[] = [];
  let previous = cells;
  for (let frame = 1; previous.size > 0; frame += 1) {
    releases = releaseFor(grid, shards, releases, frame, previous);
    previous = drawn(grid, shards, releases, frame);
    frames = [...frames, previous];
  }
  return frames;
}
