import { glyphMask } from '../../glyphs';
import type { GridSize, RecipeParams } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { mergeOnce } from './clip-merge';
import type { Shot } from './clip-merge';
import { cradleLayout, endColumn, restPoints, swingFrame, swingShots } from './cradle-scene';
import type { CradleLayout, Side } from './cradle-scene';
import { RESULT_HOLD_MS } from './shared';

const REST_MS = 400;
const FLIGHT_MS = 70;

/** Cradle success: the swings shrink one cell at a time, alternating ends, to rest, then the check. */
export function generateCradleDamp(grid: GridSize, _params: RecipeParams): RecipeOutput {
  const layout = cradleLayout(grid);
  const swings = Array.from({ length: layout.reach }, (_, index) =>
    swingShots(grid, layout, index % 2 === 0 ? 1 : -1, layout.reach - index),
  ).flat();
  return mergeOnce([
    ...swings,
    { frame: swingFrame(grid, layout, 1, 0), ms: REST_MS },
    { frame: glyphMask('check', grid), ms: RESULT_HOLD_MS },
  ]);
}

function flightPath(grid: GridSize, layout: CradleLayout): Point[] {
  const side: Side = 1;
  const start = endColumn(layout, side);
  const steps = grid.cols - start - 1;
  return Array.from({ length: steps }, (_, index): Point => {
    const step = index + 1;
    const height =
      step <= layout.reach ? step : Math.max(layout.reach - (step - layout.reach - 1), -grid.rows);
    return [start + step, layout.row - height];
  }).filter(([, y]) => y < grid.rows);
}

/** Cradle error: after a clack the right ball flies out over the side and drops away, leaving four balls. */
export function generateCradleLost(grid: GridSize, _params: RecipeParams): RecipeOutput {
  const layout = cradleLayout(grid);
  const four = restPoints(layout, 1);
  const flight = flightPath(grid, layout).map((ball) => ({
    frame: createFrameFromPoints(grid, [...four, ball]),
    ms: FLIGHT_MS,
  }));
  const shots: Shot[] = [
    ...swingShots(grid, layout, -1, layout.reach),
    ...flight,
    { frame: createFrameFromPoints(grid, four), ms: RESULT_HOLD_MS },
  ];
  return mergeOnce(shots);
}
