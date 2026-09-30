import type { Frame, GridSize, RecipeParams } from '../types';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const SEGMENT_GAP = 1;
const FULL_BAND_MAX_ROWS = 3;
const ODD_BAND = 3;
const EVEN_BAND = 4;
const TRACK_INSET = 2;
const MIN_TRACK = 1;
const BLINK_MAX_SEGMENTS = 8;
const BLINK_MS = 170;
const STEP_MS = 90;
const FULL_MS = 420;
const EMPTY_FLASH_MS = 140;
const EMPTY_REST_MS = 300;
const STILL_FILL_RATIO = 0.6;

interface Span {
  start: number;
  size: number;
}

interface FillLayout {
  count: number;
  width: number;
  gap: number;
  left: number;
  used: number;
  band: Span;
  track: Span;
}

interface FillStep {
  filled: number;
  ms: number;
}

function getSegmentCount(cols: number, length: number | undefined): number {
  const requested = Math.min(cols, Math.max(1, length || cols));
  return requested === cols ? cols : Math.min(requested, Math.floor((cols + 1) / 2));
}

function centreSpan(total: number, size: number): Span {
  return { start: Math.floor((total - size) / 2), size };
}

function getBandSize(rows: number): number {
  if (rows <= FULL_BAND_MAX_ROWS) return rows;
  return rows % 2 === 1 ? ODD_BAND : EVEN_BAND;
}

function getLayout({ cols, rows }: GridSize, length: number | undefined): FillLayout {
  const count = getSegmentCount(cols, length);
  const gap = count === cols ? 0 : SEGMENT_GAP;
  const width = gap === 0 ? 1 : Math.max(1, Math.floor((cols - (count - 1)) / count));
  const used = count * width + (count - 1) * gap;
  const bandSize = getBandSize(rows);
  const trackSize = Math.max(MIN_TRACK, bandSize - TRACK_INSET);
  return {
    count,
    width,
    gap,
    left: Math.floor((cols - used) / 2),
    used,
    band: centreSpan(rows, bandSize),
    track: centreSpan(rows, trackSize),
  };
}

function getSegment(layout: FillLayout, x: number): number {
  const offset = x - layout.left;
  const pitch = layout.width + layout.gap;
  if (offset < 0 || offset >= layout.used || offset % pitch >= layout.width) return -1;
  return Math.floor(offset / pitch);
}

function isInSpan({ start, size }: Span, y: number): boolean {
  return y >= start && y < start + size;
}

function drawFill(grid: GridSize, layout: FillLayout, filled: number): Frame {
  return createFrame(grid, (x, y) => {
    const segment = getSegment(layout, x);
    if (segment < 0) return false;
    return isInSpan(segment < filled ? layout.band : layout.track, y);
  });
}

function getProgress(count: number): FillStep[] {
  if (count > BLINK_MAX_SEGMENTS) {
    return Array.from({ length: count - 1 }, (_, index) => ({ filled: index + 1, ms: STEP_MS }));
  }
  const blinks = Array.from({ length: count }, (_, index): FillStep[] => [
    { filled: index + 1, ms: BLINK_MS },
    { filled: index, ms: BLINK_MS },
    { filled: index + 1, ms: BLINK_MS },
  ]).flat();
  return blinks.slice(0, -1);
}

function getSteps(count: number): FillStep[] {
  const ending: FillStep[] = [
    { filled: count, ms: FULL_MS },
    { filled: 0, ms: EMPTY_FLASH_MS },
    { filled: count, ms: FULL_MS },
    { filled: 0, ms: EMPTY_REST_MS },
  ];
  return [...getProgress(count), ...ending];
}

function getStillIndex(steps: readonly FillStep[], count: number): number {
  const target = Math.max(1, Math.round(count * STILL_FILL_RATIO));
  return steps.findIndex(({ filled }) => filled === target);
}

/** A thin track filling segment by segment into a thick bar, then flashing full; `length` sets the segment count. */
export function generateFill(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const layout = getLayout(grid, params.length);
  const steps = getSteps(layout.count);
  return {
    frames: steps.map(({ filled }) => drawFill(grid, layout, filled)),
    durations: steps.map(({ ms }) => ms),
    still: getStillIndex(steps, layout.count),
  };
}
