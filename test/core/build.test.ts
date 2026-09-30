import { describe, expect, it } from 'vitest';

import { build } from '../../src/core/build';
import type { Clip, GridSize, RecipeId, RecipeParams } from '../../src/core/types';

import { toFrameText } from './recipes/frame-text';

const ALL_RECIPE_IDS: readonly RecipeId[] = [
  'pulse',
  'orbit',
  'radar',
  'ripple',
  'snake',
  'rain',
  'noise',
  'life',
  'wave',
  'bounce',
  'scan',
  'breathe',
  'ellipsis',
  'typewriter',
  'check',
  'cross',
  'idle',
  'heart',
  'arrow',
  'hop',
  'shimmer',
  'scanner',
  'bars',
  'cascade',
  'fill',
];

const GRIDS: readonly GridSize[] = [
  { cols: 3, rows: 3 },
  { cols: 5, rows: 5 },
  { cols: 7, rows: 7 },
  { cols: 9, rows: 3 },
  { cols: 3, rows: 16 },
  { cols: 16, rows: 5 },
  { cols: 16, rows: 16 },
];

const SEEDED_PARAMS: RecipeParams = { frames: 10, trail: 3, length: 4, density: 0.4, seed: 23 };

function parseJson<T>(text: string): T {
  return JSON.parse(text);
}

function toClipText(clip: Clip): {
  cols: number;
  rows: number;
  frames: string[];
  durations: readonly number[];
} {
  return {
    cols: clip.cols,
    rows: clip.rows,
    frames: clip.frames.map((frame) => toFrameText(frame, clip.cols)),
    durations: clip.durations,
  };
}

describe('build', () => {
  it('reproduces the prototype pulse on 7x7', () => {
    expect(toClipText(build('pulse', { cols: 7, rows: 7 }))).toEqual({
      cols: 7,
      rows: 7,
      frames: [
        '0000000 0000000 0000000 0001000 0000000 0000000 0000000',
        '0000000 0000000 0001000 0011100 0001000 0000000 0000000',
        '0000000 0101010 0011100 0111110 0011100 0101010 0000000',
        '1001001 0101010 0011100 1111111 0011100 0101010 1001001',
        '0000000 0101010 0011100 0111110 0011100 0101010 0000000',
        '0000000 0000000 0001000 0011100 0001000 0000000 0000000',
      ],
      durations: [480, 80, 80, 400, 80, 80],
    });
  });

  it('builds the evenly spaced ellipsis on 9x3', () => {
    expect(toClipText(build('ellipsis', { cols: 9, rows: 3 }))).toEqual({
      cols: 9,
      rows: 3,
      frames: [
        '000000000 000000000 000000000',
        '000000000 010000000 000000000',
        '000000000 010010000 000000000',
        '000000000 010010010 000000000',
      ],
      durations: [200, 260, 260, 560],
    });
  });

  it('gives every recipe one duration per frame and cols times rows cells per frame', () => {
    for (const recipe of ALL_RECIPE_IDS) {
      for (const grid of GRIDS) {
        const clip = build(recipe, grid, SEEDED_PARAMS);
        const label = `${recipe} ${grid.cols}x${grid.rows}`;
        expect(clip.frames.length, label).toBeGreaterThan(0);
        expect(clip.durations, label).toHaveLength(clip.frames.length);
        expect(
          clip.frames.every((frame) => frame.length === grid.cols * grid.rows),
          label,
        ).toBe(true);
        expect(
          clip.frames.every((frame) => frame.every((bit) => bit === 0 || bit === 1)),
          label,
        ).toBe(true);
        expect(
          clip.durations.every((ms) => Number.isInteger(ms) && ms > 0),
          label,
        ).toBe(true);
      }
    }
  });

  it('joins equal neighbouring frames a recipe emits into one longer frame', () => {
    const clip = build('face', { cols: 12, rows: 8 }, { variant: 'glance' });
    const repeats = clip.frames
      .slice(1)
      .filter((frame, index) => frame.join('') === clip.frames[index].join(''));

    expect(repeats).toEqual([]);
  });

  it('passes the still frame a recipe names through to the clip', () => {
    const clip = build('shimmer', { cols: 12, rows: 3 });

    expect(clip.still).toBe(clip.frames.length - 1);
    expect(build('pulse', { cols: 7, rows: 7 })).not.toHaveProperty('still');
  });

  it('returns the same clip for the same recipe, grid and params', () => {
    for (const recipe of ALL_RECIPE_IDS) {
      expect(build(recipe, { cols: 8, rows: 6 }, SEEDED_PARAMS), recipe).toEqual(
        build(recipe, { cols: 8, rows: 6 }, SEEDED_PARAMS),
      );
    }
  });

  it('treats missing params as empty params', () => {
    for (const recipe of ALL_RECIPE_IDS) {
      expect(build(recipe, { cols: 7, rows: 7 }), recipe).toEqual(build(recipe, { cols: 7, rows: 7 }, {}));
    }
  });

  it('falls back to pulse for an unknown recipe id', () => {
    const grid = { cols: 5, rows: 5 };
    expect(build('sparkle', grid)).toEqual(build('pulse', grid));
    expect(build('toString', grid)).toEqual(build('pulse', grid));
  });

  it('returns fresh arrays so a caller cannot change later clips', () => {
    const grid = { cols: 5, rows: 5 };
    const first = build('idle', grid);
    const second = build('idle', grid);
    expect(first.frames[0]).not.toBe(second.frames[0]);
    expect(first.durations).not.toBe(second.durations);
  });

  it('accepts the grid limits', () => {
    expect(build('pulse', { cols: 3, rows: 3 }).cols).toBe(3);
    expect(build('pulse', { cols: 16, rows: 16 }).rows).toBe(16);
  });

  it('rejects a grid outside 3 to 16 or with fractional sides', () => {
    expect(() => build('pulse', { cols: 2, rows: 7 })).toThrow(
      'flickering-dots build: grid.cols must be a whole number from 3 to 16, got 2',
    );
    expect(() => build('pulse', { cols: 7, rows: 17 })).toThrow(
      'grid.rows must be a whole number from 3 to 16, got 17',
    );
    expect(() => build('pulse', { cols: 7.5, rows: 7 })).toThrow(
      'grid.cols must be a whole number from 3 to 16, got 7.5',
    );
    expect(() => build('pulse', { cols: Number.NaN, rows: 7 })).toThrow('got NaN');
    expect(() => build('pulse', parseJson<GridSize>('{"cols":"7","rows":7}'))).toThrow('got "7"');
  });

  it('rejects a grid that is not an object', () => {
    expect(() => build('pulse', parseJson<GridSize>('null'))).toThrow(
      'flickering-dots build: grid must be an object with cols and rows',
    );
  });

  it('rejects counts that are negative, fractional or too large', () => {
    const grid = { cols: 7, rows: 7 };
    expect(() => build('orbit', grid, { frames: -1 })).toThrow(
      'flickering-dots build: params.frames must be a whole number from 0 to 256, got -1',
    );
    expect(() => build('orbit', grid, { trail: 2.5 })).toThrow(
      'params.trail must be a whole number from 0 to 256, got 2.5',
    );
    expect(() => build('snake', grid, { length: 257 })).toThrow(
      'params.length must be a whole number from 0 to 256, got 257',
    );
    expect(() => build('orbit', grid, { frames: Number.POSITIVE_INFINITY })).toThrow('got Infinity');
  });

  it('rejects a density outside 0 to 1 and a seed that is not finite', () => {
    const grid = { cols: 7, rows: 7 };
    expect(() => build('noise', grid, { density: 1.5 })).toThrow(
      'flickering-dots build: params.density must be a number from 0 to 1, got 1.5',
    );
    expect(() => build('noise', grid, { density: -0.1 })).toThrow('got -0.1');
    expect(() => build('noise', grid, { seed: Number.NaN })).toThrow(
      'flickering-dots build: params.seed must be a finite number, got NaN',
    );
  });

  it('rejects params that are not an object', () => {
    expect(() => build('pulse', { cols: 7, rows: 7 }, parseJson<RecipeParams>('[1]'))).toThrow(
      'flickering-dots build: params must be an object',
    );
  });

  it('accepts the edge values of every param', () => {
    const grid = { cols: 7, rows: 7 };
    expect(() => build('noise', grid, { frames: 0, trail: 0, length: 0, density: 0, seed: 0 })).not.toThrow();
    expect(() =>
      build('noise', grid, { frames: 256, trail: 256, length: 256, density: 1, seed: -99 }),
    ).not.toThrow();
  });
});
