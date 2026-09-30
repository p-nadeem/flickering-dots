import type { GridSize } from '../../types';
import type { Point, RecipeFn, RecipeOutput } from '../helpers';
import { centreStart, defineVariant, spritePoints, stepsToOutput } from './shared';
import type { ArcadeStep } from './shared';
import { checkSteps } from './kit-b';
import { PIECES, dropSteps, getStackScript, placementPoints, playPlacements } from './stack-script';

const STACK_MIN: GridSize = { cols: 4, rows: 6 };
const CLEAR_BLINK_MS = 200;
const CLEAR_EMPTY_MS = 300;
const REST_ON_MS = 900;
const REST_OFF_MS = 300;
const PROGRESS_STEP_MS = 300;
const PROGRESS_FULL_MS = 700;
const PROGRESS_EMPTY_MS = 400;
const WIPE_MS = 80;
const TOPOUT_FREEZE_MS = 300;
const TOPOUT_BLINK_MS = 250;
const TOPOUT_HOLD_MS = 600;
const TETRIS_ROWS = 4;
const HOLE_STRIDE = 2;
const TOPOUT_SPARE_ROWS = 4;

function withoutRows(points: readonly Point[], rows: readonly number[]): Point[] {
  return points.filter(([, y]) => !rows.includes(y));
}

function stackThinking(grid: GridSize): RecipeOutput {
  const { placements, clearRows } = getStackScript(grid);
  const { steps, stack } = playPlacements(grid, [], placements);
  const cleared = withoutRows(stack, clearRows);
  const clear: ArcadeStep[] = [
    { points: cleared, ms: CLEAR_BLINK_MS },
    { points: stack, ms: CLEAR_BLINK_MS },
    { points: cleared, ms: CLEAR_BLINK_MS },
    { points: stack, ms: CLEAR_BLINK_MS },
    { points: [], ms: CLEAR_EMPTY_MS },
  ];
  return stepsToOutput(grid, [...steps, ...clear]);
}

function stackRest(grid: GridSize): RecipeOutput {
  const { placements } = getStackScript(grid);
  const shown = placements.length > 1 ? placements.slice(0, -1) : placements;
  const settled = shown.slice(0, -1).flatMap(placementPoints);
  const top = placementPoints(shown[shown.length - 1]);
  return stepsToOutput(grid, [
    { points: [...settled, ...top], ms: REST_ON_MS },
    { points: settled, ms: REST_OFF_MS },
  ]);
}

function holedRow(cols: number, y: number, level: number): Point[] {
  const hole = (level * HOLE_STRIDE + 1) % cols;
  return Array.from({ length: cols }, (_, x): Point => [x, y]).filter(([x]) => x !== hole);
}

function holedStack({ cols, rows }: GridSize, height: number): Point[] {
  return Array.from({ length: height }, (_, level) => holedRow(cols, rows - 1 - level, level)).flat();
}

function stackProgress(grid: GridSize): RecipeOutput {
  const rising = Array.from({ length: grid.rows }, (_, index) => ({
    points: holedStack(grid, index + 1),
    ms: index === grid.rows - 1 ? PROGRESS_FULL_MS : PROGRESS_STEP_MS,
  }));
  const full = holedStack(grid, grid.rows);
  const wipe = Array.from({ length: grid.rows }, (_, row) => ({
    points: full.filter(([, y]) => y > row),
    ms: row === grid.rows - 1 ? PROGRESS_EMPTY_MS : WIPE_MS,
  }));
  return stepsToOutput(grid, [...rising, ...wipe]);
}

function wellStack({ cols, rows }: GridSize): Point[] {
  return Array.from({ length: TETRIS_ROWS * (cols - 1) }, (_, index): Point => [
    index % (cols - 1),
    rows - TETRIS_ROWS + Math.floor(index / (cols - 1)),
  ]);
}

function stackDone(grid: GridSize): RecipeOutput {
  const stack = wellStack(grid);
  const drop = dropSteps(grid, stack, { sprite: PIECES.tallI, x: grid.cols - 1, y: grid.rows - TETRIS_ROWS });
  const full = [...stack, ...spritePoints(PIECES.tallI, grid.cols - 1, grid.rows - TETRIS_ROWS)];
  const wipe = Array.from({ length: TETRIS_ROWS }, (_, index) => ({
    points: full.filter(([, y]) => y < grid.rows - 1 - index),
    ms: WIPE_MS,
  }));
  return stepsToOutput(grid, [...drop, ...wipe, ...checkSteps(grid)]);
}

function stackTopout(grid: GridSize): RecipeOutput {
  const base = holedStack(grid, grid.rows - TOPOUT_SPARE_ROWS);
  const x = centreStart(grid.cols, PIECES.o[0].length);
  const first = { sprite: PIECES.o, x, y: TOPOUT_SPARE_ROWS - PIECES.o.length };
  const { steps, stack } = playPlacements(grid, base, [first]);
  const frozen = [...stack, ...spritePoints(PIECES.o, x, 0)];
  const blink: ArcadeStep[] = [
    { points: frozen, ms: TOPOUT_FREEZE_MS },
    { points: [], ms: TOPOUT_BLINK_MS },
    { points: frozen, ms: TOPOUT_BLINK_MS },
    { points: [], ms: TOPOUT_BLINK_MS },
    { points: frozen, ms: TOPOUT_HOLD_MS },
  ];
  return stepsToOutput(grid, [...steps, ...blink]);
}

/** Stack and Clear: falling pieces that fill rows and blink them away. */
export const STACK_VARIANTS: Readonly<Record<string, RecipeFn>> = {
  stack: defineVariant('stack', STACK_MIN, stackThinking, true),
  'stack-rest': defineVariant('stack-rest', STACK_MIN, stackRest, true),
  'stack-progress': defineVariant('stack-progress', STACK_MIN, stackProgress, true),
  'stack-done': defineVariant('stack-done', STACK_MIN, stackDone, false),
  'stack-topout': defineVariant('stack-topout', STACK_MIN, stackTopout, false),
};
