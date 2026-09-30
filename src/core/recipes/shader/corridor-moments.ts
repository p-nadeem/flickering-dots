import { GRID_MIN } from '../../constants';
import type { Frame, GridSize } from '../../types';
import { generateCheck } from '../check';
import { createBlankFrame } from '../helpers';
import type { RecipeOutput } from '../helpers';
import { corridorGap, drawRings, getCorridorGeometry, ringAt, ringSteps } from './corridor-rings';
import type { CorridorGeometry } from './corridor-rings';
import { placeFrame, unionFrames } from './shared';

const LANDING_MS = [150, 220, 320] as const;
const TICK_INSET = 2;
const COLLAPSE_MS = 90;
const BLINK_MS = 250;
const BLINKS = 2;
const ERROR_HOLD_MS = 1000;
const LAST_RING = 1;

function centredRings(grid: GridSize, geometry: CorridorGeometry, steps: readonly number[]): Frame {
  return drawRings(
    grid,
    steps.map((step) => ringAt(geometry, step)),
  );
}

function framedTick(grid: GridSize, edge: Frame): RecipeOutput {
  const inner = { cols: grid.cols - 2 * TICK_INSET, rows: grid.rows - 2 * TICK_INSET };
  if (Math.min(inner.cols, inner.rows) < GRID_MIN) return generateCheck(grid);
  const tick = generateCheck(inner);
  return {
    frames: tick.frames.map((frame) =>
      unionFrames(grid, [edge, placeFrame(grid, frame, inner, TICK_INSET, TICK_INSET)]),
    ),
    durations: tick.durations,
  };
}

/** Three slowing ring steps with no new rings behind them that end on the edge ring, then the tick draws inside that frame and holds. */
export function generateCorridorLand(grid: GridSize): RecipeOutput {
  const geometry = getCorridorGeometry(grid);
  const gap = corridorGap(grid);
  const landing = LANDING_MS.map((_, index) => {
    const steps = ringSteps(geometry, geometry.span - LANDING_MS.length + 1 + index, gap);
    return centredRings(
      grid,
      geometry,
      steps.filter((step) => step >= index),
    );
  });
  const tick = framedTick(grid, centredRings(grid, geometry, [geometry.span]));
  return { frames: [...landing, ...tick.frames], durations: [...LANDING_MS, ...tick.durations] };
}

function collapseFrames(grid: GridSize, geometry: CorridorGeometry): Frame[] {
  const start = ringSteps(geometry, geometry.span, corridorGap(grid)).filter((step) => step <= geometry.span);
  return Array.from({ length: Math.max(1, geometry.span) }, (_, moved) =>
    centredRings(
      grid,
      geometry,
      start.map((step) => step - moved).filter((step) => step >= 0),
    ),
  );
}

/** The rings fall back into the centre with none following, then the last ring blinks twice and holds. */
export function generateCorridorReverse(grid: GridSize): RecipeOutput {
  const geometry = getCorridorGeometry(grid);
  const collapse = collapseFrames(grid, geometry);
  const ring = centredRings(grid, geometry, [LAST_RING]);
  const blink = Array.from({ length: BLINKS }, () => [createBlankFrame(grid), ring]).flat();
  return {
    frames: [...collapse, ...blink],
    durations: [
      ...collapse.map(() => COLLAPSE_MS),
      ...blink.map((_, index) => (index === blink.length - 1 ? ERROR_HOLD_MS : BLINK_MS)),
    ],
  };
}
