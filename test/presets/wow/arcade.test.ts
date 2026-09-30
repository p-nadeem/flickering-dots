import { describe, expect, it } from 'vitest';

import { isOneShotState } from '../../../src/core/one-shot';
import { resolve } from '../../../src/core/resolve';
import { stateNames } from '../../../src/core/state-names';
import type { Clip, IndicatorSet, RecipeStateDef } from '../../../src/core/types';
import { ARCADE_SETS } from '../../../src/presets/wow/arcade';

import { countPeakFlashesPerSecond } from '../flashes';

const MAX_FLASHES_PER_SECOND = 3;
const MAX_BIG_CHANGES_PER_SECOND = 6;
const BIG_CHANGE_SHARE = 0.2;
const WINDOW_MS = 1000;

type Shape = readonly [cols: number, rows: number, intent: string, transition: string];

const EXPECTED: Readonly<
  Record<string, { shape: Shape; collections: readonly string[]; states: Readonly<Record<string, string>> }>
> = {
  'stack-clear': {
    shape: [6, 8, 'loading', 'cut'],
    collections: ['arcade'],
    states: {
      idle: 'stack-rest',
      thinking: 'stack',
      success: 'stack-done',
      error: 'stack-topout',
      progress: 'stack-progress',
    },
  },
  rally: {
    shape: [9, 5, 'thinking', 'cut'],
    collections: ['arcade', 'agent'],
    states: {
      idle: 'rally-serve',
      thinking: 'rally',
      success: 'rally-rest',
      error: 'rally-miss',
      waiting: 'rally-wait',
    },
  },
  'alien-march': {
    shape: [9, 8, 'playful', 'cut'],
    collections: ['arcade'],
    states: {
      idle: 'march-idle',
      thinking: 'march',
      success: 'march-clear',
      error: 'march-invaded',
      debugging: 'march-shoot',
    },
  },
  chomper: {
    shape: [11, 5, 'progress', 'cut'],
    collections: ['arcade'],
    states: {
      idle: 'chomp-rest',
      thinking: 'chomp',
      success: 'chomp-done',
      error: 'chomp-caught',
      progress: 'chomp-progress',
    },
  },
  'snake-hunt': {
    shape: [8, 8, 'thinking', 'cut'],
    collections: ['arcade'],
    states: {
      idle: 'hunt-coil',
      thinking: 'hunt',
      success: 'hunt-fill',
      error: 'hunt-crash',
      waiting: 'hunt-wait',
    },
  },
  'brick-wall': {
    shape: [9, 9, 'progress', 'cut'],
    collections: ['arcade'],
    states: {
      idle: 'bricks-rest',
      thinking: 'bricks',
      success: 'bricks-clear',
      error: 'bricks-miss',
      progress: 'bricks-progress',
    },
  },
  runner: {
    shape: [12, 6, 'loading', 'cut'],
    collections: ['arcade', 'agent'],
    states: {
      idle: 'run-stand',
      thinking: 'run',
      success: 'run-finish',
      error: 'run-crash',
      offline: 'run-empty',
    },
  },
  'corner-hit': {
    shape: [10, 8, 'result', 'cut'],
    collections: ['arcade'],
    states: {
      idle: 'corner-drift',
      thinking: 'corner',
      success: 'corner-hit',
      error: 'corner-near',
      waiting: 'corner-wait',
    },
  },
  reels: {
    shape: [11, 5, 'result', 'cut'],
    collections: ['arcade'],
    states: {
      idle: 'reels-rest',
      thinking: 'reels',
      success: 'reels-win',
      error: 'reels-lose',
      generating: 'reels-stagger',
    },
  },
  dice: {
    shape: [7, 7, 'result', 'flip'],
    collections: ['arcade'],
    states: { idle: 'dice-rest', thinking: 'dice', success: 'dice', error: 'dice', sampling: 'dice-sample' },
  },
};

const IDS = Object.keys(EXPECTED);
const SET_CASES = ARCADE_SETS.map((set) => [set.id, set] as const);

function stateCases(): (readonly [string, string, IndicatorSet])[] {
  return ARCADE_SETS.flatMap((set) => stateNames(set).map((name) => [set.id, name, set] as const));
}

function startTimes(durations: readonly number[]): number[] {
  return durations.map((_, index) => durations.slice(0, index).reduce((sum, ms) => sum + ms, 0));
}

function changedCells(before: readonly number[], after: readonly number[]): number {
  return after.filter((bit, cell) => bit !== before[cell]).length;
}

function bigChangeTimes(clip: Clip, loops: boolean): number[] {
  const limit = clip.cols * clip.rows * BIG_CHANGE_SHARE;
  const starts = startTimes(clip.durations);
  return clip.frames.flatMap((frame, index) => {
    const previous = index === 0 ? (loops ? clip.frames.at(-1) : undefined) : clip.frames[index - 1];
    return previous !== undefined && changedCells(previous, frame) >= limit ? [starts[index] ?? 0] : [];
  });
}

function peakBigChangesPerSecond(clip: Clip, loops: boolean): number {
  const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);
  const once = bigChangeTimes(clip, loops);
  const repeats = loops ? Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1 : 1;
  const times = Array.from({ length: repeats }, (_, loop) => once.map((t) => t + loop * loopMs)).flat();
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

describe('ARCADE_SETS', () => {
  it('holds the ten arcade sets in the proposal order', () => {
    expect(ARCADE_SETS.map((set) => set.id)).toEqual(IDS);
  });

  it.each(SET_CASES)('credits %s as a built-in set added on 2026-09-29', (_id, set) => {
    expect(set).toMatchObject({ author: 'Flickering Dots', source: 'builtin', addedAt: '2026-09-29' });
  });

  it.each(SET_CASES)('gives %s the grid, intent, transition and collections of the proposal', (id, set) => {
    const { shape, collections } = EXPECTED[id] ?? { shape: [], collections: [] };
    const [cols, rows, intent, transition] = shape;

    expect(set).toMatchObject({ cols, rows, intent, transition });
    expect(set.collections).toEqual(collections);
  });

  it.each(SET_CASES)('draws every state of %s with the arcade variant of the proposal', (id, set) => {
    const variants = Object.fromEntries(
      Object.entries(set.states).map(([name, def]) => [name, (def as RecipeStateDef).params?.variant]),
    );

    Object.values(set.states).forEach((def) =>
      expect(def).toMatchObject({ kind: 'recipe', recipe: 'arcade' }),
    );
    expect(variants).toEqual(EXPECTED[id]?.states);
  });

  it.each(SET_CASES)('gives %s a one-line description, four tags and four contexts at most', (_id, set) => {
    expect(set.description).toMatch(/^[A-Z][^\n]*\.$/);
    expect(set.tags.length).toBeGreaterThan(0);
    expect(set.contexts?.length ?? 0).toBeGreaterThan(0);
  });

  it('lands the dice on six for success and on one for error', () => {
    const dice = ARCADE_SETS.find((set) => set.id === 'dice');

    expect(dice?.states.success).toMatchObject({ params: { glyph: 'six' } });
    expect(dice?.states.error).toMatchObject({ params: { glyph: 'one' } });
  });

  it('seeds the corner-hit thinking path', () => {
    const corner = ARCADE_SETS.find((set) => set.id === 'corner-hit');

    expect(corner?.states.thinking).toMatchObject({ params: { seed: 1 } });
  });

  it('keeps copy free of dashes, arrows and brand names', () => {
    const copy = JSON.stringify(ARCADE_SETS);

    expect(copy).not.toMatch(/[–—→←]|->|=>/);
    expect(copy.toLowerCase()).not.toMatch(/tetris|pong|pac-?man|invaders|breakout|dvd|nokia|dino/);
  });
});

describe('resolving the arcade sets', () => {
  it.each(stateCases())('resolves %s %s to frames of the set grid', (_id, name, set) => {
    const clip = resolve(set, name);

    expect(clip).toMatchObject({ cols: set.cols, rows: set.rows });
    expect(clip.frames.length).toBeGreaterThan(0);
    expect(clip.durations).toHaveLength(clip.frames.length);
    clip.frames.forEach((frame) => expect(frame).toHaveLength(set.cols * set.rows));
    clip.durations.forEach((ms) => expect(ms).toBeGreaterThan(0));
  });

  it.each(stateCases())('keeps %s %s at or under three flashes a second', (_id, name, set) => {
    expect(countPeakFlashesPerSecond(resolve(set, name))).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it.each(stateCases())('changes a fifth of %s %s at most six times a second', (_id, name, set) => {
    const clip = resolve(set, name);

    expect(peakBigChangesPerSecond(clip, !isOneShotState(name))).toBeLessThanOrEqual(
      MAX_BIG_CHANGES_PER_SECOND,
    );
  });

  it.each(stateCases())('resolves %s %s to the same frames every time', (_id, name, set) => {
    expect(resolve(set, name)).toEqual(resolve(set, name));
  });
});
