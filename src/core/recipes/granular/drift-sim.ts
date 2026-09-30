import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { flakeAt, getFallTicks } from './drift-flakes';
import type { FlakeConfig, Spawn } from './drift-flakes';
import { range } from './shared';

/** Anything the drift carries from tick to tick; `heights` holds each column's snow depth. */
export interface DriftState {
  heights: readonly number[];
}

/** What a drift simulation needs: flakes, a clock and a rule that turns landings into new heights. */
export interface DriftRun<S extends DriftState> {
  grid: GridSize;
  config: FlakeConfig;
  spawns: readonly Spawn[];
  ticks: number;
  ageAt: (spawn: Spawn, tick: number) => number;
  initial: S;
  advance: (state: S, landings: readonly number[], tick: number) => S;
}

/** One simulated tick: the lit cells and the drift state after it. */
export interface DriftTick<S extends DriftState> {
  points: Point[];
  state: S;
}

interface FlakePass {
  landed: ReadonlyMap<number, number>;
  landings: readonly number[];
  flakes: readonly Point[];
}

function passFlakes<S extends DriftState>(
  run: DriftRun<S>,
  state: S,
  tick: number,
  landed: FlakePass['landed'],
): FlakePass {
  const fall = getFallTicks(run.grid, run.config);
  const start: FlakePass = { landed, landings: [], flakes: [] };
  return run.spawns.reduce<FlakePass>((pass, spawn) => {
    const age = run.ageAt(spawn, tick);
    const landedAge = pass.landed.get(spawn.id) ?? fall;
    if (age < 0 || age >= fall || age >= landedAge) return pass;
    const flake = flakeAt(run.grid, run.config, spawn, age);
    const [x, y] = flake;
    if (y < run.grid.rows - state.heights[x]) return { ...pass, flakes: [...pass.flakes, flake] };
    return {
      ...pass,
      landed: new Map([...pass.landed, [spawn.id, age]]),
      landings: [...pass.landings, x],
    };
  }, start);
}

/** The lit cells of a drift: each column's snow from the bottom up. */
export function driftPoints({ rows }: GridSize, heights: readonly number[]): Point[] {
  return heights.flatMap((height, x) => range(rows - height, rows).map((y): Point => [x, y]));
}

/** Runs the drift for `ticks` ticks and returns every tick's picture and state. */
export function simulateDrift<S extends DriftState>(run: DriftRun<S>): DriftTick<S>[] {
  interface Carry {
    state: S;
    landed: ReadonlyMap<number, number>;
    ticks: readonly DriftTick<S>[];
  }
  const start: Carry = { state: run.initial, landed: new Map(), ticks: [] };
  return [
    ...range(0, run.ticks).reduce<Carry>((carry, tick) => {
      const pass = passFlakes(run, carry.state, tick, carry.landed);
      const state = run.advance(carry.state, pass.landings, tick);
      const points = [...driftPoints(run.grid, state.heights), ...pass.flakes];
      return { state, landed: pass.landed, ticks: [...carry.ticks, { points, state }] };
    }, start).ticks,
  ];
}
