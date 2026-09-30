import { describe, expect, it } from 'vitest';

import { runLoopFrames, runScene } from '../../../../src/core/recipes/arcade/runner';
import { planRunner } from '../../../../src/core/recipes/arcade/runner-scene';
import { VARIANTS_B } from '../../../../src/core/recipes/arcade/variants-b';
import type { GridSize } from '../../../../src/core/types';

import { frameText, gridsFrom } from './arcade-b-checks';

const GRID: GridSize = { cols: 12, rows: 6 };
const MIN: GridSize = { cols: 8, rows: 5 };

function play(variant: string, grid: GridSize = GRID) {
  return VARIANTS_B[variant](grid, { variant });
}

function lastText(variant: string): string[] {
  const { frames } = play(variant);
  return frameText(frames[frames.length - 1], GRID.cols).split('|');
}

describe('runner obstacles and results read', () => {
  it('stands the posts as tall as the jump', () => {
    expect(planRunner(GRID).postHeight).toBe(planRunner(GRID).jump);
  });

  it('clears every post without the runner touching it', () => {
    gridsFrom(MIN).forEach((grid) => {
      const layout = planRunner(grid);
      Array.from({ length: runLoopFrames(grid.cols, true) }, (_, step) =>
        runScene(layout, step, true),
      ).forEach(({ post, runner }) => {
        const cells = new Set(runner.map(([x, y]) => `${x},${y}`));
        expect(post.some(([x, y]) => cells.has(`${x},${y}`))).toBe(false);
      });
    });
  });

  it('ends the crash with the runner lying on the ground in front of the post', () => {
    expect(lastText('run-crash')).toEqual([
      '............',
      '............',
      '............',
      '...#........',
      '####........',
      expect.stringMatching(/^[#.]{12}$/),
    ]);
  });

  it('ends the finish with the runner standing beside a flagged pole, clear of it', () => {
    const rows = lastText('run-finish');

    expect(rows.slice(0, 5)).toEqual([
      '............',
      '.....###....',
      '..#..###....',
      '.###.#......',
      '.#.#.#......',
    ]);
  });
});
