import type { Frame, GridSize, RecipeParams } from '../types';
import { createRng } from '../rng';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const FRAME_MS = 90;
const MIN_FRAMES = 8;
const GAP_MIN_COLS = 9;
const ENVELOPE_DROP = 0.45;
const MAX_MULTIPLIER = 2;
const TURN = Math.PI * 2;

/** Default params of the `bars` recipe. */
export const BARS_DEFAULTS = { frames: 12, seed: 4 } as const satisfies RecipeParams;

interface Bar {
  phase: number;
  multiplier: number;
  envelope: number;
}

interface BarsLayout {
  left: number;
  pitch: number;
  bars: Bar[];
  peak: number;
  isMirrored: boolean;
}

function createBars(count: number, seed: number): Bar[] {
  const random = createRng(seed);
  const centre = (count - 1) / 2;
  return Array.from({ length: count }, (_, index) => ({
    phase: random() * TURN,
    multiplier: 1 + Math.floor(random() * MAX_MULTIPLIER),
    envelope: 1 - (ENVELOPE_DROP * Math.abs(index - centre)) / Math.max(1, centre),
  }));
}

function getLayout({ cols, rows }: GridSize, seed: number): BarsLayout {
  const gap = cols >= GAP_MIN_COLS ? 1 : 0;
  const count = Math.floor((cols + gap) / (1 + gap));
  const used = count + (count - 1) * gap;
  const isMirrored = rows % 2 === 1;
  return {
    left: Math.floor((cols - used) / 2),
    pitch: 1 + gap,
    bars: createBars(count, seed),
    peak: isMirrored ? (rows - 1) / 2 : rows,
    isMirrored,
  };
}

function getLevel(layout: BarsLayout, bar: Bar, step: number, count: number): number {
  const amount = 0.5 + 0.5 * Math.sin((TURN * bar.multiplier * step) / count + bar.phase);
  const level = Math.round(layout.peak * bar.envelope * amount);
  return layout.isMirrored ? level : Math.max(1, level);
}

function drawStep(grid: GridSize, layout: BarsLayout, step: number, count: number): Frame {
  const levels = layout.bars.map((bar) => getLevel(layout, bar, step, count));
  const centre = (grid.rows - 1) / 2;
  return createFrame(grid, (x, y) => {
    const offset = x - layout.left;
    const index = offset / layout.pitch;
    if (offset < 0 || !Number.isInteger(index) || index >= levels.length) return false;
    return layout.isMirrored ? Math.abs(y - centre) <= levels[index] : y >= grid.rows - levels[index];
  });
}

/** Level-meter bars rising and falling in a seamless loop: mirrored about the centre row on odd rows, bottom-anchored on even rows. */
export function generateBars(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const count = Math.max(MIN_FRAMES, Math.round(params.frames || BARS_DEFAULTS.frames));
  const layout = getLayout(grid, params.seed ?? BARS_DEFAULTS.seed);
  const frames = Array.from({ length: count }, (_, step) => drawStep(grid, layout, step, count));
  return { frames, durations: frames.map(() => FRAME_MS) };
}
