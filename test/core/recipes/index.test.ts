import { describe, expect, it } from 'vitest';

import { RECIPES, getRecipe, isRecipeId } from '../../../src/core/recipes';
import { generateArcade } from '../../../src/core/recipes/arcade';
import { generateAutomaton } from '../../../src/core/recipes/automaton';
import { generateBars } from '../../../src/core/recipes/bars';
import { generateCascade } from '../../../src/core/recipes/cascade';
import { generateColumns } from '../../../src/core/recipes/columns';
import { generateEllipsis } from '../../../src/core/recipes/ellipsis';
import { generateFace } from '../../../src/core/recipes/face';
import { generateFill } from '../../../src/core/recipes/fill';
import { generateGranular } from '../../../src/core/recipes/granular';
import { generateGrow } from '../../../src/core/recipes/grow';
import { generateHeart } from '../../../src/core/recipes/heart';
import { generateHop } from '../../../src/core/recipes/hop';
import { generateNetwork } from '../../../src/core/recipes/network';
import { generateParticles } from '../../../src/core/recipes/particles';
import { generateProjection } from '../../../src/core/recipes/projection';
import { generatePulse } from '../../../src/core/recipes/pulse';
import { generateResolve } from '../../../src/core/recipes/resolve';
import { generateScanner } from '../../../src/core/recipes/scanner';
import { generateShader } from '../../../src/core/recipes/shader';
import { generateShimmer } from '../../../src/core/recipes/shimmer';
import { generateTrace } from '../../../src/core/recipes/trace';
import type { RecipeId } from '../../../src/core/types';

const ENGINES = {
  shader: generateShader,
  particles: generateParticles,
  automaton: generateAutomaton,
  grow: generateGrow,
  network: generateNetwork,
  projection: generateProjection,
  columns: generateColumns,
  trace: generateTrace,
  arcade: generateArcade,
  resolve: generateResolve,
  granular: generateGranular,
  face: generateFace,
} as const satisfies Partial<Record<RecipeId, unknown>>;

const ENGINE_IDS = Object.keys(ENGINES) as (keyof typeof ENGINES)[];

const BASE_RECIPE_IDS: readonly RecipeId[] = [
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

const ALL_RECIPE_IDS: readonly RecipeId[] = [...BASE_RECIPE_IDS, ...ENGINE_IDS];

const ARCADE_MIN_GRID = { cols: 4, rows: 6 };

function fitsGrid(id: RecipeId, { cols, rows }: { cols: number; rows: number }): boolean {
  return id !== 'arcade' || (cols >= ARCADE_MIN_GRID.cols && rows >= ARCADE_MIN_GRID.rows);
}

const GRIDS = [
  { cols: 3, rows: 3 },
  { cols: 7, rows: 7 },
  { cols: 12, rows: 3 },
  { cols: 3, rows: 16 },
  { cols: 16, rows: 8 },
] as const;

const BASE_OFFERED = 20;

describe('RECIPES', () => {
  it('lists the 20 original recipes first, in their display order', () => {
    expect(RECIPES.slice(0, BASE_OFFERED)).toEqual([
      { id: 'pulse', label: 'Thinking pulse' },
      { id: 'orbit', label: 'Orbit' },
      { id: 'radar', label: 'Radar' },
      { id: 'ripple', label: 'Ripple' },
      { id: 'snake', label: 'Snake' },
      { id: 'rain', label: 'Rain' },
      { id: 'noise', label: 'Noise' },
      { id: 'life', label: 'Life' },
      { id: 'wave', label: 'Wave' },
      { id: 'cascade', label: 'Grid wave' },
      { id: 'bars', label: 'Bars' },
      { id: 'bounce', label: 'Bounce' },
      { id: 'hop', label: 'Hop' },
      { id: 'scan', label: 'Scan' },
      { id: 'scanner', label: 'Scanner' },
      { id: 'shimmer', label: 'Shimmer' },
      { id: 'breathe', label: 'Breathe' },
      { id: 'ellipsis', label: 'Ellipsis' },
      { id: 'typewriter', label: 'Typewriter' },
      { id: 'fill', label: 'Fill' },
    ]);
  });

  it('offers the 12 wow engines after them, 32 recipes in all, each with its default variant', () => {
    expect(RECIPES).toHaveLength(32);
    expect(RECIPES.slice(BASE_OFFERED)).toEqual([
      { id: 'shader', label: 'Lava lamp', params: { variant: 'metaball' } },
      { id: 'particles', label: 'Hyperspace', params: { variant: 'warp' } },
      { id: 'automaton', label: 'Campfire', params: { variant: 'fire' } },
      { id: 'grow', label: 'Maze solve', params: { variant: 'maze' } },
      { id: 'network', label: 'Synapse', params: { variant: 'synapse' } },
      { id: 'projection', label: 'Wireframe cube', params: { variant: 'cube' } },
      { id: 'columns', label: 'Pendulum wave', params: { variant: 'pendulum' } },
      { id: 'trace', label: 'Scope', params: { variant: 'lissajous-3-2' } },
      { id: 'arcade', label: 'Stack and clear', params: { variant: 'stack' } },
      { id: 'resolve', label: 'Decode', params: { variant: 'rain', glyph: 'check' } },
      { id: 'granular', label: 'Hourglass', params: { variant: 'hourglass' } },
      { id: 'face', label: 'Robot eyes', params: { variant: 'glance' } },
    ]);
  });

  it('gives each engine the same picture with and without its default params', () => {
    const grid = { cols: 12, rows: 12 };
    for (const { id, params } of RECIPES.slice(BASE_OFFERED)) {
      expect(getRecipe(id)(grid, params ?? {}), id).toEqual(getRecipe(id)(grid, {}));
    }
  });

  it('offers only registered recipes, each once', () => {
    const ids = RECIPES.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => ALL_RECIPE_IDS.includes(id))).toBe(true);
  });
});

describe('getRecipe', () => {
  it('returns the matching generator for an id', () => {
    expect(getRecipe('pulse')).toBe(generatePulse);
    expect(getRecipe('ellipsis')).toBe(generateEllipsis);
    expect(getRecipe('heart')).toBe(generateHeart);
  });

  it('returns the generators of the six new recipes', () => {
    expect(getRecipe('hop')).toBe(generateHop);
    expect(getRecipe('shimmer')).toBe(generateShimmer);
    expect(getRecipe('scanner')).toBe(generateScanner);
    expect(getRecipe('bars')).toBe(generateBars);
    expect(getRecipe('cascade')).toBe(generateCascade);
    expect(getRecipe('fill')).toBe(generateFill);
  });

  it('returns the generators of the 12 wow engines', () => {
    for (const id of ENGINE_IDS) {
      expect(getRecipe(id), id).toBe(ENGINES[id]);
    }
  });

  it('has a generator for every recipe id that fills each grid it is given', () => {
    for (const grid of GRIDS) {
      for (const id of ALL_RECIPE_IDS.filter((recipe) => fitsGrid(recipe, grid))) {
        const label = `${id} ${grid.cols}x${grid.rows}`;
        const output = getRecipe(id)(grid, {});
        expect(output.frames.length, label).toBeGreaterThan(0);
        expect(output.durations, label).toHaveLength(output.frames.length);
        expect(
          output.frames.every((frame) => frame.length === grid.cols * grid.rows),
          label,
        ).toBe(true);
      }
    }
  });

  it('throws a readable error for arcade below its smallest grid', () => {
    expect(() => getRecipe('arcade')({ cols: 3, rows: 3 }, {})).toThrow('needs a grid of at least');
  });

  it('falls back to pulse for an unknown id', () => {
    expect(getRecipe('sparkle')).toBe(generatePulse);
  });

  it('falls back to pulse for names inherited from Object', () => {
    expect(getRecipe('toString')).toBe(generatePulse);
    expect(getRecipe('constructor')).toBe(generatePulse);
    expect(getRecipe('__proto__')).toBe(generatePulse);
  });
});

describe('isRecipeId', () => {
  it('accepts every registered id, old and new', () => {
    expect(ALL_RECIPE_IDS.every(isRecipeId)).toBe(true);
  });

  it('rejects unknown ids and names inherited from Object', () => {
    expect(['plasma', 'toString', '__proto__', ''].some(isRecipeId)).toBe(false);
  });
});
