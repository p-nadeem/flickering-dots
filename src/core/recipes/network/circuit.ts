import type { GridSize } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { getCircuitLayout, padRing, padSolid } from './circuit-trace';
import type { CircuitLayout } from './circuit-trace';
import { clampCount, shot, shotsToOutput, withoutPoints } from './shots';
import type { Shot } from './shots';
import { NETWORK_DEFAULT_SEED } from './network-options';
import type { NetworkOptions } from './network-options';

const CELL_MS = 35;
const PACKET_TAIL = 2;
const PACKET_SPACING = 6;
const FILL_FRAMES = 3;
const DEFAULT_BURST = 3;
const MAX_BURST = 6;
const IDLE_MS = 400;
const IDLE_PARITIES = [0, 1] as const;
const ROUNDTRIP_REST_MS = 350;
const WIRE_MS = 300;
const HOLD_MS = 1500;
const BREAK_MS = 250;
const BREAK_BLINKS = 2;
const ERROR_HOLD_MS = 1200;

function layoutFor(grid: GridSize, seed: number): CircuitLayout {
  return getCircuitLayout(grid, seed - NETWORK_DEFAULT_SEED);
}

function packetPoints(trace: readonly Point[], head: number): Point[] {
  return Array.from({ length: PACKET_TAIL + 1 }, (_, back) => head - back)
    .filter((index) => index >= 0 && index < trace.length)
    .map((index) => trace[index]);
}

function packetLife(trace: readonly Point[]): number {
  return trace.length + FILL_FRAMES;
}

function agePoints({ trace, pad }: CircuitLayout, age: number): Point[] {
  const fill = age >= trace.length ? padSolid(pad) : [];
  return [...packetPoints(trace, age), ...fill];
}

function burstAges(launches: readonly number[], frame: number, period: number): number[] {
  return launches.flatMap((launch) => [frame - launch, frame - launch + period]);
}

/** Bursts of packets race along the trace one cell per 35 ms, the pad filling as each arrives. */
export function generateCircuit(grid: GridSize, { seed, length }: NetworkOptions): RecipeOutput {
  const layout = layoutFor(grid, seed);
  const burst = clampCount(length, DEFAULT_BURST, 1, MAX_BURST);
  const launches = Array.from({ length: burst }, (_, index) => index * PACKET_SPACING);
  const period = burst * PACKET_SPACING + layout.trace.length;
  const life = packetLife(layout.trace);
  const ring = padRing(layout.pad);
  const shots = Array.from({ length: period }, (_, frame) => {
    const ages = burstAges(launches, frame, period).filter((age) => age >= 0 && age < life);
    return shot([...ring, ...ages.flatMap((age) => agePoints(layout, age))], CELL_MS);
  });
  return shotsToOutput(grid, shots);
}

/** The dotted wire with its parity shifting every 400 ms, and the pad outline lit. */
export function generateTraceIdle(grid: GridSize, { seed }: NetworkOptions): RecipeOutput {
  const { trace, pad } = layoutFor(grid, seed);
  const ring = padRing(pad);
  const shots = IDLE_PARITIES.map((parity) =>
    shot([...ring, ...trace.filter((_, index) => index % 2 === parity)], IDLE_MS),
  );
  return shotsToOutput(grid, shots);
}

function outboundShots(layout: CircuitLayout, ages: number): Shot[] {
  const ring = padRing(layout.pad);
  return Array.from({ length: ages }, (_, age) => shot([...ring, ...agePoints(layout, age)], CELL_MS));
}

/** One packet runs to the pad, the pad fills, and a packet runs back to the left edge. */
export function generateCircuitRoundtrip(grid: GridSize, { seed }: NetworkOptions): RecipeOutput {
  const layout = layoutFor(grid, seed);
  const ring = padRing(layout.pad);
  const reversed = [...layout.trace].reverse();
  const back = Array.from({ length: reversed.length + PACKET_TAIL }, (_, age) =>
    shot([...ring, ...packetPoints(reversed, age)], CELL_MS),
  );
  return shotsToOutput(grid, [
    ...outboundShots(layout, packetLife(layout.trace)),
    ...back,
    shot(ring, ROUNDTRIP_REST_MS),
  ]);
}

/** A packet reaches the pad, the whole wire lights for 300 ms, then the solid pad holds. */
export function generateCircuitLit(grid: GridSize, { seed }: NetworkOptions): RecipeOutput {
  const layout = layoutFor(grid, seed);
  const solid = padSolid(layout.pad);
  return shotsToOutput(grid, [
    ...outboundShots(layout, layout.trace.length),
    shot([...solid, ...layout.trace], WIRE_MS),
    shot(solid, HOLD_MS),
  ]);
}

function isCorner(trace: readonly Point[], index: number): boolean {
  const [ax, ay] = trace[index - 1];
  const [bx, by] = trace[index + 1];
  return ax !== bx && ay !== by;
}

function breakIndex(trace: readonly Point[]): number {
  const middle = Math.floor(trace.length / 2);
  const inner = Array.from({ length: Math.max(0, trace.length - 2) }, (_, index) => index + 1);
  const byDistance = [...inner].sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle) || a - b);
  return byDistance.find((index) => !isCorner(trace, index)) ?? Math.max(0, trace.length - 1);
}

function blinkShots(ring: readonly Point[], wire: readonly Point[], beside: readonly Point[]): Shot[] {
  const lit = [...ring, ...wire];
  const dimmed = [...ring, ...withoutPoints(wire, beside)];
  const blinks = Array.from({ length: BREAK_BLINKS }, () => [
    shot(lit, BREAK_MS),
    shot(dimmed, BREAK_MS),
  ]).flat();
  return [...blinks, shot(lit, ERROR_HOLD_MS)];
}

/** The packet stops at a missing cell, then the wire shows with its gap and the two cells beside it blink twice at 250 ms. */
export function generateCircuitBreak(grid: GridSize, { seed }: NetworkOptions): RecipeOutput {
  const layout = layoutFor(grid, seed);
  const ring = padRing(layout.pad);
  const gap = breakIndex(layout.trace);
  const travel = outboundShots(layout, Math.max(1, gap));
  const stopped = travel.map((step, index) =>
    index === travel.length - 1 ? { ...step, ms: BREAK_MS } : step,
  );
  const beside = [layout.trace[gap - 1], layout.trace[gap + 1]].filter(
    (cell): cell is Point => cell !== undefined,
  );
  const wire = layout.trace.filter((_, index) => index !== gap);
  return shotsToOutput(grid, [...stopped, ...blinkShots(ring, wire, beside)]);
}
