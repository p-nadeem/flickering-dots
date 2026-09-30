import { glyphMask } from '../../glyphs';
import type { Frame, GridSize } from '../../types';
import { createFrame } from '../helpers';
import { isLitAt } from './shared';

const CUT_MARGIN = 1;
const MIN_CUT = 3;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function litBox(grid: GridSize, frame: Frame): Box | undefined {
  const cells = frame.flatMap((bit, index) =>
    bit === 1 ? [{ x: index % grid.cols, y: Math.floor(index / grid.cols) }] : [],
  );
  if (cells.length === 0) return undefined;
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left + 1, height: Math.max(...ys) - top + 1 };
}

/** The blob with a tick cut out of its middle, or undefined when the blob is too small to hold one. */
export function cutCheck(grid: GridSize, blob: Frame): Frame | undefined {
  const box = litBox(grid, blob);
  if (box === undefined) return undefined;
  const size = Math.min(box.width, box.height) - 2 * CUT_MARGIN;
  if (size < MIN_CUT) return undefined;
  const square = { cols: size, rows: size };
  const mask = glyphMask('check', square);
  const left = box.left + Math.floor((box.width - size) / 2);
  const top = box.top + Math.floor((box.height - size) / 2);
  return createFrame(grid, (x, y) => isLitAt(blob, grid, x, y) && !isLitAt(mask, square, x - left, y - top));
}
