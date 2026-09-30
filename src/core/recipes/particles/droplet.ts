import type { GridSize } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { getMiddleColumn, getRowPoints, stepsToOutput } from './steps';
import type { ParticlesBuilder, Step } from './steps';

const FRAME_MS = 50;
const STRETCH_MS = 150;
const FORM_MS = 600;
const STILL_MS = 400;
const HOLD_MS = 1500;
const MISS_MS = 300;
const DROP_TOP = 1;
const SURFACE_FROM_BOTTOM = 2;
const FALL_FRAMES_PER_ROW = 2;
const WIDE_TAP_COLS = 5;
const FALL_GRAVITY = 0.175;
const STREAK_SPEED = 1.5;
const SPLASH_SPEED_X = 0.6;
const SPLASH_SPEED_Y = 1.2;
const SPLASH_GRAVITY = 0.35;
const DESIGN_SIDE = 9;
const WAVE_IMPULSE = 2;
const WAVE_DAMPING = 0.85;
const WAVE_SPEED_SQUARED = 0.5;
const WAVE_VISIBLE = 0.5;
const MAX_WAVE_FRAMES = 16;

interface Scene {
  grid: GridSize;
  x: number;
  surface: number;
  tap: Point[];
}

function createScene(grid: GridSize): Scene {
  const x = getMiddleColumn(grid);
  const reach = grid.cols >= WIDE_TAP_COLS ? 1 : 0;
  return { grid, x, surface: grid.rows - SURFACE_FROM_BOTTOM, tap: getRowPoints(0, x - reach, x + reach) };
}

function surfacePoints({ grid, surface }: Scene): Point[] {
  return getRowPoints(surface, 0, grid.cols - 1);
}

function stretchSteps(scene: Scene, base: readonly Point[]): Step[] {
  const { x } = scene;
  return [
    { points: [...base, [x, DROP_TOP]], ms: STRETCH_MS },
    { points: [...base, [x, DROP_TOP], [x, DROP_TOP + 1]], ms: STRETCH_MS },
  ];
}

function dropHeight(scene: Scene, frame: number): number {
  return DROP_TOP + ((FALL_GRAVITY * scene.grid.rows) / DESIGN_SIDE) * frame * frame;
}

function fallSteps(scene: Scene, base: readonly Point[], floor: number): Step[] {
  const frames = Array.from(
    { length: scene.grid.rows * FALL_FRAMES_PER_ROW },
    (_, index) => index + 1,
  ).filter(
    (frame) =>
      Math.round(dropHeight(scene, frame)) > DROP_TOP && Math.round(dropHeight(scene, frame)) < floor,
  );
  return frames.map((frame): Step => {
    const y = dropHeight(scene, frame);
    const isStreak = y - dropHeight(scene, frame - 1) > STREAK_SPEED;
    const drop: Point[] = isStreak
      ? [
          [scene.x, y],
          [scene.x, y - 1],
        ]
      : [[scene.x, y]];
    return { points: [...base, ...drop], ms: FRAME_MS };
  });
}

function stepWave(current: readonly number[], previous: readonly number[]): number[] {
  return current.map((height, index) => {
    const curve = (current[index - 1] ?? 0) - 2 * height + (current[index + 1] ?? 0);
    return (2 * height - previous[index] + WAVE_SPEED_SQUARED * curve) * WAVE_DAMPING;
  });
}

function waveHistory(scene: Scene): number[][] {
  const flat = Array.from({ length: scene.grid.cols }, () => 0);
  const struck = flat.map((_, index) => (index === scene.x ? -WAVE_IMPULSE : 0));
  return Array.from({ length: MAX_WAVE_FRAMES })
    .reduce<number[][]>(
      (history) => [...history, stepWave(history[history.length - 1], history[history.length - 2])],
      [flat, struck],
    )
    .slice(1);
}

function waveSurface(scene: Scene, heights: readonly number[]): Point[] {
  return heights.map((height, index): Point => {
    if (height < -WAVE_VISIBLE) return [index, scene.surface + 1];
    return height > WAVE_VISIBLE ? [index, scene.surface - 1] : [index, scene.surface];
  });
}

function splashPoints(scene: Scene, age: number): Point[] {
  const scaleX = scene.grid.cols / DESIGN_SIDE;
  const scaleY = scene.grid.rows / DESIGN_SIDE;
  const y = scene.surface - SPLASH_SPEED_Y * scaleY * age + (SPLASH_GRAVITY * scaleY * age * age) / 2;
  if (age === 0 || Math.round(y) >= scene.surface) return [];
  return [-1, 1].map((side): Point => [scene.x + side * SPLASH_SPEED_X * scaleX * age, y]);
}

function isCalm(heights: readonly number[]): boolean {
  return heights.every((height) => Math.abs(height) <= WAVE_VISIBLE);
}

function impactSteps(scene: Scene): Step[] {
  const history = waveHistory(scene);
  const settled = history.findIndex(
    (heights, age) => age > 0 && isCalm(heights) && splashPoints(scene, age).length === 0,
  );
  const lastMoving = (settled === -1 ? history.length : settled) - 1;
  const gap = surfacePoints(scene).filter(([x]) => x !== scene.x);
  const moving = history.slice(1, lastMoving + 1).map((heights, index): Step => ({
    points: [...scene.tap, ...waveSurface(scene, heights), ...splashPoints(scene, index + 1)],
    ms: FRAME_MS,
  }));
  return [{ points: [...scene.tap, ...gap], ms: FRAME_MS }, ...moving];
}

function generateDrip(grid: GridSize): RecipeOutput {
  const scene = createScene(grid);
  const still = [...scene.tap, ...surfacePoints(scene)];
  return stepsToOutput(grid, [
    ...stretchSteps(scene, still),
    ...fallSteps(scene, still, scene.surface),
    ...impactSteps(scene),
    { points: still, ms: STILL_MS },
  ]);
}

function generateForm(grid: GridSize): RecipeOutput {
  const scene = createScene(grid);
  const still = [...scene.tap, ...surfacePoints(scene)];
  return stepsToOutput(
    grid,
    stretchSteps(scene, still).map((step) => ({ ...step, ms: FORM_MS })),
  );
}

function generateFill(grid: GridSize): RecipeOutput {
  const scene = createScene(grid);
  const still = [...scene.tap, ...surfacePoints(scene)];
  const risen = [...still, ...getRowPoints(scene.surface - 1, 0, grid.cols - 1)];
  const [impact] = impactSteps(scene);
  return stepsToOutput(grid, [
    ...stretchSteps(scene, still),
    ...fallSteps(scene, still, scene.surface),
    impact,
    { points: risen, ms: HOLD_MS },
  ]);
}

function generateMiss(grid: GridSize): RecipeOutput {
  const scene = createScene(grid);
  return stepsToOutput(grid, [
    ...stretchSteps(scene, scene.tap),
    ...fallSteps(scene, scene.tap, grid.rows),
    { points: scene.tap, ms: MISS_MS },
  ]);
}

/** Droplet variants: the drip loop, the drop forming at the tap, the fill that raises the surface and the miss. */
export const DROPLET_BUILDERS: Readonly<
  Record<'drip' | 'drip-form' | 'drip-fill' | 'drip-miss', ParticlesBuilder>
> = {
  drip: generateDrip,
  'drip-form': generateForm,
  'drip-fill': generateFill,
  'drip-miss': generateMiss,
};
