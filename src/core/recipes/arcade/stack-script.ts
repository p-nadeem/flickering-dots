import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { centreStart, spritePoints } from './shared';
import type { ArcadeStep, Sprite } from './shared';

/** A piece's resting place: its sprite and top-left corner. */
export interface Placement {
  sprite: Sprite;
  x: number;
  y: number;
}

/** The pieces that tile the rows to clear, in landing order, and those rows. */
export interface StackScript {
  placements: readonly Placement[];
  clearRows: readonly number[];
}

/** Falling pieces. */
export const PIECES = {
  j: ['#..', '###'],
  l: ['..#', '###'],
  i: ['####'],
  o: ['##', '##'],
  cap: ['###', '..#'],
  tallI: ['#', '#', '#', '#'],
  tallL: ['#.', '#.', '##'],
  hook: ['##', '.#', '.#'],
} as const satisfies Record<string, Sprite>;

/** Frame time of one falling step, in ms. */
export const FALL_MS = 70;
/** Frame time of a landing, in ms. */
export const LAND_MS = 160;

const WIDE_BLOCK = 6;
const MID_BLOCK = 4;
const NARROW_BLOCK = 2;
const STRIP_ROWS = 2;
const TALL_ROWS = 4;
const TALL_BLOCK = 3;

function blockPlacements(width: number, x: number, top: number): Placement[] {
  if (width === WIDE_BLOCK) {
    return [
      { sprite: PIECES.j, x, y: top },
      { sprite: PIECES.l, x: x + 3, y: top },
      { sprite: PIECES.i, x: x + 1, y: top },
    ];
  }
  if (width === MID_BLOCK) {
    return [
      { sprite: PIECES.j, x, y: top },
      { sprite: PIECES.cap, x: x + 1, y: top },
    ];
  }
  return [{ sprite: PIECES.o, x, y: top }];
}

function blockWidths(width: number): number[] {
  const wide = Math.floor(width / WIDE_BLOCK);
  const rest = width % WIDE_BLOCK;
  if (rest === 0) return Array.from({ length: wide }, () => WIDE_BLOCK);
  if (rest === MID_BLOCK) return [...Array.from({ length: wide }, () => WIDE_BLOCK), MID_BLOCK];
  if (wide === 0) return [NARROW_BLOCK];
  return [MID_BLOCK, ...Array.from({ length: wide - 1 }, () => WIDE_BLOCK), MID_BLOCK];
}

function stripPlacements(width: number, left: number, top: number): Placement[] {
  const widths = blockWidths(width);
  return widths.flatMap((blockWidth, index) => {
    const x = left + widths.slice(0, index).reduce((sum, used) => sum + used, 0);
    return blockPlacements(blockWidth, x, top);
  });
}

function tallBlock(top: number): Placement[] {
  return [
    { sprite: PIECES.tallI, x: 0, y: top },
    { sprite: PIECES.tallL, x: 1, y: top + 1 },
    { sprite: PIECES.hook, x: 1, y: top },
  ];
}

function rowsFrom(top: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => top + index);
}

/** Pieces that fill the bottom 2 rows on an even width, or the bottom 4 on an odd one. */
export function getStackScript({ cols, rows }: GridSize): StackScript {
  if (cols % 2 === 0) {
    return {
      placements: stripPlacements(cols, 0, rows - STRIP_ROWS),
      clearRows: rowsFrom(rows - STRIP_ROWS, STRIP_ROWS),
    };
  }
  const top = rows - TALL_ROWS;
  const rest = cols - TALL_BLOCK;
  return {
    placements: [
      ...stripPlacements(rest, TALL_BLOCK, rows - STRIP_ROWS),
      ...tallBlock(top),
      ...stripPlacements(rest, TALL_BLOCK, top),
    ],
    clearRows: rowsFrom(top, TALL_ROWS),
  };
}

/** Cells of a placed piece. */
export function placementPoints({ sprite, x, y }: Placement): Point[] {
  return spritePoints(sprite, x, y);
}

function moveToward(from: number, to: number, steps: number): number {
  return from + Math.sign(to - from) * Math.min(steps, Math.abs(to - from));
}

/** A piece falling from the top row onto its placement, sliding 1 column per step from the centre while above the stack, then landing. */
export function dropSteps(grid: GridSize, stack: readonly Point[], placement: Placement): ArcadeStep[] {
  const { sprite, x, y } = placement;
  const stackTop = Math.min(grid.rows, ...stack.map(([, row]) => row));
  const slide = Math.max(0, Math.min(y - 1, stackTop - sprite.length));
  const centred = centreStart(grid.cols, sprite[0].length);
  const start = moveToward(x, centred, slide);
  return Array.from({ length: y + 1 }, (_, step) => ({
    points: [...stack, ...spritePoints(sprite, moveToward(start, x, step), step)],
    ms: step === y ? LAND_MS : FALL_MS,
  }));
}

/** Drops every piece in order, returning the scenes and the finished stack. */
export function playPlacements(
  grid: GridSize,
  base: readonly Point[],
  placements: readonly Placement[],
): { steps: ArcadeStep[]; stack: Point[] } {
  return placements.reduce<{ steps: ArcadeStep[]; stack: Point[] }>(
    ({ steps, stack }, placement) => ({
      steps: [...steps, ...dropSteps(grid, stack, placement)],
      stack: [...stack, ...placementPoints(placement)],
    }),
    { steps: [], stack: [...base] },
  );
}
