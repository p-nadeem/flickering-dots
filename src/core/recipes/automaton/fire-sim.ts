import type { Frame, GridSize } from '../../types';
import { createRng } from '../../rng';
import { createFrame } from '../helpers';

const SOURCE_HEAT = 100;
const LIT_HEAT = 12;
const SOURCE_TAPER = 0.5;
const EDGE_PAD = 0.5;
const HEIGHT_GAIN = 1.8;
const MIN_DENSITY = 0.05;
const DRIFT_CHOICES = 3;
const CENTRE_WEIGHT = 2;
const SIDE_WEIGHT = 0.5;
const COOL_JITTER = 0.3;
const TONGUE_GAIN = 2.2;
const TONGUE_FLOOR = 0.2;
const SIDE_COOLING = 1.5;
const TONGUE_WAVES = [1.7, 0.9, 0.6, 0.5] as const;
const VALLEY_DEPTH = 0;
const SPARK_CHANCE = 0.2;
const SPARK_GAP = 2;
const SPARK_MIN_LIFE = 2;
const SPARK_LIFE_CHOICES = 3;

interface Spark {
  x: number;
  y: number;
  life: number;
}

/** Heat on a hidden grid one row taller than the view, plus the sparks above the flames. */
export interface FireState {
  heat: readonly number[];
  step: number;
  sparks: readonly Spark[];
}

/** How hard the source burns (0 to 1) and how tall the flames reach (density, 0 to 1) for one step. */
export interface FireStep {
  source: number;
  density: number;
}

/** A seeded fire simulation on one grid. */
export interface FireSim {
  grid: GridSize;
  random: () => number;
  base: readonly number[];
  sparkChance: number;
}

function clampIndex(value: number, length: number): number {
  return Math.min(length - 1, Math.max(0, value));
}

function getCentreX(grid: GridSize): number {
  return (grid.cols - 1) / 2;
}

/** Creates a fire simulation whose randomness comes from `seed`; a pilot light throws no sparks. */
export function createFireSim(grid: GridSize, seed: number, hasSparks: boolean = true): FireSim {
  const cx = getCentreX(grid);
  const base = Array.from(
    { length: grid.cols },
    (_, x) => SOURCE_HEAT * (1 - SOURCE_TAPER * ((x - cx) / (cx + EDGE_PAD)) ** 2),
  );
  return { grid, random: createRng(seed), base, sparkChance: hasSparks ? SPARK_CHANCE : 0 };
}

/** The cold starting state with only the source row burning. */
export function createFireState(sim: FireSim): FireState {
  const { cols, rows } = sim.grid;
  const heat = Array.from({ length: cols * (rows + 1) }, (_, index) =>
    index >= cols * rows ? sim.base[index % cols] : 0,
  );
  return { heat, step: 0, sparks: [] };
}

function heatAt(state: FireState, cols: number, x: number, y: number): number {
  return x < 0 || x >= cols ? 0 : state.heat[y * cols + x];
}

function getTongue(x: number, step: number): number {
  const [fastX, fastT, slowX, slowT] = TONGUE_WAVES;
  return 1 / 2 + (Math.sin(fastX * x + fastT * step) * Math.sin(slowX * x - slowT * step)) / 2;
}

function getRisingHeat(sim: FireSim, state: FireState, x: number, y: number): number {
  const { cols } = sim.grid;
  const drift = Math.floor(sim.random() * DRIFT_CHOICES) - 1;
  const from = x + drift;
  const below = y + 1;
  const weighted =
    SIDE_WEIGHT * heatAt(state, cols, from - 1, below) +
    CENTRE_WEIGHT * heatAt(state, cols, from, below) +
    SIDE_WEIGHT * heatAt(state, cols, from + 1, below);
  return weighted / (CENTRE_WEIGHT + 2 * SIDE_WEIGHT);
}

function getCooling(sim: FireSim, density: number, x: number, step: number): number {
  const { rows } = sim.grid;
  const cx = getCentreX(sim.grid);
  const perRow = SOURCE_HEAT / (rows * Math.max(MIN_DENSITY, density) * HEIGHT_GAIN);
  const jitter = 1 - COOL_JITTER / 2 + COOL_JITTER * sim.random();
  const tongue = Math.max(TONGUE_FLOOR, 1 + TONGUE_GAIN * (1 / 2 - getTongue(x, step)));
  const side = 1 + (SIDE_COOLING * Math.abs(x - cx)) / (cx + EDGE_PAD);
  return perRow * jitter * tongue * side;
}

function getHeatRow(sim: FireSim, state: FireState, y: number, density: number, step: number): number[] {
  return Array.from({ length: sim.grid.cols }, (_, x) => {
    const rising = getRisingHeat(sim, state, x, y);
    return Math.max(0, rising - getCooling(sim, density, x, step));
  });
}

function getFlameTop(heat: readonly number[], grid: GridSize, x: number): number {
  const rowsUp = Array.from({ length: grid.rows }, (_, index) => grid.rows - 1 - index);
  const unlit = rowsUp.find((y) => heat[y * grid.cols + x] <= LIT_HEAT);
  return unlit === undefined ? 0 : unlit + 1;
}

function moveSparks(sim: FireSim, sparks: readonly Spark[]): Spark[] {
  return sparks
    .map((spark) => ({
      x: clampIndex(spark.x + Math.floor(sim.random() * DRIFT_CHOICES) - 1, sim.grid.cols),
      y: spark.y - 1,
      life: spark.life - 1,
    }))
    .filter((spark) => spark.life > 0 && spark.y >= 0);
}

function spawnSpark(sim: FireSim, heat: readonly number[]): Spark[] {
  if (sim.random() >= sim.sparkChance) return [];
  const x = Math.floor(sim.random() * sim.grid.cols);
  const life = SPARK_MIN_LIFE + Math.floor(sim.random() * SPARK_LIFE_CHOICES);
  const y = getFlameTop(heat, sim.grid, x) - SPARK_GAP;
  return y >= 0 ? [{ x, y, life }] : [];
}

/** Advances the fire one step: heat rises and cools, sparks drift up and new ones fly off the tongues. */
export function advanceFire(sim: FireSim, state: FireState, { source, density }: FireStep): FireState {
  const step = state.step + 1;
  const { rows } = sim.grid;
  const upward = Array.from({ length: rows }, (_, index) => rows - 1 - index);
  const heatRows = upward.map((y) => getHeatRow(sim, state, y, density, step));
  const sourceRow = sim.base.map((heat) => heat * source);
  const heat = [...[...heatRows].reverse().flat(), ...sourceRow];
  const sparks = [...moveSparks(sim, state.sparks), ...spawnSpark(sim, heat)];
  return { heat, step, sparks };
}

/** Runs `count` steps with the same settings. */
export function runFire(sim: FireSim, state: FireState, count: number, settings: FireStep): FireState {
  return Array.from({ length: count }).reduce<FireState>(
    (current) => advanceFire(sim, current, settings),
    state,
  );
}

/** Row of each column's flame tip, or `grid.rows` for a column with no flame. */
export function getFlameTops(sim: FireSim, state: FireState): number[] {
  const { grid } = sim;
  return Array.from({ length: grid.cols }, (_, x) => {
    const lit = Array.from({ length: grid.rows }, (_, y) => y).find(
      (y) => state.heat[y * grid.cols + x] > LIT_HEAT,
    );
    return lit ?? grid.rows;
  });
}

function fillNarrowValleys(tops: readonly number[], rows: number): number[] {
  const heightOf = (x: number): number => (x < 0 || x >= tops.length ? 0 : rows - tops[x]);
  return tops.map((top, x) => {
    const shallowest = Math.min(heightOf(x - 1), heightOf(x + 1)) - VALLEY_DEPTH;
    return Math.min(top, rows - shallowest);
  });
}

/** Draws the fire: each column lit from its flame tip down, the bottom `bedRows` rows always lit, sparks on top. */
export function drawFire(sim: FireSim, state: FireState, bedRows: number): Frame {
  const { grid } = sim;
  const tops = fillNarrowValleys(getFlameTops(sim, state), grid.rows);
  const sparkCells = new Set(state.sparks.map((spark) => spark.y * grid.cols + spark.x));
  return createFrame(
    grid,
    (x, y) => y >= tops[x] || y >= grid.rows - bedRows || sparkCells.has(y * grid.cols + x),
  );
}
