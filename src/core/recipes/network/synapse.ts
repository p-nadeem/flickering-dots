import type { GridSize } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { createRng } from '../../rng';
import { getEdgePoints, getLayers, pickRoute } from './synapse-layout';
import type { Layer } from './synapse-layout';
import { clampCount, fallShots, plusPoints, shot, shotsToOutput, shuffled, withoutPoints } from './shots';
import type { Shot } from './shots';
import type { NetworkOptions } from './network-options';

const STEP_MS = 70;
const CHAIN_GAP_FRAMES = 2;
const DEFAULT_CHAINS = 2;
const MAX_CHAINS = 6;
const REST_GAP_MS = 2000;
const REST_SPARK_MS = 140;
const REST_SPARKS = 3;
const FORWARD_MS = 120;
const HOLD_MS = 1500;
const BLINK_MS = 200;
const ERROR_HOLD_MS = 1200;
const STALL_MS = 210;
const SPARK_RADIUS = 1;

interface Pulse {
  point: Point;
  at: number;
}

interface Fire {
  node: Point;
  at: number;
}

interface Timeline {
  pulses: readonly Pulse[];
  fires: readonly Fire[];
  length: number;
}

const EMPTY_TIMELINE: Timeline = { pulses: [], fires: [], length: 0 };

function routeTimeline(route: readonly Point[]): Timeline {
  return route.slice(1).reduce<Timeline>(
    (timeline, node, hop) => {
      const path = getEdgePoints(route[hop], node);
      const pulses = path.map((point, index): Pulse => ({ point, at: timeline.length + index }));
      const arrival = timeline.length + path.length;
      return {
        pulses: [...timeline.pulses, ...pulses],
        fires: [...timeline.fires, { node, at: arrival }],
        length: arrival + 1,
      };
    },
    { pulses: [], fires: [{ node: route[0], at: 0 }], length: 1 },
  );
}

function appendTimeline(first: Timeline, second: Timeline, gap: number): Timeline {
  const offset = first.length + gap;
  return {
    pulses: [...first.pulses, ...second.pulses.map((pulse) => ({ ...pulse, at: pulse.at + offset }))],
    fires: [...first.fires, ...second.fires.map((fire) => ({ ...fire, at: fire.at + offset }))],
    length: offset + second.length,
  };
}

function framePoints(timeline: Timeline, frame: number): Point[] {
  const pulses = timeline.pulses
    .filter(({ at }) => at === frame || at + 1 === frame)
    .map(({ point }) => point);
  const sparks = timeline.fires
    .filter(({ at }) => at === frame)
    .flatMap(({ node }) => plusPoints(node, SPARK_RADIUS));
  return [...pulses, ...sparks];
}

function timelineShots(timeline: Timeline, nodes: readonly Point[]): Shot[] {
  return Array.from({ length: timeline.length }, (_, frame) =>
    shot([...nodes, ...framePoints(timeline, frame)], STEP_MS),
  );
}

function loopOutput(
  grid: GridSize,
  routes: readonly (readonly Point[])[],
  nodes: readonly Point[],
): RecipeOutput {
  const timeline = routes.reduce<Timeline>(
    (joined, route) =>
      appendTimeline(joined, routeTimeline(route), joined.length === 0 ? 0 : CHAIN_GAP_FRAMES),
    EMPTY_TIMELINE,
  );
  const looped = { ...timeline, length: timeline.length + CHAIN_GAP_FRAMES };
  return shotsToOutput(grid, timelineShots(looped, nodes));
}

/** Impulses hop through the layered network left to right, a spark firing at each node they reach. */
export function generateSynapse(grid: GridSize, { seed, length }: NetworkOptions): RecipeOutput {
  const layers = getLayers(grid);
  const rng = createRng(seed);
  const chains = clampCount(length, DEFAULT_CHAINS, 1, MAX_CHAINS);
  const routes = Array.from({ length: chains }, () => pickRoute(layers, rng));
  return loopOutput(grid, routes, layers.flat());
}

/** A forward chain, then a backward chain from the output back to an input. */
export function generateSynapseTrain(grid: GridSize, { seed }: NetworkOptions): RecipeOutput {
  const layers = getLayers(grid);
  const rng = createRng(seed);
  const forward = pickRoute(layers, rng);
  const backward = pickRoute(layers, rng, true);
  return loopOutput(grid, [forward, backward], layers.flat());
}

/** The nodes at rest, one seeded node firing a spark every 2 s. */
export function generateSynapseRest(grid: GridSize, { seed }: NetworkOptions): RecipeOutput {
  const nodes = getLayers(grid).flat();
  const sparks = shuffled(createRng(seed), nodes).slice(0, REST_SPARKS);
  const shots = sparks.flatMap((node) => [
    shot(nodes, REST_GAP_MS - REST_SPARK_MS),
    shot([...nodes, ...plusPoints(node, SPARK_RADIUS)], REST_SPARK_MS),
  ]);
  return shotsToOutput(grid, shots);
}

/** Every layer fires in turn left to right, then the output node holds its spark. */
export function generateSynapseForward(grid: GridSize): RecipeOutput {
  const layers = getLayers(grid);
  const nodes = layers.flat();
  const last = layers.length - 1;
  const shots = layers.map((layer, index) =>
    shot(
      [...nodes, ...layer.flatMap((node) => plusPoints(node, SPARK_RADIUS))],
      index === last ? HOLD_MS : FORWARD_MS,
    ),
  );
  return shotsToOutput(grid, shots);
}

function droppedTimeline(route: readonly Point[]): { timeline: Timeline; dropped: Point } {
  const hop = Math.floor((route.length - 1) / 2);
  const reached = routeTimeline(route.slice(0, hop + 1));
  const path = getEdgePoints(route[hop], route[hop + 1]);
  const partial = path.slice(0, Math.ceil(path.length / 2));
  const pulses = partial.map((point, index): Pulse => ({ point, at: reached.length + index }));
  const timeline = {
    ...reached,
    pulses: [...reached.pulses, ...pulses],
    length: reached.length + partial.length,
  };
  return { timeline, dropped: partial.at(-1) ?? route[hop] };
}

function outputBlinkShots(layers: readonly Layer[]): Shot[] {
  const nodes = layers.flat();
  const dark = withoutPoints(nodes, layers[layers.length - 1]);
  return [shot(dark, BLINK_MS), shot(nodes, BLINK_MS), shot(dark, ERROR_HOLD_MS)];
}

/** A chain dies midway, the dropped impulse falls off the grid and the output node blinks off twice. */
export function generateSynapseDrop(grid: GridSize, { seed }: NetworkOptions): RecipeOutput {
  const layers = getLayers(grid);
  const nodes = layers.flat();
  const { timeline, dropped } = droppedTimeline(pickRoute(layers, createRng(seed)));
  const shots = [
    ...timelineShots(timeline, nodes),
    shot([...nodes, dropped], STALL_MS),
    ...fallShots([dropped], nodes, grid.rows, STEP_MS),
    ...outputBlinkShots(layers),
  ];
  return shotsToOutput(grid, shots);
}
