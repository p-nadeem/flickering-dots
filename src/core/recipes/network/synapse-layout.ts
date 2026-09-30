import type { GridSize } from '../../types';
import { getLinePoints } from '../helpers';
import type { Point } from '../helpers';
import { pickIndex } from './shots';

const WIDE_LAYERS = [3, 4, 2, 1] as const;
const NARROW_LAYERS = [3, 3, 1] as const;
const TINY_LAYERS = [2, 1] as const;
const WIDE_MIN_COLS = 11;
const WIDE_MIN_ROWS = 9;
const NARROW_MIN_COLS = 7;
const INSET_MIN_COLS = 7;
const NODE_GAP = 2;

/** One layer of the network: its nodes from top to bottom. */
export type Layer = readonly Point[];

function layerTemplate({ cols, rows }: GridSize): readonly number[] {
  if (cols >= WIDE_MIN_COLS && rows >= WIDE_MIN_ROWS) return WIDE_LAYERS;
  return cols >= NARROW_MIN_COLS ? NARROW_LAYERS : TINY_LAYERS;
}

function mirroredRound(value: number, span: number): number {
  return value <= span / 2 ? Math.round(value) : span - Math.round(span - value);
}

function layerX(layer: number, layerCount: number, cols: number): number {
  const inset = cols >= INSET_MIN_COLS ? 1 : 0;
  const span = cols - 1 - 2 * inset;
  return inset + mirroredRound((layer * span) / (layerCount - 1), span);
}

function nodeY(node: number, nodeCount: number, rows: number): number {
  const span = rows - 1;
  return mirroredRound((span * (2 * node + 1)) / (2 * nodeCount), span);
}

/** The layers of the network, spread across the grid and mirrored left to right and top to bottom. */
export function getLayers(grid: GridSize): Layer[] {
  const template = layerTemplate(grid);
  const maxNodes = Math.max(1, Math.floor((grid.rows - 1) / NODE_GAP));
  return template.map((count, layer) => {
    const x = layerX(layer, template.length, grid.cols);
    const nodes = Math.min(count, maxNodes);
    return Array.from({ length: nodes }, (_, node): Point => [x, nodeY(node, nodes, grid.rows)]);
  });
}

/** The cells strictly between two nodes on a Bresenham line. */
export function getEdgePoints(from: Point, to: Point): Point[] {
  return getLinePoints(from, to).slice(1, -1);
}

/** A seeded node from each layer, left to right, or right to left when `isBackward`. */
export function pickRoute(layers: readonly Layer[], rng: () => number, isBackward = false): Point[] {
  const ordered = isBackward ? [...layers].reverse() : layers;
  return ordered.map((layer) => layer[pickIndex(rng, layer.length)]);
}
