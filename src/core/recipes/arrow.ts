import type { Frame, GridSize } from '../types';
import { createBlankFrame, createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const FRAME_MS = 80;
const PAUSE_MS = 200;
const MARGIN_MIN_ROWS = 5;
const MARGIN_ROWS = 2;
const SHAFT_BEHIND_HEAD = 2;

interface ArrowShape {
  reach: number;
  width: number;
  height: number;
  top: number;
}

function getArrowShape(grid: GridSize): ArrowShape {
  const room = grid.rows >= MARGIN_MIN_ROWS ? grid.rows - MARGIN_ROWS : grid.rows;
  const reach = Math.max(0, Math.min(Math.floor((room - 1) / 2), Math.floor((grid.cols - 1) / 2)));
  const height = 2 * reach + 1 + (grid.rows % 2 === 0 ? 1 : 0);
  const width = Math.max(2 * reach + 1, reach + 1 + SHAFT_BEHIND_HEAD);
  return { reach, width, height, top: (grid.rows - height) / 2 };
}

function isArrowCell(shape: ArrowShape, arrowX: number, arrowY: number): boolean {
  if (arrowX < 0 || arrowY < 0 || arrowX >= shape.width || arrowY >= shape.height) return false;
  const step = Math.floor(Math.abs(arrowY - (shape.height - 1) / 2));
  return step === 0 || (step <= shape.reach && arrowX === shape.width - 1 - step);
}

function createArrowFrame(grid: GridSize, shape: ArrowShape, offset: number): Frame {
  return createFrame(grid, (x, y) => isArrowCell(shape, x - offset, y - shape.top));
}

/** A right-pointing arrow that slides in from the left edge and out the right, then pauses blank. */
export function generateArrow(grid: GridSize): RecipeOutput {
  const shape = getArrowShape(grid);
  const slides = Array.from({ length: grid.cols + shape.width - 1 }, (_, index) =>
    createArrowFrame(grid, shape, index - shape.width + 1),
  );
  const frames = [...slides, createBlankFrame(grid)];
  return { frames, durations: [...slides.map(() => FRAME_MS), PAUSE_MS] };
}
