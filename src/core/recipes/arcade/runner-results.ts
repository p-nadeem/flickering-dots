import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import type { ArcadeStep } from './shared';
import { blinkSteps, stepsOutput } from './kit-b';
import {
  fallenPoints,
  groundPoints,
  planRunner,
  postPoints,
  runnerPoints,
  standWidth,
  stridePose,
} from './runner-scene';
import type { RunnerLayout } from './runner-scene';

const RUN_MS = 90;
const HOLD_MS = 1500;
const BLINK_MS = 250;
const BLINK_TIMES = 2;
const RUNNER_X = 1;
const FLAG_HEIGHT = 4;
const HIT_X = RUNNER_X + 2;
const CLOTH_SIZE = 2;

function scrollStep(layout: RunnerLayout, step: number, obstacle: readonly Point[]): ArcadeStep {
  return {
    points: [
      ...groundPoints(layout, step),
      ...obstacle,
      ...runnerPoints(layout, stridePose(step), RUNNER_X, 0),
    ],
    ms: RUN_MS,
  };
}

function crashPoints(layout: RunnerLayout, step: number): Point[] {
  return [
    ...groundPoints(layout, step),
    ...postPoints(layout, HIT_X, layout.postHeight),
    ...runnerPoints(layout, 'reach', RUNNER_X, 0),
  ];
}

/** A post scrolls in, the runner runs into it without jumping, blinks twice and falls flat in front of it. */
export function generateRunCrash(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = planRunner(grid);
  const steps = Math.max(0, grid.cols - 1 - HIT_X);
  const running = Array.from({ length: steps }, (_, step) =>
    scrollStep(layout, step, postPoints(layout, grid.cols - 1 - step, layout.postHeight)),
  );
  const crash = crashPoints(layout, steps);
  const fallen = [
    ...groundPoints(layout, steps),
    ...postPoints(layout, HIT_X, layout.postHeight),
    ...fallenPoints(layout, HIT_X - 1),
  ];
  return stepsOutput(grid, [
    ...running,
    { points: crash, ms: BLINK_MS },
    ...blinkSteps(crash, [], BLINK_MS, BLINK_TIMES),
    { points: fallen, ms: HOLD_MS },
  ]);
}

function flagPoints(layout: RunnerLayout, x: number, height: number): Point[] {
  const top = layout.feetY - height + 1;
  const cloth = Array.from({ length: CLOTH_SIZE * CLOTH_SIZE }, (_, index): Point => [
    x + 1 + (index % CLOTH_SIZE),
    top + Math.floor(index / CLOTH_SIZE),
  ]);
  return [...postPoints(layout, x, height), ...cloth];
}

/** A flag scrolls in and the scroll stops; the runner runs up to the pole and stands beside it. */
export function generateRunFinish(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = planRunner(grid);
  const flagHeight = Math.min(FLAG_HEIGHT, layout.feetY + 1);
  const width = standWidth(layout);
  const stopX = Math.max(RUNNER_X + width + 1, Math.floor(grid.cols / 2) - 1);
  const scrollSteps = grid.cols - stopX;
  const scrolling = Array.from({ length: scrollSteps }, (_, step) =>
    scrollStep(layout, step, flagPoints(layout, grid.cols - 1 - step, flagHeight)),
  );
  const flag = flagPoints(layout, stopX, flagHeight);
  const ground = groundPoints(layout, scrollSteps - 1);
  const finishX = stopX - 1 - width;
  const advance = Array.from({ length: Math.max(0, finishX - RUNNER_X) }, (_, index): ArcadeStep => ({
    points: [
      ...ground,
      ...flag,
      ...runnerPoints(layout, stridePose(scrollSteps + index), RUNNER_X + index + 1, 0),
    ],
    ms: RUN_MS,
  }));
  const stand = { points: [...ground, ...flag, ...runnerPoints(layout, 'stand', finishX, 0)], ms: HOLD_MS };
  return stepsOutput(grid, [...scrolling, ...advance, stand]);
}
