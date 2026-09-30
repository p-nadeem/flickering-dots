import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import type { Point } from '../helpers';
import { centreStart } from './shared';
import { DICE_FACES, squashedPoints } from './dice-faces';
import type { DiceFace, RollingDie } from './dice-faces';

const IN_PLACE_ROLLS = 4;

interface Roll {
  pivot: number;
  direction: number;
  from: DiceFace;
  to: DiceFace;
}

/** Faces a tumbling die shows: one is left out because its lone pip looks the same at every squash. */
export const TUMBLING_FACES: readonly DiceFace[] = DICE_FACES.filter((face) => face !== 'one');

/** Limits on a seeded face sequence: the faces to pick from and the neighbours it must differ from. */
export interface FaceRules {
  pool?: readonly DiceFace[];
  before?: DiceFace;
  after?: DiceFace;
}

/** A face sequence from `seed` with no face twice in a row, differing from `before` at the start and `after` at the end. */
export function seededFaces(
  seed: number,
  count: number,
  { pool = DICE_FACES, before, after }: FaceRules = {},
): DiceFace[] {
  const random = createRng(seed);
  return Array.from({ length: count }).reduce<DiceFace[]>((faces, _, index) => {
    const banned = [
      index === 0 ? before : faces[index - 1],
      index === count - 1 ? (after ?? faces[0]) : undefined,
    ];
    const choices = pool.filter((face) => !banned.includes(face));
    return [...faces, choices[Math.floor(random() * choices.length)]];
  }, []);
}

function acrossCount(grid: GridSize, { style, isRolling }: RollingDie): number {
  return isRolling && style.size > 1 ? Math.floor((grid.cols - style.size) / (style.size - 1)) : 0;
}

/** Rolls in one loop: there and back when the die rolls across, else `inPlace` spins. */
export function rollsPerLoop(grid: GridSize, die: RollingDie, inPlace = IN_PLACE_ROLLS): number {
  const across = acrossCount(grid, die);
  return across > 0 ? 2 * across : inPlace;
}

function planRolls(grid: GridSize, die: RollingDie, faces: readonly DiceFace[]): Roll[] {
  const { style } = die;
  const across = acrossCount(grid, die);
  const cyclic = [...faces.slice(1), faces[0]];
  const step = style.size - 1;
  const span = style.size + across * step;
  const left = centreStart(grid.cols, span);
  return faces.map((from, index) => {
    const isRight = index < across;
    const moved = isRight ? index : 2 * across - index;
    const edge = left + moved * step;
    if (across === 0) return { pivot: centreStart(grid.cols, 1), direction: 0, from, to: cyclic[index] };
    return { pivot: isRight ? edge + step : edge, direction: isRight ? 1 : -1, from, to: cyclic[index] };
  });
}

function faceLeft(roll: Roll, width: number, isLeaving: boolean): number {
  if (roll.direction === 0) return roll.pivot - (width - 1) / 2;
  const isOnLeft = roll.direction > 0 === isLeaving;
  return isOnLeft ? roll.pivot - width + 1 : roll.pivot;
}

function restTop(grid: GridSize, size: number): number {
  return grid.rows > size ? centreStart(grid.rows, size + 1) + 1 : centreStart(grid.rows, size);
}

/** The frames of a die rolling over its edge one column per frame, back and forth, showing `faces` in turn. */
export function rollFrames(grid: GridSize, die: RollingDie, faces: readonly DiceFace[]): Point[][] {
  const { style } = die;
  const middle = (style.size - 1) / 2;
  const top = restTop(grid, style.size);
  const lift = grid.rows > style.size ? 1 : 0;
  return planRolls(grid, die, faces).flatMap((roll) =>
    Array.from({ length: Math.max(1, style.size - 1) }, (_, step) => {
      const width = Math.abs(style.size - 1 - 2 * step) + 1;
      const isLeaving = step < middle;
      const face = isLeaving ? roll.from : roll.to;
      const y = step === middle ? top - lift : top;
      return squashedPoints(style, face, width, faceLeft(roll, width, isLeaving), y);
    }),
  );
}
