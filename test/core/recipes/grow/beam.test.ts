import { describe, expect, it } from 'vitest';

import { generateGrow } from '../../../../src/core/recipes/grow';
import { buildBeam, lineage } from '../../../../src/core/recipes/grow/beam-model';
import type { GridSize } from '../../../../src/core/types';

import {
  digest,
  framesText,
  gridName,
  isBlank,
  isEightConnected,
  litCount,
  squareGrids,
} from './grow-checks';

const SET_GRID = { cols: 12, rows: 12 };
const GRIDS: GridSize[] = [
  ...squareGrids(9),
  { cols: 13, rows: 9 },
  { cols: 9, rows: 14 },
  { cols: 16, rows: 10 },
];

function isSubset(inner: readonly number[], outer: readonly number[]): boolean {
  return inner.every((bit, cell) => bit === 0 || outer[cell] === 1);
}

describe('grow beam', () => {
  it('pins the beam-search thinking and planning loops and its moments on 12x12', () => {
    expect(digest(generateGrow(SET_GRID, { variant: 'beam' }))).toBe('138 frames, 12280 ms, 8c4d0eb3');
    expect(digest(generateGrow(SET_GRID, { variant: 'beam', length: 3 }))).toBe(
      '150 frames, 16900 ms, e88b7552',
    );
    expect(digest(generateGrow(SET_GRID, { variant: 'beam-win' }))).toBe('6 frames, 2900 ms, b854fe51');
    expect(digest(generateGrow(SET_GRID, { variant: 'beam-fail' }))).toBe('15 frames, 3250 ms, a361c88');
    expect(framesText(generateGrow(SET_GRID, { variant: 'beam-rest' }), 12)[0].slice(8)).toEqual([
      '............',
      '......#.....',
      '......#.....',
      '......#.....',
    ]);
  });

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'grows clean diagonal forks two rows a generation from the bottom-centre root on %s',
    (_name, grid) => {
      [1, 2, 3, 4].forEach((seed) => {
        const model = buildBeam(grid, seed, 2);
        expect(model.root).toBe((grid.rows - 1) * grid.cols + Math.floor(grid.cols / 2));
        model.branches.forEach((branch) => {
          const parent =
            branch.parent < 0 ? model.root : (lineage(model, branch.parent).at(-1) ?? model.root);
          const [px, py] = [parent % grid.cols, Math.floor(parent / grid.cols)];
          const [tx, ty] = branch.tip;
          expect(py - ty).toBe(Math.min(2, py));
          expect(Math.abs(tx - px)).toBe(py - ty);
        });
        model.generations.forEach(({ kept }) => expect(kept.length).toBeLessThanOrEqual(2));
        expect(model.branches[model.winner].tip[1]).toBe(0);
      });
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'keeps the tree in one piece while it grows and retracts on %s',
    (_name, grid) => {
      const { frames } = generateGrow(grid, { variant: 'beam' });
      const root = (grid.rows - 1) * grid.cols + Math.floor(grid.cols / 2);
      const treeFrames = frames.filter((frame) => frame[root] === 1);
      treeFrames.forEach((frame) => expect(isEightConnected(frame, grid.cols)).toBe(true));
      expect(isBlank(frames[frames.length - 1])).toBe(true);
    },
  );

  it('advances every tip one dot per frame at 60 ms, or 90 ms for a beam of three', () => {
    const narrow = generateGrow(SET_GRID, { variant: 'beam' });
    const wide = generateGrow(SET_GRID, { variant: 'beam', length: 3 });
    expect(narrow.durations.slice(0, 10).every((ms) => ms === 60)).toBe(true);
    expect(wide.durations.slice(0, 10).every((ms) => ms === 90)).toBe(true);
    expect(litCount(narrow.frames[1]) - litCount(narrow.frames[0])).toBe(2);
  });

  it('keeps only the winning path on success, blinks it twice and holds it', () => {
    const model = buildBeam(SET_GRID, 1, 2);
    const { frames, durations } = generateGrow(SET_GRID, { variant: 'beam-win' });
    const path = new Set(lineage(model, model.winner));
    expect(durations).toEqual([400, 250, 250, 250, 250, 1500]);
    expect(frames[5].every((bit, cell) => (bit === 1) === path.has(cell))).toBe(true);
    expect(isBlank(frames[2]) && isBlank(frames[4])).toBe(true);
    expect(litCount(frames[0])).toBeGreaterThan(path.size);
  });

  it('retracts every branch to the root on error, then blinks the root twice', () => {
    const { frames, durations } = generateGrow(SET_GRID, { variant: 'beam-fail' });
    const retracting = frames.slice(0, -4);
    retracting.slice(1).forEach((frame, index) => {
      expect(isSubset(frame, retracting[index])).toBe(true);
      expect(litCount(retracting[index]) - litCount(frame)).toBeGreaterThan(0);
    });
    expect(litCount(frames[frames.length - 1])).toBe(1);
    expect(durations.slice(-4)).toEqual([250, 250, 250, 1500]);
  });
});
