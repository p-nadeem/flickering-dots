import type { GridSize, RecipeParams } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import type { ArcadeStep } from './shared';
import { stepsOutput } from './kit-b';
import {
  STRIDE_FRAMES,
  groundPoints,
  headPoint,
  jumpArc,
  planRunner,
  postPoints,
  runnerPoints,
  stridePose,
} from './runner-scene';
import { lcm } from './shared';
import type { RunnerLayout } from './runner-scene';

const RUN_MS = 90;
const HEAD_ON_MS = 1800;
const HEAD_OFF_MS = 200;
const RUNNER_X = 1;
const CLEAR_X = 2;
const MIN_POST_SPACING = 12;

function postSpacing(cols: number): number {
  return cols * Math.ceil(MIN_POST_SPACING / cols);
}

/** Frames in one running loop: posts at least 12 columns apart and whole leg cycles. */
export function runLoopFrames(cols: number, hasPosts: boolean): number {
  return lcm(hasPosts ? postSpacing(cols) : cols, 2 * STRIDE_FRAMES);
}

function postX(cols: number, step: number): number {
  return cols - 1 - (step % postSpacing(cols));
}

function jumpLift({ cols, jump }: RunnerLayout, step: number): number {
  const arc = jumpArc(jump);
  const spacing = postSpacing(cols);
  const jumpStart = cols - 1 - CLEAR_X - jump;
  const index = ((((step % spacing) - jumpStart) % spacing) + spacing) % spacing;
  return index < arc.length ? arc[index] : 0;
}

/** The cells of one running frame, kept apart so the post and the runner can be checked separately. */
export interface RunScene {
  ground: Point[];
  post: Point[];
  runner: Point[];
}

/** The ground, post and runner of frame `step` of the running loop. */
export function runScene(layout: RunnerLayout, step: number, hasPosts: boolean): RunScene {
  const lift = hasPosts ? jumpLift(layout, step) : 0;
  const pose = lift > 0 ? 'jump' : stridePose(step);
  return {
    ground: groundPoints(layout, step),
    post: hasPosts ? postPoints(layout, postX(layout.cols, step), layout.postHeight) : [],
    runner: runnerPoints(layout, pose, RUNNER_X, lift),
  };
}

function runStep(layout: RunnerLayout, step: number, hasPosts: boolean): ArcadeStep {
  const { ground, post, runner } = runScene(layout, step, hasPosts);
  return { points: [...ground, ...post, ...runner], ms: RUN_MS };
}

function runLoop(grid: GridSize, hasPosts: boolean): RecipeOutput {
  const layout = planRunner(grid);
  const steps = Array.from({ length: runLoopFrames(grid.cols, hasPosts) }, (_, step) =>
    runStep(layout, step, hasPosts),
  );
  return stepsOutput(grid, steps);
}

/** The runner hops a post every `cols` columns (at least 12) while the ground scrolls one column per 90 ms. */
export function generateRun(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  return runLoop(grid, true);
}

/** The runner running on an empty scrolling ground. */
export function generateRunEmpty(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  return runLoop(grid, false);
}

/** The runner standing on still ground, its head dot blinking every 2 s. */
export function generateRunStand(grid: GridSize, _params: RecipeParams = {}): RecipeOutput {
  const layout = planRunner(grid);
  const body = [...groundPoints(layout, 0), ...runnerPoints(layout, 'stand', RUNNER_X, 0)];
  const [headX, headY] = headPoint(layout, RUNNER_X);
  return stepsOutput(grid, [
    { points: body, ms: HEAD_ON_MS },
    { points: body.filter(([x, y]) => x !== headX || y !== headY), ms: HEAD_OFF_MS },
  ]);
}
