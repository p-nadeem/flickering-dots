import type { GridSize, RecipeParams } from '../../types';
import type { RecipeFn, RecipeOutput } from '../helpers';
import { generateBricks, generateBricksRest } from './bricks';
import { generateBricksProgress } from './bricks-progress';
import { generateBricksClear, generateBricksMiss } from './bricks-results';
import { generateCorner, generateCornerDrift, generateCornerWait } from './corner';
import { generateCornerHit, generateCornerNear } from './corner-results';
import { generateDice, generateDiceRest, generateDiceSample } from './dice';
import { defineVariantB } from './kit-b';
import { generateReels, generateReelsRest, generateReelsStagger } from './reels';
import { generateReelsLose, generateReelsWin } from './reels-results';
import { generateRun, generateRunEmpty, generateRunStand } from './runner';
import { generateRunCrash, generateRunFinish } from './runner-results';

type Draw = (grid: GridSize, params: RecipeParams) => RecipeOutput;

/** Smallest grid each family of variants reads on. */
export const ARCADE_B_MIN_GRIDS = {
  bricks: { cols: 7, rows: 7 },
  run: { cols: 8, rows: 5 },
  corner: { cols: 8, rows: 6 },
  reels: { cols: 11, rows: 3 },
  dice: { cols: 3, rows: 3 },
} as const satisfies Record<string, GridSize>;

const LOOPS = () => true;
const ONCE = () => false;
const LOOPS_WITHOUT_GLYPH = (params: RecipeParams) => params.glyph === undefined;

function family(
  min: GridSize,
  entries: readonly (readonly [string, Draw, (params: RecipeParams) => boolean])[],
): Record<string, RecipeFn> {
  return Object.fromEntries(
    entries.map(([id, draw, isLoop]) => [id, defineVariantB(id, { min, draw, isLoop })]),
  );
}

/** The brick-wall, runner, corner-hit, reels and dice variants of the arcade recipe, by variant id. */
export const VARIANTS_B: Readonly<Record<string, RecipeFn>> = {
  ...family(ARCADE_B_MIN_GRIDS.bricks, [
    ['bricks', generateBricks, LOOPS],
    ['bricks-rest', generateBricksRest, LOOPS],
    ['bricks-progress', generateBricksProgress, LOOPS],
    ['bricks-clear', generateBricksClear, ONCE],
    ['bricks-miss', generateBricksMiss, ONCE],
  ]),
  ...family(ARCADE_B_MIN_GRIDS.run, [
    ['run', generateRun, LOOPS],
    ['run-stand', generateRunStand, LOOPS],
    ['run-empty', generateRunEmpty, LOOPS],
    ['run-finish', generateRunFinish, ONCE],
    ['run-crash', generateRunCrash, ONCE],
  ]),
  ...family(ARCADE_B_MIN_GRIDS.corner, [
    ['corner', generateCorner, LOOPS],
    ['corner-drift', generateCornerDrift, LOOPS],
    ['corner-wait', generateCornerWait, LOOPS],
    ['corner-hit', generateCornerHit, ONCE],
    ['corner-near', generateCornerNear, ONCE],
  ]),
  ...family(ARCADE_B_MIN_GRIDS.reels, [
    ['reels', generateReels, LOOPS],
    ['reels-rest', generateReelsRest, LOOPS],
    ['reels-stagger', generateReelsStagger, LOOPS],
    ['reels-win', generateReelsWin, ONCE],
    ['reels-lose', generateReelsLose, ONCE],
  ]),
  ...family(ARCADE_B_MIN_GRIDS.dice, [
    ['dice', generateDice, LOOPS_WITHOUT_GLYPH],
    ['dice-rest', generateDiceRest, LOOPS],
    ['dice-sample', generateDiceSample, LOOPS],
  ]),
};
