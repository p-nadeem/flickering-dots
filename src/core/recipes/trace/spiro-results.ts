import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints, mergeRepeatedFrames } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { SPIRO_SEED, drawFrames, rosette } from './spiro';

const COMPLETE_DRAW_MS = 600;
const MIN_DOT_MS = 20;
const MAX_DOT_MS = 45;
const COMPLETE_SHOW_MS = 240;
const PULSE_MS = 120;
const HOLD_MS = 1500;
const CRUMBLE_START_SHARE = 2 / 3;
const CRUMBLE_START_MS = 200;
const SKIP_STEPS = 3;
const SKIP_MS = 45;
const CRUMBLE_MS = 30;
const SKIP_DIRECTIONS: readonly Point[] = [
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
  [1, 0],
  [-1, 0],
  [0, -1],
  [0, 1],
];

/** The rosette completes quickly, pulses once (off for one 120 ms frame) and holds. */
export function generateSpiroComplete(grid: GridSize): RecipeOutput {
  const { order } = rosette(grid);
  const dotMs = Math.min(MAX_DOT_MS, Math.max(MIN_DOT_MS, Math.round(COMPLETE_DRAW_MS / order.length)));
  const drawn = drawFrames(grid, order);
  const full = createFrameFromPoints(grid, order);
  return {
    frames: [...drawn, createFrameFromPoints(grid, []), full],
    durations: [
      ...drawn.map((_, index) => (index === drawn.length - 1 ? COMPLETE_SHOW_MS : dotMs)),
      PULSE_MS,
      HOLD_MS,
    ],
  };
}

function stepsFrom(last: Point, [dx, dy]: Point): Point[] {
  return Array.from({ length: SKIP_STEPS }, (_, step): Point => [
    last[0] + dx * (step + 1),
    last[1] + dy * (step + 1),
  ]);
}

function skipCells(grid: GridSize, figure: readonly Point[], last: Point): Point[] {
  const onFigure = new Set(figure.map(([x, y]) => `${x},${y}`));
  const isClear = ([x, y]: Point): boolean =>
    x >= 0 && y >= 0 && x < grid.cols && y < grid.rows && !onFigure.has(`${x},${y}`);
  const scored = SKIP_DIRECTIONS.map((direction) => {
    const steps = stepsFrom(last, direction);
    const clear = steps.findIndex((cell) => !isClear(cell));
    return { steps, reach: clear < 0 ? steps.length : clear };
  });
  const best = scored.reduce((top, option) => (option.reach > top.reach ? option : top));
  return best.steps.slice(0, best.reach);
}

function shuffled(cells: readonly Point[], seed: number): Point[] {
  const random = createRng(seed);
  const keys = cells.map(() => random());
  return cells
    .map((cell, index) => ({ cell, key: keys[index] }))
    .sort((a, b) => a.key - b.key)
    .map(({ cell }) => cell);
}

/** The pen skips off the curve, then the drawn dots drop out in seeded random order at 30 ms and the grid holds empty. */
export function generateSpiroCrumble(grid: GridSize, params: RecipeParams): RecipeOutput {
  const { order } = rosette(grid);
  const drawn = order.slice(0, Math.max(1, Math.round(order.length * CRUMBLE_START_SHARE)));
  const skipping = skipCells(grid, order, drawn[drawn.length - 1]).map((pen) =>
    createFrameFromPoints(grid, [...drawn, pen]),
  );
  const dropOrder = shuffled(drawn, params.seed ?? SPIRO_SEED);
  const crumbling = dropOrder.map((_, index) => {
    const gone = new Set(dropOrder.slice(0, index + 1).map(([x, y]) => `${x},${y}`));
    return createFrameFromPoints(
      grid,
      drawn.filter(([x, y]) => !gone.has(`${x},${y}`)),
    );
  });
  return mergeRepeatedFrames({
    frames: [createFrameFromPoints(grid, drawn), ...skipping, ...crumbling],
    durations: [
      CRUMBLE_START_MS,
      ...skipping.map(() => SKIP_MS),
      ...crumbling.map((_, index) => (index === crumbling.length - 1 ? HOLD_MS : CRUMBLE_MS)),
    ],
  });
}
