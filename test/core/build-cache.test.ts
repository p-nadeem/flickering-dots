import { describe, expect, it, vi } from 'vitest';

import { BUILD_CACHE_LIMIT, build } from '../../src/core/build';
import type * as Recipes from '../../src/core/recipes';
import type { RecipeFn } from '../../src/core/recipes';

const calls = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../src/core/recipes', async (importOriginal) => {
  const original = await importOriginal<typeof Recipes>();
  return {
    ...original,
    getRecipe: (id: string): RecipeFn => {
      const recipe = original.getRecipe(id);
      return (grid, params) => {
        calls.count += 1;
        return recipe(grid, params);
      };
    },
  };
});

function countRuns(run: () => void): number {
  const before = calls.count;
  run();
  return calls.count - before;
}

describe('build cache', () => {
  it('runs a recipe once for the same recipe, grid and params', () => {
    const grid = { cols: 16, rows: 16 };
    const runs = countRuns(() => {
      build('noise', grid, { seed: 101, density: 0.4 });
      build('noise', { ...grid }, { density: 0.4, seed: 101 });
      build('noise', grid, { density: 0.4, seed: 101, frames: undefined });
    });

    expect(runs).toBe(1);
  });

  it('runs again for a different grid, params, variant or glyph', () => {
    const runs = countRuns(() => {
      build('noise', { cols: 9, rows: 9 }, { seed: 102 });
      build('noise', { cols: 9, rows: 8 }, { seed: 102 });
      build('noise', { cols: 9, rows: 9 }, { seed: 103 });
      build('noise', { cols: 9, rows: 9 }, { seed: 102, variant: 'a' });
      build('noise', { cols: 9, rows: 9 }, { seed: 102, glyph: 'check' });
      build('rain', { cols: 9, rows: 9 }, { seed: 102 });
    });

    expect(runs).toBe(6);
  });

  it('keeps variant and glyph text apart even when it holds separators', () => {
    const grid = { cols: 7, rows: 7 };
    const runs = countRuns(() => {
      build('noise', grid, { seed: 104, variant: 'a', glyph: 'b|c' });
      build('noise', grid, { seed: 104, variant: 'a|b', glyph: 'c' });
    });

    expect(runs).toBe(2);
  });

  it('hands out copies so a caller cannot change what later calls get', () => {
    const grid = { cols: 7, rows: 7 };
    const first = build('noise', grid, { seed: 105 });
    const pristine = structuredClone(first);
    Object.assign(first.frames[0], [1, 1, 1]);
    Object.assign(first.durations, [1]);

    expect(build('noise', grid, { seed: 105 })).toEqual(pristine);
  });

  it('forgets the oldest clip once more than the limit are kept', () => {
    const grid = { cols: 3, rows: 3 };
    const fill = (): void => {
      Array.from({ length: BUILD_CACHE_LIMIT + 1 }, (_, index) =>
        build('pulse', grid, { seed: 1000 + index }),
      );
    };
    fill();
    const runs = countRuns(() => {
      build('pulse', grid, { seed: 1000 });
      build('pulse', grid, { seed: 1000 + BUILD_CACHE_LIMIT });
    });

    expect(runs).toBe(1);
  });

  it('still validates params before using a cached clip', () => {
    const grid = { cols: 7, rows: 7 };
    build('noise', grid, { seed: 106 });

    expect(() => build('noise', { cols: 2, rows: 7 }, { seed: 106 })).toThrow('grid.cols');
  });
});
