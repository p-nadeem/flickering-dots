import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { range } from './shared';

/** One flake's trip from the top row: when it starts, its home column and its sway phase. */
export interface Spawn {
  id: number;
  start: number;
  column: number;
  phase: number;
}

/** How flakes fall: how many are in the air and how many ticks each row takes. */
export interface FlakeConfig {
  count: number;
  ticksPerRow: number;
  seed: number;
}

const SWAY_AMPLITUDE = 0.6;
const SWAY_RATE = 0.3;
const SEED_SCALE = 7919;
const FULL_TURN = 2 * Math.PI;

/** Flakes in the air for a density: round(density * cols / 2), at least one. */
export function getFlakeCount(cols: number, density: number): number {
  return Math.max(1, Math.round((density * cols) / 2));
}

/** Ticks one flake takes to fall from the top row onto the ground below the bottom row. */
export function getFallTicks(grid: GridSize, config: FlakeConfig): number {
  return (grid.rows + 1) * config.ticksPerRow;
}

function makeSpawn(grid: GridSize, config: FlakeConfig, lap: number, flake: number): Spawn {
  const random = createRng(config.seed * SEED_SCALE + lap * config.count + flake);
  const fall = getFallTicks(grid, config);
  return {
    id: lap * config.count + flake,
    start: lap * fall + Math.floor((flake * fall) / config.count),
    column: Math.floor(random() * grid.cols),
    phase: random() * FULL_TURN,
  };
}

/** Staggered seeded spawns for laps `firstLap` up to but not including `endLap`. */
export function getSpawns(grid: GridSize, config: FlakeConfig, firstLap: number, endLap: number): Spawn[] {
  return range(firstLap, endLap).flatMap((lap) =>
    range(0, config.count).map((flake) => makeSpawn(grid, config, lap, flake)),
  );
}

/** Where a flake is `age` ticks after it spawns: one row per `ticksPerRow` ticks, swaying one column at most. */
export function flakeAt(grid: GridSize, config: FlakeConfig, spawn: Spawn, age: number): Point {
  const sway = Math.round(SWAY_AMPLITUDE * Math.sin(spawn.phase + SWAY_RATE * age));
  const x = Math.min(grid.cols - 1, Math.max(0, spawn.column + sway));
  return [x, Math.floor(age / config.ticksPerRow)];
}
