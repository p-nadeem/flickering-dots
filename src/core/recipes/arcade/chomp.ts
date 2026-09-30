import type { GridSize } from '../../types';
import type { Point, RecipeFn, RecipeOutput } from '../helpers';
import { centreStart, defineVariant, spritePoints, stepsToOutput, wrapColumns } from './shared';
import type { ArcadeStep, Sprite } from './shared';

interface Mouth {
  open: Sprite;
  shut: Sprite;
  size: number;
  top: number;
  middle: number;
}

const CHOMP_MIN: GridSize = { cols: 9, rows: 3 };
const BIG_MIN_ROWS = 5;
const BIG: Pick<Mouth, 'open' | 'shut'> = {
  open: ['.###.', '##...', '#....', '##...', '.###.'],
  shut: ['.###.', '#####', '#####', '#####', '.###.'],
};
const SMALL: Pick<Mouth, 'open' | 'shut'> = {
  open: ['###', '#..', '###'],
  shut: ['###', '###', '###'],
};
const COLLAPSE: readonly Sprite[] = [['###', '###', '###'], ['#']];
const CHASER: Sprite = ['#.#', '.#.', '#.#'];
const STEPS_PER_POSE = 2;
const STEP_MS = 120;
const REST_SHUT_MS = 1260;
const REST_OPEN_MS = 240;
const FRONTIER_MS = 200;
const EAT_MS = 200;
const DONE_APPROACH_STEPS = 2;
const HOP_MS = 160;
const DONE_HOLD_MS = 800;
const COLLAPSE_MS = 90;
const CAUGHT_HOLD_MS = 800;

function getMouth({ rows }: GridSize): Mouth {
  const shapes = rows >= BIG_MIN_ROWS ? BIG : SMALL;
  const size = shapes.open.length;
  const top = centreStart(rows, size);
  return { ...shapes, size, top, middle: top + Math.floor(size / 2) };
}

function pelletColumns(cols: number, from: number): number[] {
  return Array.from({ length: cols }, (_, x) => x).filter((x) => x % 2 === 0 && x >= from);
}

function mouthAt(mouth: Mouth, sprite: Sprite, left: number, cols: number, lift = 0): Point[] {
  return wrapColumns(spritePoints(sprite, left, mouth.top - lift), cols);
}

function pelletsAhead(mouth: Mouth, cols: number, left: number): Point[] {
  return pelletColumns(cols, left + mouth.size).map((x): Point => [x, mouth.middle]);
}

function poseAt(mouth: Mouth, step: number): Sprite {
  return Math.floor(step / STEPS_PER_POSE) % 2 === 0 ? mouth.open : mouth.shut;
}

function chompThinking(grid: GridSize): RecipeOutput {
  const mouth = getMouth(grid);
  const steps = Array.from({ length: grid.cols }, (_, left): ArcadeStep => ({
    points: [
      ...pelletsAhead(mouth, grid.cols, left),
      ...mouthAt(mouth, poseAt(mouth, left), left, grid.cols),
    ],
    ms: STEP_MS,
  }));
  return stepsToOutput(grid, steps);
}

function chompRest(grid: GridSize): RecipeOutput {
  const mouth = getMouth(grid);
  const pellets = pelletsAhead(mouth, grid.cols, 0);
  return stepsToOutput(grid, [
    { points: [...pellets, ...mouthAt(mouth, mouth.shut, 0, grid.cols)], ms: REST_SHUT_MS },
    { points: [...pellets, ...mouthAt(mouth, mouth.open, 0, grid.cols)], ms: REST_OPEN_MS },
  ]);
}

function progressLap(grid: GridSize, mouth: Mouth): ArcadeStep[] {
  const frontiers = pelletColumns(grid.cols, mouth.size).map((x) => x - mouth.size + 1);
  return Array.from({ length: grid.cols }, (_, left): ArcadeStep[] => {
    const pellets = pelletsAhead(mouth, grid.cols, left);
    const open = [...pellets, ...mouthAt(mouth, mouth.open, left, grid.cols)];
    if (!frontiers.includes(left)) return [{ points: open, ms: STEP_MS }];
    return [
      { points: [...pellets, ...mouthAt(mouth, mouth.shut, left, grid.cols)], ms: FRONTIER_MS },
      { points: open, ms: FRONTIER_MS },
    ];
  }).flat();
}

function chompProgress(grid: GridSize): RecipeOutput {
  return stepsToOutput(grid, progressLap(grid, getMouth(grid)));
}

function chompDone(grid: GridSize): RecipeOutput {
  const mouth = getMouth(grid);
  const pellets = pelletColumns(grid.cols, mouth.size);
  const end = pellets[pellets.length - 1] - mouth.size + 1;
  const approach = Array.from(
    { length: DONE_APPROACH_STEPS },
    (_, index) => end - DONE_APPROACH_STEPS + index,
  ).map((left) => ({
    points: [...pelletsAhead(mouth, grid.cols, left), ...mouthAt(mouth, mouth.open, left, grid.cols)],
    ms: STEP_MS,
  }));
  return stepsToOutput(grid, [
    ...approach,
    { points: mouthAt(mouth, mouth.shut, end, grid.cols), ms: EAT_MS },
    { points: mouthAt(mouth, mouth.shut, end, grid.cols, 1), ms: HOP_MS },
    { points: mouthAt(mouth, mouth.shut, end, grid.cols), ms: DONE_HOLD_MS },
  ]);
}

function chompCaught(grid: GridSize): RecipeOutput {
  const mouth = getMouth(grid);
  const left = centreStart(grid.cols, mouth.size + CHASER[0].length);
  const stop = left + mouth.size;
  const chaserAt = (x: number): Point[] => spritePoints(CHASER, x, mouth.middle - 1);
  const approach = Array.from({ length: grid.cols - stop }, (_, step): ArcadeStep => ({
    points: [...mouthAt(mouth, poseAt(mouth, step), left, grid.cols), ...chaserAt(grid.cols - 1 - step)],
    ms: STEP_MS,
  }));
  const shrinking = [mouth.shut, ...COLLAPSE.filter((sprite) => sprite.length < mouth.size)];
  const collapse = shrinking.map((sprite): ArcadeStep => {
    const inset = (mouth.size - sprite.length) / 2;
    return {
      points: [...spritePoints(sprite, left + inset, mouth.top + inset), ...chaserAt(stop)],
      ms: COLLAPSE_MS,
    };
  });
  return stepsToOutput(grid, [...approach, ...collapse, { points: chaserAt(stop), ms: CAUGHT_HOLD_MS }]);
}

/** Chomper: a round mouth eating a row of pellets and wrapping round like a maze tunnel. */
export const CHOMP_VARIANTS: Readonly<Record<string, RecipeFn>> = {
  chomp: defineVariant('chomp', CHOMP_MIN, chompThinking, true),
  'chomp-rest': defineVariant('chomp-rest', CHOMP_MIN, chompRest, true),
  'chomp-progress': defineVariant('chomp-progress', CHOMP_MIN, chompProgress, true),
  'chomp-done': defineVariant('chomp-done', CHOMP_MIN, chompDone, false),
  'chomp-caught': defineVariant('chomp-caught', CHOMP_MIN, chompCaught, false),
};
