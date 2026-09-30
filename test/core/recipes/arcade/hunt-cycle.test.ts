import { describe, expect, it } from 'vitest';

import { getHuntCycle } from '../../../../src/core/recipes/arcade/hunt-cycle';

import { gridsFrom, label } from './arcade-checks';

const HUNT_MIN = { cols: 4, rows: 4 };

describe('getHuntCycle', () => {
  it('walks the boustrophedon rows and returns up the first column on 4x4', () => {
    expect(getHuntCycle({ cols: 4, rows: 4 })).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
      [2, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [3, 3],
      [2, 3],
      [1, 3],
      [0, 3],
      [0, 2],
      [0, 1],
    ]);
  });

  it('is a closed path of single orthogonal steps with no repeats on every grid', () => {
    const broken = gridsFrom(HUNT_MIN).filter((grid) => {
      const cycle = getHuntCycle(grid);
      const keys = new Set(cycle.map(([x, y]) => `${x},${y}`));
      const isStepwise = cycle.every(([x, y], index) => {
        const [nx, ny] = cycle[(index + 1) % cycle.length];
        return Math.abs(nx - x) + Math.abs(ny - y) === 1;
      });
      const isInside = cycle.every(([x, y]) => x >= 0 && y >= 0 && x < grid.cols && y < grid.rows);
      return keys.size !== cycle.length || !isStepwise || !isInside;
    });
    expect(broken.map(label)).toEqual([]);
  });

  it('covers every cell, leaving out only the bottom-right corner when both sides are odd', () => {
    gridsFrom(HUNT_MIN).forEach((grid) => {
      const cycle = getHuntCycle(grid);
      const isOddSquare = grid.cols % 2 === 1 && grid.rows % 2 === 1;
      expect(cycle).toHaveLength(grid.cols * grid.rows - (isOddSquare ? 1 : 0));
      if (isOddSquare) expect(cycle).not.toContainEqual([grid.cols - 1, grid.rows - 1]);
    });
  });
});
