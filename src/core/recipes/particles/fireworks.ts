import { createRng } from '../../rng';
import type { GridSize, RecipeParams } from '../../types';
import { generateCross } from '../cross';
import type { Point, RecipeOutput } from '../helpers';
import { bloomGlyph } from '../shader/bloom';
import { getMiddleColumn, joinOutputs, keyedRandom, stepsToOutput } from './steps';
import type { Step } from './steps';
import { playShells } from './shells';
import type { Shell } from './shells';

const RISE_MS = 50;
const FLASH_MS = 80;
const SPARK_MS = 70;
const DARK_MS = 300;
const EMBER_ON_MS = 900;
const EMBER_OFF_MS = 300;
const FIZZLE_MS = [100, 80] as const;
const STALL_MS = 250;
const DUD_FALL_MS = [90, 70] as const;
const DUD_GONE_MS = 200;
const DUD_CLIMB_ROWS = 2;
const APEX_SHARE = 0.38;
const TRAIL_GAP = 1;
const SPARK_FRAMES = 12;
const SPARKS_SMALL = 8;
const SPARKS_LARGE = 12;
const LARGE_COLS = 13;
const LARGE_ROOM = 5;
const RING_FRAMES = 2;
const RING_HOLD_MS = 600;
const SPEED_MIN = 0.95;
const SPEED_SPREAD = 0.15;
const LIFE_MIN = 7;
const LIFE_SPREAD = 4;
const TWINKLE_FRAMES = 3;
const TWINKLE_SKIP = 0.45;
const DRAG = 0.78;
const GRAVITY = 0.045;
const REACH_DIVISOR = 3.2;
const DESIGN_ROWS = 11;
const SHELL_SPREAD_MIN = 2;
const SHELL_SPREAD_DIVISOR = 4;
const SHELL_EDGE_GAP = 1;
const PLUS_OFFSETS: readonly Point[] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

interface Spark {
  angle: number;
  speed: number;
  life: number;
}

function getApex({ rows }: GridSize): number {
  return Math.round(APEX_SHARE * rows);
}

function riseSteps(grid: GridSize, x: number, top: number): Step[] {
  const count = grid.rows - top;
  return Array.from({ length: count }, (_, index): Step => {
    const y = grid.rows - 1 - index;
    return {
      points: [
        [x, y],
        [x, y + TRAIL_GAP],
      ],
      ms: RISE_MS,
    };
  });
}

function createSparks(grid: GridSize, room: number, seed: number): Spark[] {
  const random = createRng(seed);
  const count = grid.cols >= LARGE_COLS && room >= LARGE_ROOM ? SPARKS_LARGE : SPARKS_SMALL;
  return Array.from({ length: count }, (_, index) => {
    const mirror = (((count / 2 - 1 - index) % count) + count) % count;
    return {
      angle: (Math.PI * (2 * index + 1)) / count,
      speed: SPEED_MIN + SPEED_SPREAD * keyedRandom(seed, Math.min(index, mirror), 0),
      life: LIFE_MIN + Math.floor(LIFE_SPREAD * random()),
    };
  });
}

function isTwinkledOut(spark: Spark, index: number, t: number, seed: number): boolean {
  if (t > spark.life) return true;
  return t > spark.life - TWINKLE_FRAMES && keyedRandom(seed, index, t) < TWINKLE_SKIP;
}

function sparkSteps(grid: GridSize, [x, apex]: Point, seed: number, frames: number): Step[] {
  const room = Math.min(x, grid.cols - 1 - x, apex, grid.rows - 1 - apex);
  const reach = room / REACH_DIVISOR;
  const gravity = (GRAVITY * grid.rows) / DESIGN_ROWS;
  const sparks = createSparks(grid, room, seed);
  return Array.from({ length: frames }, (_, frame): Step => {
    const t = frame + 1;
    const spread = (reach * (1 - DRAG ** t)) / (1 - DRAG);
    const points = sparks.flatMap((spark, index): Point[] =>
      isTwinkledOut(spark, index, t, seed)
        ? []
        : [
            [
              x + Math.cos(spark.angle) * spark.speed * spread,
              apex + Math.sin(spark.angle) * spark.speed * spread + gravity * t * t,
            ],
          ],
    );
    return { points, ms: SPARK_MS };
  });
}

function plusAt([x, y]: Point, ms: number): Step {
  return { points: PLUS_OFFSETS.map(([dx, dy]): Point => [x + dx, y + dy]), ms };
}

function shellSteps(grid: GridSize, shell: Shell, sparkFrames = SPARK_FRAMES): Step[] {
  return [
    ...riseSteps(grid, shell.x, shell.apex),
    plusAt([shell.x, shell.apex], FLASH_MS),
    ...sparkSteps(grid, [shell.x, shell.apex], shell.seed, sparkFrames),
  ];
}

function singleBurst(grid: GridSize, shell: Shell): RecipeOutput {
  const steps = shellSteps(grid, shell, RING_FRAMES);
  const ring = steps[steps.length - 1];
  const held = [...steps.slice(0, -1), { ...ring, ms: RING_HOLD_MS }];
  const output = joinOutputs([stepsToOutput(grid, held), bloomGlyph(grid, 'sparkle', [shell.x, shell.apex])]);
  return { ...output, still: output.frames.length - 1 };
}

function getShells(grid: GridSize, count: number, seed: number): Shell[] {
  const middle = getMiddleColumn(grid);
  const spread = Math.max(SHELL_SPREAD_MIN, Math.round(grid.cols / SHELL_SPREAD_DIVISOR));
  return Array.from({ length: count }, (_, index) => {
    const isLeft = index % 2 === 1;
    const offset = (isLeft ? -1 : 1) * Math.ceil(index / 2) * spread;
    const x = Math.min(grid.cols - 1 - SHELL_EDGE_GAP, Math.max(SHELL_EDGE_GAP, middle + offset));
    return { x, apex: getApex(grid) + (isLeft ? 1 : 0), seed: seed + index };
  });
}

/** A rocket climbs, flashes a plus and bursts into a mirrored ring that holds and blooms into the sparkle; `length` shells are staggered, drooping and twinkling out. */
export function generateBurst(grid: GridSize, params: RecipeParams, seed: number): RecipeOutput {
  const shells = getShells(grid, Math.max(1, params.length ?? 1), seed);
  if (shells.length === 1) return singleBurst(grid, shells[0]);
  return playShells(
    grid,
    shells.map((shell) => shellSteps(grid, shell)),
    DARK_MS,
  );
}

/** One ember dot at the bottom middle that glows and blinks off. */
export function generateEmber(grid: GridSize): RecipeOutput {
  const ember: Point = [getMiddleColumn(grid), grid.rows - 1];
  return stepsToOutput(grid, [
    { points: [ember], ms: EMBER_ON_MS },
    { points: [], ms: EMBER_OFF_MS },
  ]);
}

/** The rocket climbs to the apex with its trail, pops a small plus, drops one spark and the sky stays dark. */
export function generateFuse(grid: GridSize): RecipeOutput {
  const x = getMiddleColumn(grid);
  const apex = getApex(grid);
  const [pop, drop] = FIZZLE_MS;
  return stepsToOutput(grid, [
    ...riseSteps(grid, x, apex),
    plusAt([x, apex], pop),
    { points: [[x, apex + 1]], ms: drop },
    { points: [], ms: DARK_MS },
  ]);
}

/** The rocket climbs two rows, stalls, falls back as two dots and the cross is drawn. */
export function generateDud(grid: GridSize): RecipeOutput {
  const x = getMiddleColumn(grid);
  const top = grid.rows - 1 - DUD_CLIMB_ROWS;
  const [first, second] = DUD_FALL_MS;
  const falling = stepsToOutput(grid, [
    ...riseSteps(grid, x, top),
    { points: [[x, top]], ms: STALL_MS },
    {
      points: [
        [x - 1, top + 1],
        [x + 1, top + 1],
      ],
      ms: first,
    },
    {
      points: [
        [x - 1, top + 2],
        [x + 1, top + 2],
      ],
      ms: second,
    },
    { points: [], ms: DUD_GONE_MS },
  ]);
  return joinOutputs([falling, generateCross(grid)]);
}
