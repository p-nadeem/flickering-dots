import { describe, expect, it } from 'vitest';

import { generateGrow } from '../../../../src/core/recipes/grow';
import { buildFlood, sealFlood } from '../../../../src/core/recipes/grow/flood-model';
import type { GridSize } from '../../../../src/core/types';

import { digest, framesText, gridName, isBlank, isFourConnected, squareGrids } from './grow-checks';

const SET_GRID = { cols: 9, rows: 9 };
const GRIDS: GridSize[] = [
  ...squareGrids(7),
  { cols: 12, rows: 7 },
  { cols: 7, rows: 11 },
  { cols: 16, rows: 9 },
];
const SEEDS = [1, 2, 3, 4];

function isStraightSegmentCell(walls: ReadonlySet<number>, grid: GridSize, cell: number): boolean {
  const [x, y] = [cell % grid.cols, Math.floor(cell / grid.cols)];
  const near = [-1, 0, 1]
    .flatMap((dy) => [-1, 0, 1].map((dx) => [x + dx, y + dy] as const))
    .filter(([nx, ny]) => (nx !== x || ny !== y) && nx >= 0 && ny >= 0 && nx < grid.cols && ny < grid.rows)
    .filter(([nx, ny]) => walls.has(ny * grid.cols + nx));
  const inLine = near.every(([nx]) => nx === x) || near.every(([, ny]) => ny === y);
  return near.length >= 1 && inLine;
}

describe('grow flood', () => {
  it('pins the flood-search thinking loop and its moments on 9x9', () => {
    expect(digest(generateGrow(SET_GRID, { variant: 'flood' }))).toBe('100 frames, 8240 ms, 22141a44');
    expect(digest(generateGrow(SET_GRID, { variant: 'flood-path' }))).toBe('13 frames, 2100 ms, a5545554');
    expect(digest(generateGrow(SET_GRID, { variant: 'flood-sealed' }))).toBe('16 frames, 2800 ms, 80afb9d6');
    expect(framesText(generateGrow(SET_GRID, { variant: 'flood-rest' }), 9)).toEqual([
      [
        '.........',
        '.#.......',
        '....###..',
        '.........',
        '.....###.',
        '..#......',
        '..#......',
        '..#......',
        '.........',
      ],
    ]);
    expect(framesText(generateGrow(SET_GRID, { variant: 'flood-wait' }), 9)).toEqual([
      [
        '...##....',
        '....##...',
        '...####..',
        '#.##.....',
        '###..###.',
        '.##......',
        '..#......',
        '..#......',
        '.........',
      ],
      [
        '.........',
        '.........',
        '....###..',
        '.........',
        '.....###.',
        '..#......',
        '..#......',
        '..#......',
        '.........',
      ],
    ]);
  });

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'rolls straight walls that never touch, the start or goal, and always leave a way through on %s',
    (_name, grid) => {
      SEEDS.forEach((seed) => {
        const flood = buildFlood(grid, seed, 0.25);
        expect([...flood.walls].every((cell) => isStraightSegmentCell(flood.walls, grid, cell))).toBe(true);
        expect(flood.walls.has(flood.start) || flood.walls.has(flood.goal)).toBe(false);
        expect(flood.distance.has(flood.goal)).toBe(true);
        expect(flood.path).toHaveLength((flood.distance.get(flood.goal) ?? 0) + 1);
      });
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'lights the walls plus a front two steps deep, then walks the shortest path back on %s',
    (_name, grid) => {
      const flood = buildFlood(grid, 1, 0.25);
      const goalDistance = flood.distance.get(flood.goal) ?? 0;
      const { frames, durations } = generateGrow(grid, { variant: 'flood' });
      frames.slice(0, goalDistance).forEach((frame, t) => {
        const front = [...flood.distance].filter(([, d]) => d === t || d === t - 1).map(([cell]) => cell);
        const expected = new Set([...flood.walls, ...front]);
        expect(frame.every((bit, cell) => (bit === 1) === expected.has(cell))).toBe(true);
        expect(durations[t]).toBe(80);
      });
      const trace = frames.slice(goalDistance, goalDistance + flood.path.length);
      trace.forEach((frame, index) => expect(frame.filter((bit) => bit === 1)).toHaveLength(index + 1));
      expect(isFourConnected(trace[trace.length - 1], grid.cols)).toBe(true);
      expect(durations.slice(goalDistance, goalDistance + flood.path.length)).toEqual([
        ...flood.path.slice(1).map(() => 50),
        500,
      ]);
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'seals the start away from the goal, blinks the trapped water twice and clears on %s',
    (_name, grid) => {
      const sealed = sealFlood(grid, buildFlood(grid, 1, 0.25));
      expect(sealed.distance.has(sealed.goal)).toBe(false);
      const { frames, durations } = generateGrow(grid, { variant: 'flood-sealed' });
      expect(isBlank(frames[frames.length - 1])).toBe(true);
      expect(durations.slice(-6)).toEqual([400, 250, 250, 250, 250, 600]);
    },
  );

  it('keeps the traced success path the same as the thinking trace of the first layout', () => {
    const flood = buildFlood(SET_GRID, 1, 0.25);
    const { frames } = generateGrow(SET_GRID, { variant: 'flood-path' });
    expect(frames).toHaveLength(flood.path.length);
    expect(frames[frames.length - 1].filter((bit) => bit === 1)).toHaveLength(flood.path.length);
  });

  it('takes the wall share from density, with no walls at zero', () => {
    expect(buildFlood(SET_GRID, 1, 0).walls.size).toBe(0);
    expect(buildFlood({ cols: 16, rows: 16 }, 1, 0.25).walls.size).toBeGreaterThan(
      buildFlood({ cols: 16, rows: 16 }, 1, 0.1).walls.size,
    );
  });
});
