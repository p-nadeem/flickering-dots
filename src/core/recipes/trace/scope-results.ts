import type { GridSize, RecipeParams } from '../../types';
import { generateCheck } from '../check';
import { createFrameFromPoints, getCentre } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { KNOT_SPEC, lissajousPath } from './lissajous';
import { centreBlock, cometCells, snapPoint } from './path';

const COLLAPSE_SCALES = [1, 0.75, 0.5, 0.25] as const;
const COLLAPSE_MS = 60;
const CENTRE_MS = 200;
const CHECK_DOT_MS = 40;
const SWEEP_MS = 40;
const HOLD_MS = 1500;
const BLIP_HEIGHT = 2;

function scaleCells(grid: GridSize, cells: readonly Point[], scale: number): Point[] {
  const centre = getCentre(grid);
  return cells.map(([x, y]) => snapPoint(centre, [(x - centre.cx) * scale, (y - centre.cy) * scale]));
}

/** The thinking comet shrinks into the centre over 4 frames, then the check draws on one dot at a time and holds. */
export function generateCollapse(grid: GridSize, params: RecipeParams): RecipeOutput {
  const path = lissajousPath(grid, KNOT_SPEC);
  const comet = cometCells(path, 0, Math.min(params.trail ?? KNOT_SPEC.trail, path.length - 1));
  const shrinking = COLLAPSE_SCALES.map((scale) =>
    createFrameFromPoints(grid, scaleCells(grid, comet, scale)),
  );
  const drawn = generateCheck(grid).frames.slice(1);
  const frames = [...shrinking, createFrameFromPoints(grid, centreBlock(grid)), ...drawn];
  const durations = [
    ...shrinking.map(() => COLLAPSE_MS),
    CENTRE_MS,
    ...drawn.map((_, index) => (index === drawn.length - 1 ? HOLD_MS : CHECK_DOT_MS)),
  ];
  return { frames, durations };
}

function blipColumns({ cols }: GridSize): number[] {
  return cols % 2 === 1 ? [(cols - 1) / 2] : [cols / 2 - 1, cols / 2];
}

function flatlineCells(grid: GridSize): Point[] {
  const baseline = Math.floor(grid.rows / 2);
  const line = Array.from({ length: grid.cols }, (_, x): Point => [x, baseline]);
  const blip = blipColumns(grid).flatMap((x) =>
    Array.from({ length: BLIP_HEIGHT }, (_, step): Point => [x, baseline - step - 1]),
  );
  return [...line, ...blip];
}

/** The pen sweeps a flat line across the middle with one 2-row blip at the centre, then holds it. */
export function generateFlatline(grid: GridSize): RecipeOutput {
  const cells = flatlineCells(grid);
  const frames = Array.from({ length: grid.cols }, (_, pen) =>
    createFrameFromPoints(
      grid,
      cells.filter(([x]) => x <= pen),
    ),
  );
  return { frames, durations: frames.map((_, index) => (index === frames.length - 1 ? HOLD_MS : SWEEP_MS)) };
}
