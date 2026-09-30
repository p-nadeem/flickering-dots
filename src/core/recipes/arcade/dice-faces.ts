import type { GridSize } from '../../types';
import type { Point } from '../helpers';

/** Dice face names the `dice` variant takes as `glyph`. */
export const DICE_FACES = ['one', 'two', 'three', 'four', 'five', 'six'] as const;

/** One of `DICE_FACES`. */
export type DiceFace = (typeof DICE_FACES)[number];

type LatticeCell = readonly [column: number, row: number];

const PIPS: Readonly<Record<DiceFace, readonly LatticeCell[]>> = {
  one: [[1, 1]],
  two: [
    [2, 0],
    [0, 2],
  ],
  three: [
    [2, 0],
    [1, 1],
    [0, 2],
  ],
  four: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  five: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  six: [
    [0, 0],
    [0, 1],
    [0, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

/** How a die of one size is drawn: its border, pip size and the three lattice starts. */
export interface DieStyle {
  size: number;
  hasBorder: boolean;
  pip: number;
  lattice: readonly [number, number, number];
}

const STYLES: readonly DieStyle[] = [
  { size: 3, hasBorder: false, pip: 1, lattice: [0, 1, 2] },
  { size: 5, hasBorder: false, pip: 1, lattice: [0, 2, 4] },
  { size: 9, hasBorder: true, pip: 1, lattice: [2, 4, 6] },
  { size: 11, hasBorder: true, pip: 1, lattice: [2, 5, 8] },
  { size: 12, hasBorder: true, pip: 2, lattice: [2, 5, 8] },
  { size: 14, hasBorder: true, pip: 2, lattice: [2, 6, 10] },
  { size: 15, hasBorder: true, pip: 3, lattice: [2, 6, 10] },
  { size: 16, hasBorder: true, pip: 2, lattice: [3, 7, 11] },
];

/** True when `name` is one of `DICE_FACES`. */
export function isDiceFace(name: string): name is DiceFace {
  return DICE_FACES.some((face) => face === name);
}

/** The largest die that fits `grid`, preferring one that centres exactly. */
export function restingStyle(grid: GridSize): DieStyle {
  const fitting = STYLES.filter(({ size }) => size <= Math.min(grid.cols, grid.rows));
  const centred = fitting.filter(({ size }) => (grid.cols - size) % 2 === 0 && (grid.rows - size) % 2 === 0);
  const pool = centred.length > 0 ? centred : fitting;
  return pool[pool.length - 1] ?? STYLES[0];
}

const MIN_ROLLING_SIZE = 5;

/** The tumbling die: the rolling size and whether it rolls across or spins in place. */
export interface RollingDie {
  style: DieStyle;
  isRolling: boolean;
}

function largestOdd(isFit: (size: number) => boolean): DieStyle | undefined {
  const fitting = STYLES.filter(({ size }) => size % 2 === 1 && isFit(size));
  return fitting[fitting.length - 1];
}

/** Rolls edge over edge when a die of 5 or more fits a whole roll, else spins the largest die in place. */
export function rollingDie(grid: GridSize): RollingDie {
  const rolling = largestOdd((size) => 2 * size - 1 <= grid.cols && size + 1 <= grid.rows);
  const spinning = largestOdd((size) => size <= grid.cols && size + 1 <= grid.rows);
  if (rolling && (rolling.size >= MIN_ROLLING_SIZE || rolling.size >= (spinning?.size ?? 0))) {
    return { style: rolling, isRolling: true };
  }
  return { style: spinning ?? STYLES[0], isRolling: false };
}

function borderCells(size: number): LatticeCell[] {
  return Array.from({ length: size * size }, (_, index): LatticeCell => [
    index % size,
    Math.floor(index / size),
  ]).filter(([x, y]) => x === 0 || y === 0 || x === size - 1 || y === size - 1);
}

function pipCells(style: DieStyle, face: DiceFace): LatticeCell[] {
  return PIPS[face].flatMap(([column, row]) =>
    Array.from({ length: style.pip * style.pip }, (_, index): LatticeCell => [
      style.lattice[column] + (index % style.pip),
      style.lattice[row] + Math.floor(index / style.pip),
    ]),
  );
}

/** The face's cells within its die, as die-local `[x, y]`. */
export function faceCells(style: DieStyle, face: DiceFace): LatticeCell[] {
  return [...(style.hasBorder ? borderCells(style.size) : []), ...pipCells(style, face)];
}

/** The face drawn with its top-left cell at `left`, `top`. */
export function facePoints(style: DieStyle, face: DiceFace, left: number, top: number): Point[] {
  return faceCells(style, face).map(([x, y]): Point => [left + x, top + y]);
}

function sourceColumn(x: number, width: number, size: number): number {
  if (width <= 1) return 0;
  const scale = (size - 1) / (width - 1);
  return x <= (width - 1) / 2 ? Math.round(x * scale) : size - 1 - Math.round((width - 1 - x) * scale);
}

/** The face squashed to `width` columns as it turns; at width 1 it is the die's edge, a full line. */
export function squashedPoints(
  style: DieStyle,
  face: DiceFace,
  width: number,
  left: number,
  top: number,
): Point[] {
  if (width <= 1) return Array.from({ length: style.size }, (_, y): Point => [left, top + y]);
  const lit = new Set(faceCells(style, face).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: width * style.size }, (_, index): Point => [
    index % width,
    Math.floor(index / width),
  ])
    .filter(([x, y]) => lit.has(`${sourceColumn(x, width, style.size)},${y}`))
    .map(([x, y]): Point => [left + x, top + y]);
}
