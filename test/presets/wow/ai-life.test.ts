import { describe, expect, it } from 'vitest';

import { isOneShotState } from '../../../src/core/one-shot';
import { resolve } from '../../../src/core/resolve';
import { stateNames } from '../../../src/core/state-names';
import type { Clip, Frame, IndicatorSet } from '../../../src/core/types';
import { AILIFE_SETS } from '../../../src/presets/wow/ai-life';

import { countPeakFlashesPerSecond } from '../flashes';
import { CRITTER_STATE_NAMES, EXPECTED_AILIFE } from './ai-life-cases';

const MAX_FLASHES_PER_SECOND = 3;
const MAX_BIG_CHANGES_PER_WINDOW = 6;
const BIG_CHANGE_SHARE = 0.2;
const WINDOW_MS = 1000;
const ADDED_AT = '2026-09-29';
const DESCRIPTION_PATTERN = /^[A-Z][^\n]*\.$/;
const BANNED_COPY = /[–—←-⇿]|->|<-|=>/;

const SET_CASES = AILIFE_SETS.map((set) => [set.id, set] as const);
const STATE_CASES = AILIFE_SETS.flatMap((set) =>
  stateNames(set).map((name) => [`${set.id} ${name}`, set, name] as const),
);

function changedCells(a: Frame, b: Frame): number {
  return a.reduce<number>((sum, bit, index) => (bit === b[index] ? sum : sum + 1), 0);
}

function bigChangeTimes(clip: Clip, isLooping: boolean): number[] {
  const threshold = BIG_CHANGE_SHARE * clip.cols * clip.rows;
  const starts = clip.durations.map((_, index) =>
    clip.durations.slice(0, index).reduce((sum, ms) => sum + ms, 0),
  );
  const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);
  const once = clip.frames.flatMap((frame, index) => {
    if (index === 0) return [];
    return changedCells(clip.frames[index - 1], frame) >= threshold ? [starts[index]] : [];
  });
  if (!isLooping) return once;
  const seam = changedCells(clip.frames[clip.frames.length - 1], clip.frames[0]) >= threshold;
  const perLoop = seam ? [...once, loopMs] : once;
  const loops = Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1;
  return Array.from({ length: loops }, (_, loop) => perLoop.map((t) => t + loop * loopMs)).flat();
}

function peakBigChanges(clip: Clip, isLooping: boolean): number {
  const times = bigChangeTimes(clip, isLooping);
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

function findSet(id: string): IndicatorSet {
  const set = AILIFE_SETS.find((candidate) => candidate.id === id);
  if (!set) throw new Error(`No AI life set with id ${id}`);
  return set;
}

describe('AILIFE_SETS', () => {
  it('holds the seven AI life sets in the proposal order', () => {
    expect(AILIFE_SETS.map((set) => set.id)).toEqual(EXPECTED_AILIFE.map((set) => set.id));
  });

  it.each(EXPECTED_AILIFE.map((set) => [set.id, set] as const))(
    'keeps the metadata of %s',
    (id, expected) => {
      const { states: _states, ...metadata } = expected;

      expect(findSet(id)).toMatchObject({
        ...metadata,
        author: 'Flickering Dots',
        source: 'builtin',
        addedAt: ADDED_AT,
      });
    },
  );

  it.each(EXPECTED_AILIFE.filter((set) => set.id !== 'critter').map((set) => [set.id, set] as const))(
    'defines the recipe states of %s in order',
    (id, expected) => {
      const set = findSet(id);

      expect(set.states).toEqual(expected.states);
      expect(Object.keys(set.states)).toEqual(Object.keys(expected.states));
    },
  );

  it('authors every critter state as explicit frames', () => {
    const critter = findSet('critter');

    expect(Object.keys(critter.states)).toEqual(CRITTER_STATE_NAMES);
    Object.values(critter.states).forEach((state) => expect(state.kind).toBe('frames'));
  });

  it.each(SET_CASES)('gives %s a one-line description in plain copy', (_id, set) => {
    const description = set.description ?? '';

    expect(description).toMatch(DESCRIPTION_PATTERN);
    expect(description).not.toMatch(BANNED_COPY);
  });
});

describe('resolving the AI life sets', () => {
  it.each(STATE_CASES)('resolves %s to full frames of the set grid', (_label, set, name) => {
    const clip = resolve(set, name);

    expect(clip).toMatchObject({ cols: set.cols, rows: set.rows });
    expect(clip.frames.length).toBeGreaterThan(0);
    expect(clip.durations).toHaveLength(clip.frames.length);
    clip.frames.forEach((frame) => expect(frame).toHaveLength(set.cols * set.rows));
    clip.durations.forEach((ms) => expect(ms).toBeGreaterThan(0));
  });

  it.each(STATE_CASES)('keeps %s at or under three flashes a second per dot', (_label, set, name) => {
    expect(countPeakFlashesPerSecond(resolve(set, name))).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it.each(STATE_CASES)('keeps %s to six large changes in any second', (_label, set, name) => {
    const clip = resolve(set, name);

    expect(peakBigChanges(clip, !isOneShotState(name))).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_WINDOW);
  });
});
