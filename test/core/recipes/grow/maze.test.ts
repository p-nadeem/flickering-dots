import { describe, expect, it } from 'vitest';

import { generateGrow } from '../../../../src/core/recipes/grow';
import { mazeEpisodes, mazeSide } from '../../../../src/core/recipes/grow/maze-model';
import type { GridSize } from '../../../../src/core/types';

import {
  cellsOf,
  digest,
  framesText,
  gridName,
  isBlank,
  isFourConnected,
  litCount,
  orthogonalNeighbours,
  squareGrids,
} from './grow-checks';

const SET_GRID = { cols: 9, rows: 9 };
const GRIDS: GridSize[] = [
  ...squareGrids(7),
  { cols: 12, rows: 9 },
  { cols: 8, rows: 13 },
  { cols: 16, rows: 10 },
];

function squareOf(grid: GridSize): { left: number; top: number; side: number } {
  const side = mazeSide(grid);
  return { left: Math.floor((grid.cols - side) / 2), top: Math.floor((grid.rows - side) / 2), side };
}

describe('grow maze', () => {
  it('pins the maze-solve thinking loop on 9x9', () => {
    const output = generateGrow(SET_GRID, { variant: 'maze' });
    expect(digest(output)).toBe('120 frames, 15600 ms, 6b5ad17');
    expect(framesText(output, 9).slice(0, 2)).toEqual([
      [
        '.........',
        '.###.....',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
      ],
      [
        '.........',
        '.###.....',
        '...#.....',
        '...#.....',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
      ],
    ]);
    expect(output.durations.slice(0, 16)).toEqual([
      60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 400, 90,
    ]);
    expect(output.durations.slice(21, 28)).toEqual([90, 600, 250, 250, 250, 250, 250]);
  });

  it('pins the solved path, the trace, the collapse and the wait on 9x9', () => {
    expect(digest(generateGrow(SET_GRID, { variant: 'maze-trace' }))).toBe('21 frames, 2300 ms, f8e19e00');
    expect(framesText(generateGrow(SET_GRID, { variant: 'maze-path' }), 9)).toEqual([
      [
        '.........',
        '.###.###.',
        '...#.#.#.',
        '...###.#.',
        '.......#.',
        '.....###.',
        '.....#...',
        '.....###.',
        '.........',
      ],
    ]);
    expect(framesText(generateGrow(SET_GRID, { variant: 'maze-wait' }), 9)).toEqual([
      [
        '.........',
        '.###.###.',
        '...#...#.',
        '.#.#####.',
        '.#.....#.',
        '.###.###.',
        '.#...#...',
        '.#######.',
        '.........',
      ],
      [
        '.........',
        '..##.###.',
        '...#...#.',
        '.#.#####.',
        '.#.....#.',
        '.###.###.',
        '.#...#...',
        '.#######.',
        '.........',
      ],
    ]);
    const collapse = generateGrow(SET_GRID, { variant: 'maze-collapse' });
    expect(collapse.durations).toEqual([300, 250, 250, 250, 250, 90, 90, 600]);
    expect(framesText(collapse, 9).slice(4)).toEqual([
      [
        '.........',
        '.###.....',
        '...#.....',
        '...#####.',
        '.......#.',
        '.....###.',
        '.....#...',
        '.....###.',
        '.........',
      ],
      [
        '.........',
        '.........',
        '...#.....',
        '...####..',
        '.........',
        '.....##..',
        '.....#...',
        '.........',
        '.........',
      ],
      [
        '.........',
        '.........',
        '.........',
        '...###...',
        '.........',
        '.....#...',
        '.........',
        '.........',
        '.........',
      ],
      [
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
        '.........',
      ],
    ]);
  });

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'keeps every dot inside the centred odd square on %s',
    (_name, grid) => {
      const { left, top, side } = squareOf(grid);
      const { frames } = generateGrow(grid, { variant: 'maze' });
      const cells = frames.flatMap((frame) => cellsOf(frame, grid.cols));
      expect(cells.every(([x, y]) => x > left && y > top && x < left + side - 1 && y < top + side - 1)).toBe(
        true,
      );
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'carves two dots a step, fills at least three layers and leaves one corner-to-corner path on %s',
    (_name, grid) => {
      const { left, top, side } = squareOf(grid);
      const start = (top + 1) * grid.cols + left + 1;
      const end = (top + side - 2) * grid.cols + left + side - 2;
      mazeEpisodes(grid, 1).forEach((maze) => {
        maze.carve.slice(1).forEach((cells, index) => expect(cells.size - maze.carve[index].size).toBe(2));
        expect(maze.layers.length).toBeGreaterThanOrEqual(3);
        expect(maze.path[0]).toBe(start);
        expect(maze.path[maze.path.length - 1]).toBe(end);
        expect(new Set(maze.path).size).toBe(maze.path.length);
      });
    },
  );

  it.each(GRIDS.map((grid) => [gridName(grid), grid] as const))(
    'shows the path as one clean four-connected line on %s',
    (_name, grid) => {
      const [path] = generateGrow(grid, { variant: 'maze-path' }).frames;
      const cells = cellsOf(path, grid.cols);
      expect(isFourConnected(path, grid.cols)).toBe(true);
      const ends = cells.filter((cell) => orthogonalNeighbours(path, grid.cols, cell) === 1);
      expect(ends).toHaveLength(2);
      expect(cells.every((cell) => orthogonalNeighbours(path, grid.cols, cell) <= 2)).toBe(true);
    },
  );

  it('traces the idle path dot by dot and holds it', () => {
    const trace = generateGrow(SET_GRID, { variant: 'maze-trace' });
    const [path] = generateGrow(SET_GRID, { variant: 'maze-path' }).frames;
    trace.frames.forEach((frame, index) => expect(frame.filter((bit) => bit === 1)).toHaveLength(index + 1));
    expect(trace.frames[trace.frames.length - 1]).toEqual(path);
    expect(trace.durations.slice(0, -1).every((ms) => ms === 40)).toBe(true);
    expect(trace.durations[trace.durations.length - 1]).toBe(1500);
  });

  it('starts each loop from the corner dot and clears before the next maze', () => {
    const { frames } = generateGrow({ cols: 11, rows: 11 }, { variant: 'maze', seed: 3 });
    expect(frames[0][12]).toBe(1);
    expect(litCount(frames[0])).toBe(3);
    expect(isBlank(frames[frames.length - 1])).toBe(true);
  });

  it('changes the mazes with the seed', () => {
    expect(generateGrow(SET_GRID, { variant: 'maze', seed: 9 })).not.toEqual(
      generateGrow(SET_GRID, { variant: 'maze' }),
    );
  });
});
