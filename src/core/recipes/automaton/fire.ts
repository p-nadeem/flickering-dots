import { glyphMask, isGlyphName } from '../../glyphs';
import type { GlyphName } from '../../glyphs';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { createFrame } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { advanceFire, createFireSim, createFireState, drawFire, getFlameTops, runFire } from './fire-sim';
import type { FireSim, FireState, FireStep } from './fire-sim';
import { RESULT_HOLD_MS, orFrames, shiftFrame, topLitRow, withLastDuration } from './frames';

const WARM_UP_STEPS = 40;
const FLAME_MS = 80;
const PILOT_MS = 140;
const PILOT_DENSITY_MAX = 0.4;
const PILOT_REFERENCE_ROWS = 8;
const PILOT_ROWS = 2;
const FLAME_BED_ROWS = 1;
const BURN_MS = 60;
const RISE_MS = 60;
const BURN_FRAMES = 4;
const FLARE_DENSITY = 1;
const FLARE_STEPS = 2;
const FLARE_WARM_STEPS = 1;
const SMOKE_MS = 120;
const SMOKE_DOTS = 2;
const DEFAULT_RESULT_GLYPH: GlyphName = 'check';

/** Defaults of the fire variants: flame height (density), recorded frames and seed. */
export const FIRE_DEFAULTS = { density: 0.65, frames: 16, seed: 11 } as const satisfies RecipeParams;

interface FireRun {
  sim: FireSim;
  warm: FireState;
  density: number;
}

function isPilotDensity(density: number): boolean {
  return density < PILOT_DENSITY_MAX;
}

function getFlameDensity(grid: GridSize, density: number): number {
  return isPilotDensity(density) ? density * Math.min(1, PILOT_REFERENCE_ROWS / grid.rows) : density;
}

function startFire(grid: GridSize, params: RecipeParams): FireRun {
  const asked = params.density ?? FIRE_DEFAULTS.density;
  const density = getFlameDensity(grid, asked);
  const sim = createFireSim(grid, params.seed ?? FIRE_DEFAULTS.seed, !isPilotDensity(asked));
  const warm = runFire(sim, createFireState(sim), WARM_UP_STEPS, { source: 1, density });
  return { sim, warm, density };
}

function recordFire(run: FireRun, steps: readonly FireStep[], bedFor: (step: FireStep) => number): Frame[] {
  return steps
    .reduce<FireState[]>(
      (states, step) => [...states, advanceFire(run.sim, states[states.length - 1], step)],
      [run.warm],
    )
    .slice(1)
    .map((state, index) => drawFire(run.sim, state, bedFor(steps[index])));
}

function keepBottomRows(frame: Frame, grid: GridSize, rows: number): Frame {
  return createFrame(grid, (x, y) => y >= grid.rows - rows && frame[y * grid.cols + x] === 1);
}

/** A burning fire: a pilot light in the bottom two rows at low density, tongues and sparks above an ember bed otherwise. */
export function generateFire(grid: GridSize, params: RecipeParams): RecipeOutput {
  const run = startFire(grid, params);
  const isPilot = isPilotDensity(params.density ?? FIRE_DEFAULTS.density);
  const count = params.frames || FIRE_DEFAULTS.frames;
  const steps = Array.from({ length: count }, (): FireStep => ({ source: 1, density: run.density }));
  const flames = recordFire(run, steps, () => (isPilot ? 0 : FLAME_BED_ROWS));
  const frames = isPilot ? flames.map((frame) => keepBottomRows(frame, grid, PILOT_ROWS)) : flames;
  return { frames, durations: frames.map(() => (isPilot ? PILOT_MS : FLAME_MS)) };
}

function drawHeights(grid: GridSize, heights: readonly number[]): Frame {
  return createFrame(grid, (x, y) => grid.rows - 1 - y < heights[x]);
}

function drawEmbers(grid: GridSize, heights: readonly number[]): Frame {
  const parity = Math.floor((grid.cols - 1) / 2) % 2;
  return createFrame(grid, (x, y) => y === grid.rows - 1 && heights[x] > 0 && x % 2 === parity);
}

function burnDown(grid: GridSize, run: FireRun): Frame[] {
  const tops = getFlameTops(run.sim, run.warm);
  const heights = tops.map((top) => Math.max(FLAME_BED_ROWS, grid.rows - top));
  const shrinking = Array.from({ length: BURN_FRAMES }, (_, step) =>
    drawHeights(
      grid,
      heights.map((height) => Math.floor((height * (BURN_FRAMES - 1 - step)) / BURN_FRAMES)),
    ),
  );
  return [drawFire(run.sim, run.warm, FLAME_BED_ROWS), ...shrinking.slice(0, -1), drawEmbers(grid, heights)];
}

const NEAR: readonly Point[] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function embersClearOf(grid: GridSize, embers: Frame, rising: Frame): Frame {
  return createFrame(
    grid,
    (x, y) =>
      embers[y * grid.cols + x] === 1 && !NEAR.some(([dx, dy]) => isLit(rising, grid, x + dx, y + dy)),
  );
}

function isLit(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows && frame[y * grid.cols + x] === 1;
}

function riseFromEmbers(grid: GridSize, glyph: Frame, embers: Frame): Frame[] {
  const depth = grid.rows - topLitRow(glyph, grid);
  return Array.from({ length: depth }, (_, index) => {
    const shift = depth - 1 - index;
    const rising = shiftFrame(glyph, grid, shift);
    return shift === 0 ? rising : orFrames(rising, embersClearOf(grid, embers, rising));
  });
}

function getResultGlyph(params: RecipeParams): GlyphName {
  return params.glyph !== undefined && isGlyphName(params.glyph) ? params.glyph : DEFAULT_RESULT_GLYPH;
}

/** The source goes out, the flames burn down to the embers and the result glyph (check by default) rises out of them, embers clearing where it passes. */
export function generateFireOut(grid: GridSize, params: RecipeParams): RecipeOutput {
  const burn = burnDown(grid, startFire(grid, params));
  const embers = burn[burn.length - 1];
  const rise = riseFromEmbers(grid, glyphMask(getResultGlyph(params), grid), embers);
  const durations = [...burn.map(() => BURN_MS), ...rise.map(() => RISE_MS)];
  return { frames: [...burn, ...rise], durations: withLastDuration(durations, RESULT_HOLD_MS) };
}

function getSmoke(grid: GridSize): Frame[] {
  const x = Math.floor((grid.cols - 1) / 2);
  return Array.from({ length: grid.rows + 1 }, (_, rise) => {
    const lowY = grid.rows - 1 - rise;
    return drawDots(grid, x, lowY);
  });
}

function drawDots(grid: GridSize, x: number, lowY: number): Frame {
  const litRows = Array.from({ length: SMOKE_DOTS }, (_, index) => lowY - index);
  return createFrame(grid, (cellX, cellY) => cellX === x && litRows.includes(cellY));
}

/** The fire flares up for two frames, gutters out at once and leaves two smoke dots that drift up and vanish (still: the smoke halfway up). */
export function generateFireGutter(grid: GridSize, params: RecipeParams): RecipeOutput {
  const run = startFire(grid, params);
  const flareSteps = Array.from({ length: FLARE_WARM_STEPS + FLARE_STEPS }, (): FireStep => ({
    source: 1,
    density: FLARE_DENSITY,
  }));
  const flare = recordFire(run, flareSteps, () => FLAME_BED_ROWS).slice(FLARE_WARM_STEPS);
  const smoke = getSmoke(grid);
  const durations = [...flare.map(() => FLAME_MS), ...smoke.map(() => SMOKE_MS)];
  return {
    frames: [...flare, ...smoke],
    durations: withLastDuration(durations, RESULT_HOLD_MS),
    still: flare.length + Math.floor(grid.rows / 2),
  };
}
