import type { GridSize, RecipeParams } from '../types';
import { createRng } from '../rng';
import { createFrame } from './helpers';
import type { RecipeOutput } from './helpers';

const FRAME_MS = 75;
const FAST_SPEED = 1;
const SLOW_SPEED = 2;
const SLOW_CHANCE = 0.5;
const LOOP_CYCLES = SLOW_SPEED;
const BLANK_POSITIONS = 1;
const MIN_RUN = 2;
const MAX_RUN = 3;
const MAX_PASSING_ROWS = 1;
const MIN_PHASE_GAP = 1;

/** Default params of the `rain` recipe; `frames` defaults to one seamless loop of 2 * (rows + length + 1). */
export const RAIN_DEFAULTS = { seed: 7, length: 2, density: 1 } as const satisfies RecipeParams;

interface Drop {
  speed: number;
  phase: number;
  isActive: boolean;
}

interface Fall {
  rows: number;
  cycle: number;
  length: number;
}

type Track = readonly (readonly boolean[])[];

function isFalling(drop: Drop, fall: Fall, index: number, y: number): boolean {
  const head = Math.floor((index + drop.phase) / drop.speed) % fall.cycle;
  return y <= head && y > head - fall.length;
}

function getTrack(drop: Drop, fall: Fall): Track {
  return Array.from({ length: LOOP_CYCLES * fall.cycle }, (_, index) =>
    Array.from({ length: fall.rows }, (_, y) => isFalling(drop, fall, index, y)),
  );
}

function getPeakSharedRows(left: Track, right: Track): number {
  return Math.max(...left.map((rows, index) => rows.filter((isLit, y) => isLit && right[index][y]).length));
}

function getCircularDistance(a: number, b: number, span: number): number {
  const distance = Math.abs(a - b) % span;
  return Math.min(distance, span - distance);
}

function getOtherSpeed(speed: number): number {
  return FAST_SPEED + SLOW_SPEED - speed;
}

function buildSpeedRuns(cols: number, speed: number, random: () => number): number[] {
  if (cols <= 0) return [];
  const run = Math.min(cols, MIN_RUN + Math.floor(random() * (MAX_RUN - MIN_RUN + 1)));
  const rest = buildSpeedRuns(cols - run, getOtherSpeed(speed), random);
  return [...Array.from({ length: run }, () => speed), ...rest];
}

function pickSpeeds(cols: number, random: () => number): number[] {
  const speed = random() < SLOW_CHANCE ? SLOW_SPEED : FAST_SPEED;
  const edgeRun = 1 + Math.floor(random() * Math.max(1, Math.min(MAX_RUN, cols - 1)));
  const rest = buildSpeedRuns(cols - edgeRun, getOtherSpeed(speed), random);
  return [...Array.from({ length: edgeRun }, () => speed), ...rest];
}

type PhaseRule = (phase: number) => boolean;

interface PhaseRules {
  required: PhaseRule[];
  preferred: PhaseRule;
  shared: (phase: number) => number;
}

function isSameRows(left: readonly boolean[], right: readonly boolean[]): boolean {
  return left.some(Boolean) && left.every((isLit, y) => isLit === right[y]);
}

function countSharedFrames(left: Track, right: Track): number {
  return left.filter((rows, index) => rows.some((isLit, y) => isLit && right[index][y])).length;
}

function getNeighbourRules(speed: number, left: Drop | undefined, fall: Fall): PhaseRule[] {
  if (!left) return [() => true, () => true];
  const leftTrack = getTrack(left, fall);
  const trackOf = (phase: number) => getTrack({ speed, phase, isActive: true }, fall);
  const maxSharedRows = left.speed === speed ? 0 : MAX_PASSING_ROWS;
  const isUncrowded = (phase: number) => getPeakSharedRows(leftTrack, trackOf(phase)) <= maxSharedRows;
  const isNeverFlat = (phase: number) => {
    const track = trackOf(phase);
    return leftTrack.every((rows, index) => !isSameRows(rows, track[index]));
  };
  return [isUncrowded, isNeverFlat];
}

function getPhaseRules(speed: number, drops: readonly Drop[], fall: Fall): PhaseRules {
  const span = speed * fall.cycle;
  const peers = drops.filter((drop) => drop.speed === speed).map((drop) => drop.phase);
  const left = drops.at(-1);
  const isApart = (minGap: number) => (phase: number) =>
    peers.every((peer) => getCircularDistance(phase, peer, span) >= minGap);
  const shared = (phase: number) =>
    left ? countSharedFrames(getTrack(left, fall), getTrack({ speed, phase, isActive: true }, fall)) : 0;
  return {
    required: [isApart(MIN_PHASE_GAP), ...getNeighbourRules(speed, left, fall), isApart(speed)],
    preferred: isApart(speed * fall.length),
    shared,
  };
}

function keepPassing(phases: readonly number[], rules: readonly PhaseRule[]): number[] {
  return (
    rules
      .map((_, dropped) => rules.slice(0, rules.length - dropped))
      .map((kept) => phases.filter((phase) => kept.every((rule) => rule(phase))))
      .find((list) => list.length > 0) ?? [...phases]
  );
}

function pickPhase(speed: number, drops: readonly Drop[], fall: Fall, random: () => number): number {
  const rules = getPhaseRules(speed, drops, fall);
  const phases = Array.from({ length: speed * fall.cycle }, (_, phase) => phase);
  const passing = keepPassing(phases, rules.required);
  const scores = passing.map(rules.shared);
  const least = passing.filter((_, index) => scores[index] === Math.min(...scores));
  const spread = least.filter(rules.preferred);
  const candidates = spread.length > 0 ? spread : least;
  return candidates[Math.floor(random() * candidates.length)];
}

function createDrops(cols: number, fall: Fall, density: number, random: () => number): Drop[] {
  return pickSpeeds(cols, random).reduce<Drop[]>((drops, speed) => {
    const phase = pickPhase(speed, drops, fall, random);
    return [...drops, { speed, phase, isActive: random() < density }];
  }, []);
}

/** Streaks of `length` falling down every column (share set by `density`) at a seeded 1 or 2 frames per row. */
export function generateRain(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const random = createRng(params.seed ?? RAIN_DEFAULTS.seed);
  const length = params.length || RAIN_DEFAULTS.length;
  const fall: Fall = { rows: grid.rows, cycle: grid.rows + length + BLANK_POSITIONS, length };
  const count = params.frames || LOOP_CYCLES * fall.cycle;
  const drops = createDrops(grid.cols, fall, params.density ?? RAIN_DEFAULTS.density, random);
  const frames = Array.from({ length: count }, (_, index) =>
    createFrame(grid, (x, y) => drops[x].isActive && isFalling(drops[x], fall, index, y)),
  );
  return { frames, durations: frames.map(() => FRAME_MS) };
}
