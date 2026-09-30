import { countLit } from '../../frame';
import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { stepsToOutput } from './steps';
import type { ParticlesBuilder, Step } from './steps';
import { FLASH_TICKS, FLY_PERIOD, createSwarm, isAllLit, litPoints, tickSwarm } from './swarm';
import type { Swarm } from './swarm';

const TICK_MS = 50;
const SYNC_EARLIEST = 110;
const SYNC_LATEST = 150;
const SYNC_TARGET = 130;
const SEED_TRIES = 64;
const UNISON_PERIODS = 3;
const UNISON_FLASHES = UNISON_PERIODS + 1;
const UNISON_TAIL = UNISON_PERIODS * FLY_PERIOD + FLASH_TICKS;
const BEAT_PERIOD = 30;
const SYNC_FLASHES = 3;
const SYNC_FLASH_MS = 100;
const SYNC_LEAD_MS = 150;
const SYNC_GAP_MS = 400;
const SYNC_HOLD_MS = 400;
const OUT_FLASH_MS = 150;
const OUT_GAP_MS = 200;
const OUT_DROP = 2;
const OUT_HOLD_MS = 1500;

interface SyncRun {
  seed: number;
  history: Swarm[];
}

function simulate(start: Swarm, ticks: number, isCoupled: boolean): Swarm[] {
  return Array.from({ length: ticks }).reduce<Swarm[]>((history) => {
    const last = history[history.length - 1] ?? start;
    return [...history, tickSwarm(last, isCoupled)];
  }, []);
}

function countFlashes(history: readonly Swarm[]): number {
  return history.filter((swarm, tick) => isAllLit(swarm) && (tick === 0 || !isAllLit(history[tick - 1])))
    .length;
}

function bakeRun(grid: GridSize, seed: number): SyncRun | undefined {
  const history = simulate(createSwarm(grid, seed), SYNC_LATEST + UNISON_TAIL, true);
  const sync = history.findIndex(isAllLit);
  if (sync < SYNC_EARLIEST || sync > SYNC_LATEST) return undefined;
  const baked = history.slice(0, sync + UNISON_TAIL);
  return countFlashes(baked) === UNISON_FLASHES ? { seed, history: baked } : undefined;
}

function pickSyncRun(grid: GridSize, baseSeed: number): SyncRun {
  const seeds = Array.from({ length: SEED_TRIES }, (_, offset) => baseSeed + offset);
  const found = seeds.reduce<SyncRun | undefined>((run, seed) => run ?? bakeRun(grid, seed), undefined);
  return (
    found ?? {
      seed: baseSeed,
      history: simulate(createSwarm(grid, baseSeed), SYNC_TARGET + UNISON_TAIL, true),
    }
  );
}

function scatterTicks(start: Swarm, synced: Swarm): Point[][] {
  return Array.from({ length: FLY_PERIOD }, (_, index) => {
    const tick = index + 1;
    return synced.cells.filter((_, fly) => {
      const advance = 1 - synced.phases[fly] + start.phases[fly];
      const fireTick = Math.ceil(((1 - synced.phases[fly]) * FLY_PERIOD) / advance);
      return tick >= fireTick && tick < fireTick + FLASH_TICKS;
    });
  });
}

function toTickSteps(ticks: readonly (readonly Point[])[]): Step[] {
  return ticks.map((points) => ({ points, ms: TICK_MS }));
}

function generateSyncing(grid: GridSize, run: SyncRun): RecipeOutput {
  const { history } = run;
  const scatter = scatterTicks(createSwarm(grid, run.seed), history[history.length - 1]);
  return stepsToOutput(grid, toTickSteps([...history.map(litPoints), ...scatter]));
}

function fireTick(phase: number, period: number): number {
  return period - 1 - Math.floor(phase * period);
}

function isFlashing(since: number, period: number, lastSince: number): boolean {
  if (since < 0) return since + period < FLASH_TICKS;
  return since < lastSince && since % period < FLASH_TICKS;
}

function freeTicks(swarm: Swarm, period: number, periods: number, isFading = false): Point[][] {
  const lastSince = isFading ? (periods - 1) * period + FLASH_TICKS : Infinity;
  return Array.from({ length: period * periods }, (_, tick) =>
    swarm.cells.filter((_, fly) => isFlashing(tick - fireTick(swarm.phases[fly], period), period, lastSince)),
  );
}

function countFlips(before: readonly Point[], after: readonly Point[]): number {
  const isIn =
    (list: readonly Point[]) =>
    ([x, y]: Point) =>
      list.some(([px, py]) => px === x && py === y);
  return (
    before.filter((point) => !isIn(after)(point)).length +
    after.filter((point) => !isIn(before)(point)).length
  );
}

function startCalm(ticks: readonly Point[][]): Point[][] {
  const flips = ticks.map((tick, index) =>
    countFlips(ticks[(index + ticks.length - 1) % ticks.length], tick),
  );
  const start = flips.indexOf(Math.min(...flips));
  return [...ticks.slice(start), ...ticks.slice(0, start)];
}

function halfSwarm(swarm: Swarm): Swarm {
  const count = Math.ceil(swarm.cells.length / 2);
  return {
    cells: swarm.cells.slice(0, count),
    phases: swarm.phases.slice(0, count),
    lit: swarm.lit.slice(0, count),
  };
}

function generateThinking(grid: GridSize, params: RecipeParams, seed: number): RecipeOutput {
  const run = pickSyncRun(grid, seed);
  if (params.density !== 0) return generateSyncing(grid, run);
  return stepsToOutput(
    grid,
    toTickSteps(startCalm(freeTicks(halfSwarm(createSwarm(grid, run.seed)), FLY_PERIOD, 1))),
  );
}

function generateBeat(grid: GridSize, seed: number): RecipeOutput {
  const { cells } = createSwarm(grid, seed);
  return stepsToOutput(grid, [
    { points: cells, ms: FLASH_TICKS * TICK_MS },
    { points: [], ms: (BEAT_PERIOD - FLASH_TICKS) * TICK_MS },
  ]);
}

function generateSync(grid: GridSize, seed: number): RecipeOutput {
  const swarm = createSwarm(grid, seed);
  const flashes = Array.from({ length: SYNC_FLASHES }, (): Step[] => [
    { points: swarm.cells, ms: SYNC_FLASH_MS },
    { points: [], ms: SYNC_GAP_MS },
  ]).flat();
  return stepsToOutput(grid, [
    { points: [], ms: SYNC_LEAD_MS },
    ...flashes,
    { points: swarm.cells, ms: SYNC_HOLD_MS },
  ]);
}

function dropOrder(cells: readonly Point[], seed: number): Point[] {
  const random = createRng(seed);
  return cells
    .map((cell) => ({ cell, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ cell }) => cell);
}

function generateScatter(grid: GridSize, seed: number): RecipeOutput {
  const order = dropOrder(createSwarm(grid, seed).cells, seed);
  const counts = Array.from(
    { length: Math.ceil(order.length / OUT_DROP) },
    (_, flash) => order.length - flash * OUT_DROP,
  );
  const flashes = counts.flatMap((count): Step[] => [
    { points: order.slice(0, count), ms: OUT_FLASH_MS },
    { points: [], ms: OUT_GAP_MS },
  ]);
  const output = stepsToOutput(grid, [...flashes, { points: order.slice(0, 1), ms: OUT_HOLD_MS }]);
  const half = Math.ceil(order.length / 2);
  return { ...output, still: output.frames.findIndex((frame) => countLit(frame) === half) };
}

function withCuratedSeed(build: (grid: GridSize, seed: number) => RecipeOutput): ParticlesBuilder {
  return (grid, _params, seed) => build(grid, pickSyncRun(grid, seed).seed);
}

/** Firefly variants: the swarm that slowly syncs (density 0 blinks freely), the steady beat, the instant sync and the scatter that loses fireflies flash by flash. */
export const FIREFLY_BUILDERS: Readonly<
  Record<'fireflies' | 'fireflies-beat' | 'fireflies-sync' | 'fireflies-scatter', ParticlesBuilder>
> = {
  fireflies: generateThinking,
  'fireflies-beat': withCuratedSeed(generateBeat),
  'fireflies-sync': withCuratedSeed(generateSync),
  'fireflies-scatter': withCuratedSeed(generateScatter),
};
