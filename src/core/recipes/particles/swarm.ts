import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import type { Point } from '../helpers';

/** Ticks between two flashes of a free-running firefly. */
export const FLY_PERIOD = 20;
/** Ticks a flash stays lit. */
export const FLASH_TICKS = 3;

const FLY_SHARE = 0.16;
const MIN_FLIES = 6;
const PULSE = 0.01;
const DESIGN_FLIES = 16;
const CONCAVITY = 2;
const CONCAVE_SCALE = Math.exp(CONCAVITY) - 1;
const FIRE_TOLERANCE = 1e-9;
const MIN_GAP = 2;

/** A swarm of fireflies: fixed cells, a phase in [0, 1) each and the ticks each flash has left. */
export interface Swarm {
  cells: readonly Point[];
  phases: readonly number[];
  lit: readonly number[];
}

function isSpaced(cols: number, chosen: readonly number[], index: number, gap: number): boolean {
  const x = index % cols;
  const y = Math.floor(index / cols);
  return chosen.every(
    (other) => Math.max(Math.abs((other % cols) - x), Math.abs(Math.floor(other / cols) - y)) >= gap,
  );
}

function pickSpaced(cols: number, order: readonly number[], count: number): number[] {
  const spaced = order.reduce<number[]>(
    (chosen, index) =>
      chosen.length < count && isSpaced(cols, chosen, index, MIN_GAP) ? [...chosen, index] : chosen,
    [],
  );
  const rest = order.filter((index) => !spaced.includes(index)).slice(0, count - spaced.length);
  return [...spaced, ...rest].sort((a, b) => a - b);
}

/** Places `max(6, round(0.16 * cells))` fireflies on seeded cells at least 2 apart (touching only when the grid is too full) with seeded phases. */
export function createSwarm(grid: GridSize, seed: number): Swarm {
  const random = createRng(seed);
  const cellCount = grid.cols * grid.rows;
  const count = Math.min(cellCount, Math.max(MIN_FLIES, Math.round(FLY_SHARE * cellCount)));
  const keys = Array.from({ length: cellCount }, () => random());
  const order = keys
    .map((key, index) => ({ key, index }))
    .sort((a, b) => a.key - b.key)
    .map(({ index }) => index);
  const chosen = pickSpaced(grid.cols, order, count);
  return {
    cells: chosen.map((index): Point => [index % grid.cols, Math.floor(index / grid.cols)]),
    phases: chosen.map(() => random()),
    lit: chosen.map(() => 0),
  };
}

function toState(phase: number): number {
  return Math.log(1 + CONCAVE_SCALE * phase) / CONCAVITY;
}

function toPhase(state: number): number {
  return (Math.exp(CONCAVITY * state) - 1) / CONCAVE_SCALE;
}

function hasReachedOne(value: number): boolean {
  return value >= 1 - FIRE_TOLERANCE;
}

function spreadFiring(
  states: readonly number[],
  fired: ReadonlySet<number>,
  pulse: number,
): ReadonlySet<number> {
  const kicked = states.flatMap((state, index) =>
    !fired.has(index) && hasReachedOne(state + pulse * fired.size) ? [index] : [],
  );
  return kicked.length === 0 ? fired : spreadFiring(states, new Set([...fired, ...kicked]), pulse);
}

/** Advances the swarm one tick: Mirollo-Strogatz with a concave state and an all-to-all pulse scaled to 16 flies, absorbing flies that reach 1. */
export function tickSwarm(swarm: Swarm, isCoupled: boolean): Swarm {
  const pulse = isCoupled ? (PULSE * DESIGN_FLIES) / swarm.cells.length : 0;
  const advanced = swarm.phases.map((phase) => phase + 1 / FLY_PERIOD);
  const states = advanced.map(toState);
  const firstFired = new Set(advanced.flatMap((phase, index) => (hasReachedOne(phase) ? [index] : [])));
  const fired = firstFired.size === 0 ? firstFired : spreadFiring(states, firstFired, pulse);
  const kick = pulse * fired.size;
  const phases = advanced.map((phase, index) => {
    if (fired.has(index)) return 0;
    return kick === 0 ? phase : toPhase(states[index] + kick);
  });
  const lit = swarm.lit.map((left, index) => (fired.has(index) ? FLASH_TICKS : Math.max(0, left - 1)));
  return { ...swarm, phases, lit };
}

/** True when every firefly's flash is lit. */
export function isAllLit(swarm: Swarm): boolean {
  return swarm.lit.every((left) => left > 0);
}

/** The cells of the fireflies whose flash is lit. */
export function litPoints(swarm: Swarm): Point[] {
  return swarm.cells.filter((_, index) => swarm.lit[index] > 0);
}
