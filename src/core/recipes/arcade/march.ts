import type { GridSize } from '../../types';
import type { Point, RecipeFn, RecipeOutput } from '../helpers';
import { centreStart, defineVariant, spritePoints, stepsToOutput } from './shared';
import type { ArcadeStep, Sprite } from './shared';

interface Fleet {
  grid: GridSize;
  left: number;
  count: number;
  ranks: number;
  cannonX: number;
}

interface Formation {
  dx: number;
  dy: number;
  pose: number;
  missing: readonly number[];
}

const MARCH_MIN: GridSize = { cols: 9, rows: 6 };
const POSES: readonly Sprite[] = [
  ['###', '#.#'],
  ['###', '.#.'],
];
const CANNON: Sprite = ['.#.', '###'];
const BURST: Sprite = ['#.#', '.#.', '#.#'];
const PATH: readonly Point[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [1, 1],
  [0, 1],
];
const ALIEN_PITCH = 4;
const ALIEN_HEIGHT = 2;
const RANK_PITCH = 3;
const MAX_RANKS = 3;
const RANK_ROWS = 4;
const RANK_SPARE_ROWS = 3;
const TRAVEL = 2;
const CENTRED_DX = TRAVEL / 2;
const STEP_MS = 220;
const IDLE_MS = 600;
const SHOT_MS = 50;
const BURST_MS = 160;
const GONE_MS = 400;
const LIFT_HOLD_MS = 800;
const X_BLINK_MS = 250;
const X_HOLD_MS = 800;

function getFleet(grid: GridSize): Fleet {
  const count = Math.floor((grid.cols - 1) / ALIEN_PITCH);
  const left = centreStart(grid.cols, count * ALIEN_PITCH - 1 + TRAVEL);
  const ranks = Math.min(MAX_RANKS, Math.max(1, Math.floor((grid.rows - RANK_SPARE_ROWS) / RANK_ROWS)));
  const centres = Array.from({ length: count }, (_, index) => left + index * ALIEN_PITCH + 1);
  const middle = (grid.cols - 1) / 2;
  const cannonX = centres.reduce((best, x) => (Math.abs(x - middle) < Math.abs(best - middle) ? x : best));
  return { grid, left, count, ranks, cannonX };
}

function alienCorner(fleet: Fleet, index: number, formation: Formation): Point {
  const column = index % fleet.count;
  const rank = Math.floor(index / fleet.count);
  return [fleet.left + column * ALIEN_PITCH + formation.dx, rank * RANK_PITCH + formation.dy];
}

function aliens(fleet: Fleet, formation: Formation): Point[] {
  return Array.from({ length: fleet.count * fleet.ranks }, (_, index) => index)
    .filter((index) => !formation.missing.includes(index))
    .flatMap((index) =>
      spritePoints(POSES[formation.pose % POSES.length], ...alienCorner(fleet, index, formation)),
    );
}

function cannon(fleet: Fleet, lift = 0): Point[] {
  return spritePoints(CANNON, fleet.cannonX - 1, fleet.grid.rows - CANNON.length - lift);
}

function marchSteps(fleet: Fleet): ArcadeStep[] {
  return PATH.map(([dx, dy], index) => ({
    points: [...aliens(fleet, { dx, dy, pose: index, missing: [] }), ...cannon(fleet)],
    ms: STEP_MS,
  }));
}

function targetAlien(fleet: Fleet): number {
  const column = (fleet.cannonX - 1 - fleet.left) / ALIEN_PITCH;
  return (fleet.ranks - 1) * fleet.count + column;
}

function shotSteps(fleet: Fleet, formation: Formation, others: readonly Point[]): ArcadeStep[] {
  const target = targetAlien(fleet);
  const [x, y] = alienCorner(fleet, target, formation);
  const flying = fleet.grid.rows - CANNON.length - 1 - (y + ALIEN_HEIGHT) + 1;
  const scene = [...aliens(fleet, formation), ...others];
  const shots = Array.from({ length: flying }, (_, step) => ({
    points: [...scene, [fleet.cannonX, fleet.grid.rows - CANNON.length - 1 - step] as const],
    ms: SHOT_MS,
  }));
  const popped = { ...formation, missing: [...formation.missing, target] };
  const remaining = [...aliens(fleet, popped), ...others];
  return [
    ...shots,
    { points: [...remaining, ...spritePoints(BURST, x, y)], ms: BURST_MS },
    { points: remaining, ms: GONE_MS },
  ];
}

function marchThinking(grid: GridSize): RecipeOutput {
  return stepsToOutput(grid, marchSteps(getFleet(grid)));
}

function marchIdle(grid: GridSize): RecipeOutput {
  const fleet = getFleet(grid);
  return stepsToOutput(
    grid,
    POSES.map((_, pose) => ({
      points: [...aliens(fleet, { dx: CENTRED_DX, dy: 0, pose, missing: [] }), ...cannon(fleet)],
      ms: IDLE_MS,
    })),
  );
}

function marchShoot(grid: GridSize): RecipeOutput {
  const fleet = getFleet(grid);
  const [dx, dy] = PATH[PATH.length - 1];
  const last = { dx, dy, pose: PATH.length - 1, missing: [] };
  return stepsToOutput(grid, [...marchSteps(fleet), ...shotSteps(fleet, last, cannon(fleet))]);
}

function marchClear(grid: GridSize): RecipeOutput {
  const fleet = getFleet(grid);
  const [dx, dy] = PATH[PATH.length - 1];
  const target = targetAlien(fleet);
  const others = Array.from({ length: fleet.count * fleet.ranks }, (_, index) => index).filter(
    (i) => i !== target,
  );
  const alone = POSES.map((_, pose) => ({
    points: [...aliens(fleet, { dx, dy, pose, missing: others }), ...cannon(fleet)],
    ms: STEP_MS,
  }));
  const shot = shotSteps(fleet, { dx, dy, pose: POSES.length - 1, missing: others }, cannon(fleet));
  return stepsToOutput(grid, [...alone, ...shot, { points: cannon(fleet, 1), ms: LIFT_HOLD_MS }]);
}

function marchInvaded(grid: GridSize): RecipeOutput {
  const fleet = getFleet(grid);
  const bottom = (fleet.ranks - 1) * RANK_PITCH + ALIEN_HEIGHT - 1;
  const landing = grid.rows - BURST.length - 1;
  const descent = Array.from({ length: landing - bottom + 1 }, (_, dy) => ({
    points: [...aliens(fleet, { dx: CENTRED_DX, dy, pose: dy, missing: [] }), ...cannon(fleet)],
    ms: STEP_MS,
  }));
  const invaders = aliens(fleet, {
    dx: CENTRED_DX,
    dy: landing - bottom,
    pose: landing - bottom,
    missing: [],
  });
  const wreck = [...invaders, ...spritePoints(BURST, fleet.cannonX - 1, grid.rows - BURST.length)];
  const blink = [wreck, invaders, wreck, invaders, wreck].map((points, index, all) => ({
    points,
    ms: index === all.length - 1 ? X_HOLD_MS : X_BLINK_MS,
  }));
  return stepsToOutput(grid, [...descent, ...blink]);
}

/** Alien March: a formation that steps and wiggles while a cannon waits below. */
export const MARCH_VARIANTS: Readonly<Record<string, RecipeFn>> = {
  march: defineVariant('march', MARCH_MIN, marchThinking, true),
  'march-idle': defineVariant('march-idle', MARCH_MIN, marchIdle, true),
  'march-shoot': defineVariant('march-shoot', MARCH_MIN, marchShoot, true),
  'march-clear': defineVariant('march-clear', MARCH_MIN, marchClear, false),
  'march-invaded': defineVariant('march-invaded', MARCH_MIN, marchInvaded, false),
};
