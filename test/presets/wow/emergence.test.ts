import { describe, expect, it } from 'vitest';

import { isOneShotState } from '../../../src/core/one-shot';
import { getRecipe } from '../../../src/core/recipes';
import { resolve } from '../../../src/core/resolve';
import type { IndicatorSet, RecipeStateDef } from '../../../src/core/types';
import { EMERGENCE_SETS } from '../../../src/presets/wow/emergence';

import { countPeakBigChanges } from './emergence-flashes';

const MAX_BIG_CHANGES_PER_SECOND = 6;
const ADDED_AT = '2026-09-29';

interface Expected {
  id: string;
  name: string;
  intent: string;
  grid: [number, number];
  transition: string;
  collections: string[];
  tags: string[];
  contexts: string[];
  states: Record<string, [string, Record<string, unknown>]>;
}

const EXPECTED: readonly Expected[] = [
  {
    id: 'maze-solve',
    name: 'Maze Solve',
    intent: 'thinking',
    grid: [9, 9],
    transition: 'cut',
    collections: ['emergence'],
    tags: ['maze', 'reasoning', 'search', 'algorithm'],
    contexts: ['card', 'page', 'splash', 'chat'],
    states: {
      idle: ['grow', { variant: 'maze-path' }],
      thinking: ['grow', { variant: 'maze' }],
      waiting: ['grow', { variant: 'maze-wait' }],
      success: ['grow', { variant: 'maze-trace' }],
      error: ['grow', { variant: 'maze-collapse' }],
    },
  },
  {
    id: 'sort-pass',
    name: 'Sort Pass',
    intent: 'progress',
    grid: [8, 8],
    transition: 'cut',
    collections: ['emergence', 'term'],
    tags: ['sorting', 'ranking', 'algorithm', 'bars'],
    contexts: ['card', 'button', 'inline', 'terminal', 'chat'],
    states: {
      idle: ['columns', { variant: 'sort-done' }],
      thinking: ['columns', { variant: 'sort' }],
      ranking: ['columns', { variant: 'sort-insert' }],
      success: ['columns', { variant: 'sort-verify' }],
      error: ['columns', { variant: 'sort-bogo' }],
    },
  },
  {
    id: 'rule-stream',
    name: 'Rule Stream',
    intent: 'thinking',
    grid: [16, 9],
    transition: 'cut',
    collections: ['emergence'],
    tags: ['automaton', 'fractal', 'math', 'terminal'],
    contexts: ['splash', 'page', 'card', 'terminal'],
    states: {
      idle: ['automaton', { variant: 'rule-90', frames: 1 }],
      thinking: ['automaton', { variant: 'rule-90' }],
      working: ['automaton', { variant: 'rule-30' }],
      success: ['automaton', { variant: 'rule-90', glyph: 'check' }],
      error: ['automaton', { variant: 'rule-204' }],
    },
  },
  {
    id: 'flood-search',
    name: 'Flood Search',
    intent: 'thinking',
    grid: [9, 9],
    transition: 'cut',
    collections: ['emergence', 'agent'],
    tags: ['pathfinding', 'search', 'agent', 'algorithm'],
    contexts: ['card', 'page', 'splash', 'chat'],
    states: {
      idle: ['grow', { variant: 'flood-rest' }],
      thinking: ['grow', { variant: 'flood' }],
      waiting: ['grow', { variant: 'flood-wait' }],
      success: ['grow', { variant: 'flood-path' }],
      error: ['grow', { variant: 'flood-sealed' }],
    },
  },
  {
    id: 'ant-rewind',
    name: 'Ant Rewind',
    intent: 'thinking',
    grid: [11, 11],
    transition: 'cut',
    collections: ['emergence'],
    tags: ['automaton', 'reversible', 'undo', 'math'],
    contexts: ['splash', 'page', 'card'],
    states: {
      idle: ['automaton', { variant: 'ant-rest' }],
      thinking: ['automaton', { variant: 'ant' }],
      undo: ['automaton', { variant: 'ant-undo' }],
      success: ['automaton', { variant: 'ant-home' }],
      error: ['automaton', { variant: 'ant-freeze' }],
    },
  },
  {
    id: 'turing-spots',
    name: 'Turing Spots',
    intent: 'loading',
    grid: [16, 16],
    transition: 'crossfade',
    collections: ['emergence'],
    tags: ['biology', 'reaction-diffusion', 'growth', 'organic'],
    contexts: ['splash', 'page'],
    states: {
      idle: ['automaton', { variant: 'spots-breathe' }],
      thinking: ['automaton', { variant: 'spots' }],
      growing: ['automaton', { variant: 'spots-coral' }],
      success: ['automaton', { variant: 'spots-pulse' }],
      error: ['automaton', { variant: 'spots-labyrinth' }],
    },
  },
  {
    id: 'frost',
    name: 'Frost',
    intent: 'loading',
    grid: [11, 11],
    transition: 'cut',
    collections: ['emergence'],
    tags: ['crystal', 'growth', 'frost', 'branching'],
    contexts: ['splash', 'page', 'card'],
    states: {
      idle: ['grow', { variant: 'dla-rest' }],
      thinking: ['grow', { variant: 'dla' }],
      progress: ['grow', { variant: 'dla-progress' }],
      success: ['grow', { variant: 'dla-tips' }],
      error: ['grow', { variant: 'dla-shatter' }],
    },
  },
  {
    id: 'fireflies',
    name: 'Fireflies',
    intent: 'thinking',
    grid: [10, 10],
    transition: 'crossfade',
    collections: ['emergence'],
    tags: ['emergence', 'sync', 'swarm', 'agents'],
    contexts: ['splash', 'page', 'card', 'chat'],
    states: {
      idle: ['particles', { variant: 'fireflies', density: 0 }],
      thinking: ['particles', { variant: 'fireflies' }],
      waiting: ['particles', { variant: 'fireflies-beat' }],
      success: ['particles', { variant: 'fireflies-sync' }],
      error: ['particles', { variant: 'fireflies-scatter' }],
    },
  },
];

const SET_CASES = EXPECTED.map((expected, index) => [expected.id, expected, index] as const);
const STATE_CASES = EMERGENCE_SETS.flatMap((set) =>
  Object.keys(set.states).map((state) => [`${set.id} ${state}`, set, state] as const),
);

function recipeState(set: IndicatorSet, state: string): RecipeStateDef {
  const def = set.states[state];
  if (def.kind !== 'recipe') throw new Error(`${set.id} ${state} is not a recipe state`);
  return def;
}

describe('EMERGENCE_SETS', () => {
  it('holds the eight emergence sets in proposal order', () => {
    expect(EMERGENCE_SETS.map((set) => set.id)).toEqual(EXPECTED.map((expected) => expected.id));
  });

  it.each(SET_CASES)('describes %s as the proposal specifies', (_, expected, index) => {
    const set = EMERGENCE_SETS[index];

    expect(set).toMatchObject({
      name: expected.name,
      intent: expected.intent,
      cols: expected.grid[0],
      rows: expected.grid[1],
      transition: expected.transition,
      author: 'Flickering Dots',
      source: 'builtin',
      addedAt: ADDED_AT,
    });
    expect(set.collections).toEqual(expected.collections);
    expect(set.tags).toEqual(expected.tags);
    expect(set.contexts).toEqual(expected.contexts);
    expect(set.description?.length).toBeGreaterThan(0);
  });

  it.each(SET_CASES)('gives %s the proposal states', (_, expected, index) => {
    const set = EMERGENCE_SETS[index];

    expect(Object.keys(set.states)).toEqual(Object.keys(expected.states));
    Object.entries(expected.states).forEach(([state, [recipe, params]]) => {
      const def = recipeState(set, state);
      expect([def.recipe, def.params]).toEqual([recipe, params]);
    });
  });
});

describe('EMERGENCE_SETS rendering', () => {
  it.each(STATE_CASES)('renders %s with lit frames that fit the grid', (_, set, state) => {
    const clip = resolve(set, state);

    expect(clip.frames.length).toBeGreaterThan(0);
    expect(clip.durations).toHaveLength(clip.frames.length);
    clip.frames.forEach((frame) => expect(frame).toHaveLength(set.cols * set.rows));
    expect(clip.frames.some((frame) => frame.includes(1))).toBe(true);
  });

  it.each(STATE_CASES)('keeps %s under 3 flashes a second', (_, set, state) => {
    const clip = resolve(set, state);

    expect(countPeakBigChanges(clip, !isOneShotState(state))).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_SECOND);
  });

  it.each(STATE_CASES)('draws %s the same way every time from its seed', (_, set, state) => {
    const def = recipeState(set, state);
    const draw = () => getRecipe(def.recipe)({ cols: set.cols, rows: set.rows }, def.params ?? {});

    expect(draw()).toEqual(draw());
  });
});
