import { glyphMask } from '../../glyphs';
import type { GridSize } from '../../types';
import { getPerimeterPoints } from '../helpers';
import type { Point, RecipeFn, RecipeOutput } from '../helpers';
import { getHuntCycle } from './hunt-cycle';
import { centreStart, defineVariant, shiftPoints, stepsToOutput } from './shared';
import type { ArcadeStep } from './shared';
import { framePoints } from './kit-b';

interface Hunt {
  cycle: readonly Point[];
  longest: number;
  meals: readonly number[];
}

const HUNT_MIN: GridSize = { cols: 4, rows: 4 };
const START_LENGTH = 3;
const LONGEST_CAP = 12;
const CELLS_PER_DOT = 3;
const SHRINK_FRAMES = 3;
const STEP_MS = 80;
const FOOD_BLINK_MS = 800;
const COIL_MS = 200;
const EVEN_RING = 2;
const ODD_RING = 3;
const WAIT_BLINK_MS = 400;
const FILL_MS = 30;
const FILL_FRAMES_TARGET = 64;
const FILL_HOLD_MS = 500;
const DRAIN_HOLD_MS = 1500;
const CRASH_LENGTH = 8;
const CRASH_GAP = 5;
const CRASH_MIN_GAP = 3;
const CRASH_LEAD_MOVES = 3;
const CRASH_BLINK_MS = 250;
const CRASH_HOLD_MS = 1500;

function getHunt(grid: GridSize): Hunt {
  const cycle = getHuntCycle(grid);
  const longest = Math.min(LONGEST_CAP, Math.floor((grid.cols * grid.rows) / CELLS_PER_DOT));
  const count = longest - START_LENGTH;
  const usable = cycle.length - SHRINK_FRAMES;
  const meals = Array.from({ length: count }, (_, index) => Math.round(((index + 1) * usable) / (count + 1)));
  return { cycle, longest, meals };
}

function body(hunt: Hunt, head: number, length: number): Point[] {
  const size = hunt.cycle.length;
  return Array.from({ length }, (_, index) => hunt.cycle[(((head - index) % size) + size) % size]);
}

function shrinkStepAt(hunt: Hunt, step: number): number {
  return step - (hunt.cycle.length - SHRINK_FRAMES);
}

function lengthAt(hunt: Hunt, step: number): number {
  const shrinkStep = shrinkStepAt(hunt, step);
  if (shrinkStep > 0) {
    return hunt.longest - Math.round((shrinkStep * (hunt.longest - START_LENGTH)) / SHRINK_FRAMES);
  }
  return START_LENGTH + hunt.meals.filter((meal) => meal <= step).length;
}

function isFoodOn(cycleLength: number, step: number): boolean {
  const blinks = Math.max(1, Math.round((cycleLength * STEP_MS) / FOOD_BLINK_MS));
  return Math.floor((step * 4 * blinks + cycleLength) / (2 * cycleLength)) % 2 === 0;
}

function foodAt(hunt: Hunt, step: number): Point[] {
  const { meals, cycle } = hunt;
  if (meals.length === 0) return [];
  const next = meals.findIndex((meal) => meal > step);
  const target = meals[next === -1 ? 0 : next];
  return isFoodOn(cycle.length, step) ? [cycle[target]] : [];
}

function huntThinking(grid: GridSize): RecipeOutput {
  const hunt = getHunt(grid);
  const steps = hunt.cycle.map((_, step): ArcadeStep => {
    return { points: [...body(hunt, step, lengthAt(hunt, step)), ...foodAt(hunt, step)], ms: STEP_MS };
  });
  return stepsToOutput(grid, steps);
}

function huntWait(grid: GridSize): RecipeOutput {
  const hunt = getHunt(grid);
  const snake = body(hunt, 0, START_LENGTH);
  const food = hunt.meals.length > 0 ? [hunt.cycle[hunt.meals[0]]] : [];
  return stepsToOutput(grid, [
    { points: [...snake, ...food], ms: WAIT_BLINK_MS },
    { points: snake, ms: WAIT_BLINK_MS },
  ]);
}

function huntCoil({ cols, rows }: GridSize): RecipeOutput {
  const ring = { cols: cols % 2 === 0 ? EVEN_RING : ODD_RING, rows: rows % 2 === 0 ? EVEN_RING : ODD_RING };
  const loop = shiftPoints(
    getPerimeterPoints(ring),
    centreStart(cols, ring.cols),
    centreStart(rows, ring.rows),
  );
  const steps = loop.map((_, head) => ({
    points: Array.from(
      { length: START_LENGTH },
      (__, index) => loop[(head - index + loop.length) % loop.length],
    ),
    ms: COIL_MS,
  }));
  return stepsToOutput({ cols, rows }, steps);
}

function fillOrder(grid: GridSize, cycle: readonly Point[]): Point[] {
  const corner: Point = [grid.cols - 1, grid.rows - 1];
  const isMissingCorner = cycle.length < grid.cols * grid.rows;
  const lastIndex = isMissingCorner
    ? cycle.findIndex(([x, y]) => x === corner[0] && y === corner[1] - 1)
    : cycle.length - START_LENGTH;
  const start = (lastIndex + 1) % cycle.length;
  const rotated = [...cycle.slice(start), ...cycle.slice(0, start)];
  return isMissingCorner ? [...rotated, corner] : rotated;
}

function countsBy(from: number, to: number, stride: number): number[] {
  const count = Math.ceil((to - from) / stride);
  return Array.from({ length: count + 1 }, (_, index) => Math.min(to, from + index * stride));
}

function huntFill(grid: GridSize): RecipeOutput {
  const order = fillOrder(grid, getHuntCycle(grid));
  const stride = Math.ceil(order.length / FILL_FRAMES_TARGET);
  const fill = countsBy(START_LENGTH, order.length, stride).map((count, index, all) => ({
    points: order.slice(0, count),
    ms: index === all.length - 1 ? FILL_HOLD_MS : FILL_MS,
  }));
  const tick = new Set(framePoints(glyphMask('check', grid), grid.cols).map(([x, y]) => y * grid.cols + x));
  const isTick = ([x, y]: Point): boolean => tick.has(y * grid.cols + x);
  const drain = countsBy(0, order.length, stride)
    .slice(1)
    .map((gone, index, all) => ({
      points: [...order.slice(0, gone).filter(isTick), ...order.slice(gone)],
      ms: index === all.length - 1 ? DRAIN_HOLD_MS : FILL_MS,
    }));
  return stepsToOutput(grid, [...fill, ...drain]);
}

const NEIGHBOURS: readonly Point[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function isSameCell(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function crashesWithGap(hunt: Hunt, length: number, gap: number): { head: number; hit: Point }[] {
  const { cycle } = hunt;
  const first = length - 1 + CRASH_LEAD_MOVES;
  const heads = Array.from({ length: Math.max(0, cycle.length - first) }, (_, index) => first + index);
  return heads.flatMap((head) => {
    const [x, y] = cycle[head];
    const hit = NEIGHBOURS.map(([dx, dy]): Point => [x + dx, y + dy]).find((cell) => {
      const at = cycle.findIndex((point) => isSameCell(point, cell));
      return at >= head - length + 2 && head - at >= gap;
    });
    return hit ? [{ head, hit }] : [];
  });
}

function findCrash(hunt: Hunt, length: number): { head: number; hit: Point } {
  const widest = Math.min(CRASH_GAP, length - 2);
  const gaps = Array.from({ length: Math.max(0, widest - CRASH_MIN_GAP + 1) }, (_, index) => widest - index);
  const crash = gaps.map((gap) => crashesWithGap(hunt, length, gap)[0]).find((found) => found !== undefined);
  if (crash === undefined) {
    throw new Error('flickering-dots build: arcade variant "hunt-crash" found no turn into the body');
  }
  return crash;
}

function huntCrash(grid: GridSize): RecipeOutput {
  const hunt = getHunt(grid);
  const length = Math.min(CRASH_LENGTH, hunt.longest);
  const { head, hit } = findCrash(hunt, length);
  const moves = Array.from({ length: head - length + 2 }, (_, index) => ({
    points: body(hunt, length - 1 + index, length),
    ms: STEP_MS,
  }));
  const tailFirst = [...body(hunt, head, length - 1)].reverse().filter((cell) => !isSameCell(cell, hit));
  const crashed = [...tailFirst, hit];
  const blink = [crashed, [], crashed, [], crashed].map((points, index, all) => ({
    points,
    ms: index === all.length - 1 ? CRASH_HOLD_MS : CRASH_BLINK_MS,
  }));
  return stepsToOutput(grid, [...moves, ...blink]);
}

/** Hungry Snake: a snake that follows a closed path to its food, grows and shrinks back. */
export const HUNT_VARIANTS: Readonly<Record<string, RecipeFn>> = {
  hunt: defineVariant('hunt', HUNT_MIN, huntThinking, true),
  'hunt-coil': defineVariant('hunt-coil', HUNT_MIN, huntCoil, true),
  'hunt-wait': defineVariant('hunt-wait', HUNT_MIN, huntWait, true),
  'hunt-fill': defineVariant('hunt-fill', HUNT_MIN, huntFill, false),
  'hunt-crash': defineVariant('hunt-crash', HUNT_MIN, huntCrash, false),
};
