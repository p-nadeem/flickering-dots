import { createRng } from '../../rng';
import type { GridSize } from '../../types';
import { getLinePoints } from '../helpers';
import type { Point } from '../helpers';
import { toIndex } from './lattice';

/** One branch: the cells it adds after its fork, the tip it ends on and its parent branch. */
export interface Branch {
  cells: number[];
  tip: Point;
  parent: number;
}

/** One generation: the branches it grew and the ones that survived the cut. */
export interface Generation {
  grown: number[];
  kept: number[];
}

/** A grown beam-search tree. */
export interface BeamModel {
  root: number;
  branches: Branch[];
  generations: Generation[];
  winner: number;
}

const GENERATION_ROWS = 2;
const SIDES = [-1, 1] as const;
const ROOT_PARENT = -1;

function rootPoint(grid: GridSize): Point {
  return [Math.floor(grid.cols / 2), grid.rows - 1];
}

function childEnds(grid: GridSize, [x, y]: Point): number[] {
  const rise = Math.min(GENERATION_ROWS, y);
  const inside = SIDES.map((side) => x + side * rise).filter((end) => end >= 0 && end < grid.cols);
  return inside.length > 0 ? inside : [x];
}

function spawn(grid: GridSize, tip: Point, parent: number): Branch[] {
  const y = Math.max(0, tip[1] - GENERATION_ROWS);
  return childEnds(grid, tip).map((x) => ({
    cells: getLinePoints(tip, [x, y])
      .slice(1)
      .map((point) => toIndex(grid, point)),
    tip: [x, y],
    parent,
  }));
}

function rank(branches: readonly Branch[], ids: readonly number[], target: number): number[] {
  return [...ids].sort(
    (a, b) => Math.abs(branches[a].tip[0] - target) - Math.abs(branches[b].tip[0] - target),
  );
}

function distinctTips(branches: readonly Branch[], ids: readonly number[]): number[] {
  return ids.filter(
    (id, index) => ids.findIndex((other) => branches[other].tip[0] === branches[id].tip[0]) === index,
  );
}

/** Grows a beam-search tree from the bottom-centre root, keeping `width` tips per generation. */
export function buildBeam(grid: GridSize, seed: number, width: number): BeamModel {
  const random = createRng(seed);
  const target = 1 + Math.floor(random() * Math.max(grid.cols - 2, 1));
  const root = rootPoint(grid);
  let branches: Branch[] = [];
  let generations: Generation[] = [];
  let tips: { point: Point; id: number }[] = [{ point: root, id: ROOT_PARENT }];
  while (tips.length > 0 && tips[0].point[1] > 0) {
    const children = tips.flatMap(({ point, id }) => spawn(grid, point, id));
    const grown = children.map((_, index) => branches.length + index);
    branches = [...branches, ...children];
    const kept = rank(branches, distinctTips(branches, grown), target).slice(0, Math.max(width, 1));
    generations = [...generations, { grown, kept }];
    tips = kept.map((id) => ({ point: branches[id].tip, id }));
  }
  const winner = tips.length > 0 ? tips[0].id : ROOT_PARENT;
  return { root: toIndex(grid, root), branches, generations, winner };
}

/** Cells from the root to the end of a branch. */
export function lineage(model: BeamModel, id: number): number[] {
  if (id === ROOT_PARENT) return [model.root];
  const branch = model.branches[id];
  return [...lineage(model, branch.parent), ...branch.cells];
}
