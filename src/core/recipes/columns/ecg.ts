import { createRng } from '../../rng';
import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import type { RecipeFn, RecipeOutput } from '../helpers';
import { glyphMask } from '../../glyphs';
import { columnRowsOfMask, evenDurations, joinOutputs, RESULT_HOLD_MS } from './shared';
import type { ColumnRows } from './shared';

const PEN_MS = 45;
const SLOW_MS = 90;
const ERASE_AHEAD = 2;
const SPIKE = Number.POSITIVE_INFINITY;
const LONG_BEAT = [0, 1, 0, 0, -1, SPIKE, -2, 0, 0, 1, 1, 0];
const SHORT_BEAT = [1, 0, -1, SPIKE, -2, 0, 1];
const TINY_BEAT = [-1, SPIKE, -2];
const DEEP_DIP_MIN_ROWS = 7;
const DEEP_DIP = 2;
const SHALLOW_DIP = 1;
const IRREGULAR_SWEEPS = 3;
const IRREGULAR_SEED = 11;
const IRREGULAR_MAX_GAP = 3;
const IRREGULAR_MAX_DROP = 2;
const RISE_MS = [60, 45, 30];
const STOP_HOLD_MS = 300;
const CLEAR_MS = 60;
const FLAT_SWEEPS = 2;

interface Sweep {
  rows: ColumnRows;
  ms: number;
}

function baselineRow(rows: number): number {
  return rows - 1 - (rows >= DEEP_DIP_MIN_ROWS ? DEEP_DIP : SHALLOW_DIP);
}

function toRow(rows: number, offset: number): number {
  const baseline = baselineRow(rows);
  const up = offset === SPIKE ? baseline : offset;
  return Math.min(rows - 1, Math.max(0, baseline - up));
}

function beatCore(cols: number): readonly number[] {
  if (cols >= LONG_BEAT.length) return LONG_BEAT;
  return cols >= SHORT_BEAT.length ? SHORT_BEAT : TINY_BEAT;
}

function beatOffsets(cols: number): number[] {
  const core = beatCore(cols);
  const left = Math.floor((cols - core.length) / 2);
  return Array.from({ length: cols }, (_, x) => core[x - left] ?? 0);
}

function beatRows(grid: GridSize): number[] {
  return beatOffsets(grid.cols).map((offset) => toRow(grid.rows, offset));
}

function flatRows(grid: GridSize): number[] {
  return Array.from({ length: grid.cols }, () => baselineRow(grid.rows));
}

function runOwner(rows: ColumnRows, baseline: number, left: number): number | null {
  const a = rows[left];
  const b = rows[left + 1];
  if (a === null || a === undefined || b === null || b === undefined || Math.abs(a - b) <= 1) return null;
  return Math.abs(a - baseline) > Math.abs(b - baseline) ? left : left + 1;
}

function isRunCell(rows: ColumnRows, baseline: number, left: number, x: number, y: number): boolean {
  if (runOwner(rows, baseline, left) !== x) return false;
  const a = rows[left] ?? 0;
  const b = rows[left + 1] ?? 0;
  return y > Math.min(a, b) && y < Math.max(a, b);
}

function traceFrame(grid: GridSize, rows: ColumnRows): Frame {
  const baseline = baselineRow(grid.rows);
  return createFrame(
    grid,
    (x, y) => rows[x] === y || isRunCell(rows, baseline, x - 1, x, y) || isRunCell(rows, baseline, x, x, y),
  );
}

function penRows(current: ColumnRows, previous: ColumnRows, pen: number): (number | null)[] {
  const cols = current.length;
  const erased = new Set(Array.from({ length: ERASE_AHEAD }, (_, k) => (pen + k + 1) % cols));
  return current.map((row, x) => {
    if (erased.has(x)) return null;
    return x <= pen ? row : previous[x];
  });
}

function sweepFrames(grid: GridSize, current: ColumnRows, previous: ColumnRows, pens: number): Frame[] {
  return Array.from({ length: pens }, (_, pen) => traceFrame(grid, penRows(current, previous, pen)));
}

function sweepsOutput(grid: GridSize, sweeps: readonly Sweep[], before: ColumnRows): RecipeOutput {
  return joinOutputs(
    sweeps.map(({ rows, ms }, index) => {
      const frames = sweepFrames(grid, rows, index === 0 ? before : sweeps[index - 1].rows, grid.cols);
      return { frames, durations: evenDurations(frames.length, ms) };
    }),
  );
}

function loopOutput(grid: GridSize, sweeps: readonly Sweep[]): RecipeOutput {
  return sweepsOutput(grid, sweeps, sweeps[sweeps.length - 1].rows);
}

/** A monitor pen draws a heartbeat exactly one grid wide and erases two columns ahead of itself. */
export const generateEcg: RecipeFn = (grid) => loopOutput(grid, [{ rows: beatRows(grid), ms: PEN_MS }]);

/** The heartbeat trace at half speed. */
export const generateEcgSlow: RecipeFn = (grid) => loopOutput(grid, [{ rows: beatRows(grid), ms: SLOW_MS }]);

/** The heartbeat trace with every other beat flat. */
export const generateEcgSkip: RecipeFn = (grid) =>
  loopOutput(grid, [
    { rows: beatRows(grid), ms: PEN_MS },
    { rows: flatRows(grid), ms: PEN_MS },
  ]);

interface Spike {
  start: number;
  drop: number;
}

function irregularSpikes(cols: number, next: () => number): Spike[] {
  return Array.from({ length: cols }).reduce<{ spikes: Spike[]; x: number }>(
    ({ spikes, x }) => {
      if (x + TINY_BEAT.length > cols) return { spikes, x };
      const spike = { start: x, drop: Math.floor(next() * (IRREGULAR_MAX_DROP + 1)) };
      const gap = 1 + Math.floor(next() * IRREGULAR_MAX_GAP);
      return { spikes: [...spikes, spike], x: x + TINY_BEAT.length + gap };
    },
    { spikes: [], x: Math.floor(next() * IRREGULAR_MAX_GAP) },
  ).spikes;
}

function irregularRows(grid: GridSize, spikes: readonly Spike[]): number[] {
  const flat = baselineRow(grid.rows);
  return Array.from({ length: grid.cols }, (_, x) => {
    const spike = spikes.find(({ start }) => x >= start && x < start + TINY_BEAT.length);
    if (spike === undefined) return flat;
    const offset = TINY_BEAT[x - spike.start];
    return offset === SPIKE ? Math.min(flat - 1, spike.drop) : toRow(grid.rows, offset);
  });
}

/** Irregular close spikes over three seeded sweeps. */
export const generateEcgIrregular: RecipeFn = (grid, params) => {
  const next = createRng(params.seed ?? IRREGULAR_SEED);
  const sweeps = Array.from({ length: IRREGULAR_SWEEPS }, () => ({
    rows: irregularRows(grid, irregularSpikes(grid.cols, next)),
    ms: PEN_MS,
  }));
  return loopOutput(grid, sweeps);
};

function tickSweepRows(grid: GridSize, tick: ColumnRows): (number | null)[] {
  const first = tick.findIndex((row) => row !== null);
  return tick.map((row, x) => (x < first ? baselineRow(grid.rows) : row));
}

function lastLitColumn(rows: ColumnRows): number {
  return rows.reduce<number>((last, row, x) => (row === null ? last : x), 0);
}

/** Three beats, each faster; the last trace rises into the check, stops there and the rest of the trace clears. */
export const generateEcgRise: RecipeFn = (grid) => {
  const beat = beatRows(grid);
  const mask = glyphMask('check', grid);
  const tick = columnRowsOfMask(mask, grid);
  const final = tickSweepRows(grid, tick);
  const stop = lastLitColumn(tick);
  const approach = sweepFrames(grid, final, beat, stop + 1);
  const lastMs = RISE_MS[RISE_MS.length - 1];
  const cleared = traceFrame(
    grid,
    final.map((row, x) => (x <= stop ? row : null)),
  );
  return joinOutputs([
    sweepsOutput(
      grid,
      RISE_MS.map((ms) => ({ rows: beat, ms })),
      beat,
    ),
    { frames: approach, durations: approach.map((_, index) => (index === stop ? STOP_HOLD_MS : lastMs)) },
    { frames: [cleared, [...mask]], durations: [CLEAR_MS, RESULT_HOLD_MS] },
  ]);
};

/** The pen keeps sweeping but draws a flat line over the beat, then holds it. */
export const generateEcgFlat: RecipeFn = (grid) => {
  const flat = flatRows(grid);
  const sweeps = Array.from({ length: FLAT_SWEEPS }, () => ({ rows: flat, ms: PEN_MS }));
  return joinOutputs([
    sweepsOutput(grid, sweeps, beatRows(grid)),
    { frames: [traceFrame(grid, flat)], durations: [RESULT_HOLD_MS] },
  ]);
};
