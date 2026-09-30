import type { GridSize, RecipeParams } from '../../types';
import { spaceBigChanges } from '../flash-spacing';
import type { Point, RecipeOutput } from '../helpers';
import type { ArcadeStep } from './shared';
import { stepsOutput } from './kit-b';
import { centreStart, shiftPoints } from './shared';
import { DICE_FACES, facePoints, isDiceFace, restingStyle, rollingDie } from './dice-faces';
import type { DiceFace } from './dice-faces';
import { TUMBLING_FACES, rollFrames, rollsPerLoop, seededFaces } from './dice-roll';

const ROLL_MS = 110;
const LANDING_MS = [60, 60, 80, 100, 140, 200, 300] as const;
const HOLD_MS = 1500;
const PIP_ON_MS = 1300;
const PIP_OFF_MS = 200;
const SHAKE_MS = 80;
const LANDED_MS = 250;
const REST_FACE: DiceFace = 'five';
const SHAKE_OFFSETS = [-1, 1, -1, 1] as const;
const SAMPLE_ROLL_MS = 110;
const SAMPLE_TUMBLE_MS = 600;
const SAMPLE_HOLD_MS = 1200;
const ROLL_SEED = 6;
const LANDING_SEED = 11;
const SAMPLE_SEED = 5;
const ERROR_FACE: DiceFace = 'one';
const TINY_DIE = 3;
const TINY_DIE_MIN_MS = 170;

function restingFace(grid: GridSize, face: DiceFace): Point[] {
  const style = restingStyle(grid);
  return facePoints(style, face, centreStart(grid.cols, style.size), centreStart(grid.rows, style.size));
}

function splitCentre(grid: GridSize, face: DiceFace): { frame: Point[]; pip: Point[] } {
  const style = restingStyle(grid);
  const points = restingFace(grid, face);
  const centre = restingFace(grid, 'one').slice(-style.pip * style.pip);
  const isCentre = (point: Point): boolean => centre.some(([x, y]) => x === point[0] && y === point[1]);
  return { frame: points.filter((point) => !isCentre(point)), pip: centre };
}

function landingSteps(grid: GridSize, target: DiceFace, seed: number): ArcadeStep[] {
  const pool = DICE_FACES.filter((face) => face !== target);
  const faces = seededFaces(seed, LANDING_MS.length, { pool, after: target });
  const floorMs = restingStyle(grid).size <= TINY_DIE ? TINY_DIE_MIN_MS : 0;
  return [
    ...faces.map((face, index): ArcadeStep => ({
      points: restingFace(grid, face),
      ms: Math.max(LANDING_MS[index], floorMs),
    })),
    { points: restingFace(grid, target), ms: HOLD_MS },
  ];
}

function shakeSteps(grid: GridSize): ArcadeStep[] {
  const { frame, pip } = splitCentre(grid, ERROR_FACE);
  return [
    { points: restingFace(grid, ERROR_FACE), ms: LANDED_MS },
    ...SHAKE_OFFSETS.map((dx): ArcadeStep => ({
      points: [...frame, ...shiftPoints(pip, dx, 0)],
      ms: SHAKE_MS,
    })),
    { points: restingFace(grid, ERROR_FACE), ms: HOLD_MS },
  ];
}

function spacedLoop(output: RecipeOutput): RecipeOutput {
  return { frames: output.frames, durations: spaceBigChanges(output.frames, output.durations, true) };
}

function assertFace(glyph: string): DiceFace {
  if (isDiceFace(glyph)) return glyph;
  throw new Error(
    `flickering-dots arcade: glyph "${glyph}" is not a dice face; use one of ${DICE_FACES.join(', ')}`,
  );
}

/** A die rolling edge over edge, changing face each roll; with a face as `glyph` it slows and lands on it. */
export function generateDice(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  if (params.glyph !== undefined) {
    const target = assertFace(params.glyph);
    const landing = landingSteps(grid, target, params.seed ?? LANDING_SEED);
    const steps = target === ERROR_FACE ? [...landing.slice(0, -1), ...shakeSteps(grid)] : landing;
    return stepsOutput(grid, steps);
  }
  const die = rollingDie(grid);
  const faces = seededFaces(params.seed ?? ROLL_SEED, rollsPerLoop(grid, die), { pool: TUMBLING_FACES });
  const frames = rollFrames(grid, die, faces);
  return spacedLoop(
    stepsOutput(
      grid,
      frames.map((points) => ({ points, ms: ROLL_MS })),
    ),
  );
}

/** Face five on the resting die, its centre pip blinking every 1500 ms, so face one stays the error. */
export function generateDiceRest(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const { frame, pip } = splitCentre(grid, REST_FACE);
  return stepsOutput(grid, [
    { points: [...frame, ...pip], ms: PIP_ON_MS },
    { points: frame, ms: PIP_OFF_MS },
  ]);
}

/** The die tumbles for about 600 ms, then lands on the face `seed` picks and holds. */
export function generateDiceSample(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const seed = params.seed ?? SAMPLE_SEED;
  const die = rollingDie(grid);
  const framesPerRoll = Math.max(1, die.style.size - 1);
  const spins = Math.max(2, Math.round(SAMPLE_TUMBLE_MS / (SAMPLE_ROLL_MS * framesPerRoll)));
  const [landed] = seededFaces(seed, 1);
  const rules = { pool: TUMBLING_FACES, before: landed, after: landed };
  const tumbling = seededFaces(seed + 1, rollsPerLoop(grid, die, spins) - 1, rules);
  const frames = rollFrames(grid, die, [landed, ...tumbling]);
  return spacedLoop(
    stepsOutput(
      grid,
      frames.map((points, index) => ({ points, ms: index === 0 ? SAMPLE_HOLD_MS : SAMPLE_ROLL_MS })),
    ),
  );
}
