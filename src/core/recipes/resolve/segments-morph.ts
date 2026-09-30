import type { Point } from '../helpers';
import { segmentEnds, strokeCells } from './segments-layout';
import type { DigitCell, SegmentId } from './segments-layout';

type Distances = ReadonlyMap<string, number>;

function keyOf([x, y]: Point): string {
  return `${x},${y}`;
}

function distanceAt(distances: Distances, point: Point): number {
  return distances.get(keyOf(point)) ?? Number.POSITIVE_INFINITY;
}

function relax(cell: DigitCell, links: readonly SegmentId[], distances: Distances): Distances {
  return links.reduce<Distances>((known, id) => {
    const [from, to] = segmentEnds(cell, id);
    const best = Math.min(distanceAt(known, from), distanceAt(known, to)) + 1;
    const next = new Map(known);
    [from, to].forEach((end) => next.set(keyOf(end), Math.min(distanceAt(known, end), best)));
    return next;
  }, distances);
}

function hopsFromKept(cell: DigitCell, kept: readonly SegmentId[], links: readonly SegmentId[]): Distances {
  const start: Distances = new Map(kept.flatMap((id) => segmentEnds(cell, id).map((end) => [keyOf(end), 0])));
  return links.reduce<Distances>((known) => relax(cell, links, known), start);
}

function cellsFromAnchor(cell: DigitCell, id: SegmentId, distances: Distances): Point[] {
  const [from, to] = segmentEnds(cell, id);
  return distanceAt(distances, to) < distanceAt(distances, from)
    ? strokeCells(to, from)
    : strokeCells(from, to);
}

function digitCells(cell: DigitCell, ids: readonly SegmentId[]): Point[] {
  return ids.flatMap((id) => strokeCells(...segmentEnds(cell, id)));
}

function sharedCells(cell: DigitCell, from: readonly SegmentId[], to: readonly SegmentId[]): Point[] {
  const after = new Set(digitCells(cell, to).map(keyOf));
  const both = digitCells(cell, from).filter((point) => after.has(keyOf(point)));
  return both.filter((point, index) => both.findIndex((other) => keyOf(other) === keyOf(point)) === index);
}

function partial(cells: readonly Point[], fraction: number, fixed: readonly Point[]): Point[] {
  const fixedKeys = new Set(fixed.map(keyOf));
  const own = cells.filter((point) => !fixedKeys.has(keyOf(point)));
  return own.slice(0, Math.round(own.length * fraction));
}

/** Lit cells of one digit place `fraction` of the way through a change: old segments shrink toward the kept ones and new ones grow from them. */
export function morphPlace(
  cell: DigitCell,
  from: readonly SegmentId[],
  to: readonly SegmentId[],
  fraction: number,
): Point[] {
  const kept = from.filter((id) => to.includes(id));
  const shrinking = from.filter((id) => !to.includes(id));
  const growing = to.filter((id) => !from.includes(id));
  const shrinkHops = hopsFromKept(cell, kept, from);
  const growHops = hopsFromKept(cell, kept, to);
  const fixed = sharedCells(cell, from, to);
  return [
    ...fixed,
    ...shrinking.flatMap((id) => partial(cellsFromAnchor(cell, id, shrinkHops), 1 - fraction, fixed)),
    ...growing.flatMap((id) => partial(cellsFromAnchor(cell, id, growHops), fraction, fixed)),
  ];
}
