import type { GridSize } from '../../types';

const SIDE_SPACE = 4;
const MIN_EYE = 1;
const MAX_EYE_WIDTH = 5;
const VERTICAL_SPACE = 2;
const MAX_EYE_HEIGHT_EVEN = 8;
const MAX_EYE_HEIGHT_ODD = 7;
const EVEN_GAP = 2;
const ODD_GAP = 3;
const MIN_GAP = 1;

/** Where the two eyes of the face sit on a grid: their size, both left edges and the shared top row. */
export interface FaceLayout extends GridSize {
  eyeWidth: number;
  eyeHeight: number;
  leftX: number;
  rightX: number;
  top: number;
}

/** Left edges of both eyes for one horizontal look. */
export interface EyeColumns {
  leftX: number;
  rightX: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function eyeHeightFor(rows: number): number {
  const cap = rows % 2 === 0 ? MAX_EYE_HEIGHT_EVEN : MAX_EYE_HEIGHT_ODD;
  return clamp(rows - VERTICAL_SPACE, MIN_EYE, cap);
}

function gapFor(spare: number): number {
  return Math.min(spare, spare % 2 === 0 ? EVEN_GAP : ODD_GAP);
}

/** Sizes and centres two mirrored eyes on the grid, with a row free above and below them. */
export function getFaceLayout({ cols, rows }: GridSize): FaceLayout {
  const eyeWidth = clamp(Math.floor((cols - SIDE_SPACE) / 2), MIN_EYE, MAX_EYE_WIDTH);
  const eyeHeight = eyeHeightFor(rows);
  const spare = cols - 2 * eyeWidth;
  const gap = gapFor(spare);
  const leftX = Math.floor((spare - gap) / 2);
  return {
    cols,
    rows,
    eyeWidth,
    eyeHeight,
    leftX,
    rightX: leftX + eyeWidth + gap,
    top: Math.floor((rows - eyeHeight) / 2),
  };
}

/** Shifts both eyes toward a look of `dx` columns: the leading eye stops at the edge, the trailing eye closes the gap to 1. */
export function lookPositions(layout: FaceLayout, dx: number): EyeColumns {
  const margin = layout.leftX;
  const gap = layout.rightX - layout.leftX - layout.eyeWidth;
  const reach = Math.abs(dx);
  const lead = Math.min(reach, margin);
  const trail = Math.min(reach, margin + gap - MIN_GAP);
  if (dx < 0) return { leftX: layout.leftX - lead, rightX: layout.rightX - trail };
  return { leftX: layout.leftX + trail, rightX: layout.rightX + lead };
}
