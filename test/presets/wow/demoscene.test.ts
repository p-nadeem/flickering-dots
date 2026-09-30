import { describe, expect, it } from 'vitest';

import { resolve } from '../../../src/core/resolve';
import { isOneShotState } from '../../../src/core/one-shot';
import { stateNames } from '../../../src/core/state-names';
import type { Clip, Frame, IndicatorSet } from '../../../src/core/types';
import { DEMOSCENE_SETS } from '../../../src/presets/wow/demoscene';

import { countPeakFlashesPerSecond } from '../flashes';

const WINDOW_MS = 1000;
const MAX_BIG_CHANGES_PER_WINDOW = 6;
const BIG_CHANGE_SHARE = 0.2;
const MAX_CELL_FLASHES_PER_SECOND = 3;

interface Expected {
  id: string;
  cols: number;
  rows: number;
  intent: string;
  transition: string;
  states: readonly string[];
}

const EXPECTED: readonly Expected[] = [
  {
    id: 'lava-lamp',
    cols: 12,
    rows: 8,
    intent: 'thinking',
    transition: 'crossfade',
    states: ['idle', 'thinking', 'success', 'error', 'listening'],
  },
  {
    id: 'corridor',
    cols: 9,
    rows: 9,
    intent: 'loading',
    transition: 'flip',
    states: ['idle', 'thinking', 'success', 'error', 'connecting'],
  },
  {
    id: 'hyperspace',
    cols: 11,
    rows: 11,
    intent: 'loading',
    transition: 'crossfade',
    states: ['idle', 'thinking', 'success', 'error'],
  },
  {
    id: 'spiral-wave',
    cols: 11,
    rows: 11,
    intent: 'thinking',
    transition: 'flip',
    states: ['idle', 'thinking', 'success', 'error', 'deep-thinking'],
  },
  {
    id: 'sandplate',
    cols: 11,
    rows: 11,
    intent: 'thinking',
    transition: 'cut',
    states: ['idle', 'thinking', 'success', 'error'],
  },
  {
    id: 'vector-balls',
    cols: 16,
    rows: 16,
    intent: 'thinking',
    transition: 'crossfade',
    states: ['idle', 'thinking', 'success', 'error'],
  },
];

function changedCells(a: Frame, b: Frame): number {
  return a.reduce<number>((sum, bit, index) => (bit === b[index] ? sum : sum + 1), 0);
}

function bigChangeTimes(clip: Clip, isLoop: boolean): number[] {
  const limit = BIG_CHANGE_SHARE * clip.cols * clip.rows;
  const starts = clip.durations.map((_, index) =>
    clip.durations.slice(0, index).reduce((s, ms) => s + ms, 0),
  );
  const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);
  const once = clip.frames.flatMap((frame, index) => {
    if (index === 0 && !isLoop) return [];
    const previous = clip.frames[(index - 1 + clip.frames.length) % clip.frames.length];
    return changedCells(previous, frame) >= limit ? [starts[index] ?? 0] : [];
  });
  if (!isLoop) return once;
  const loops = Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1;
  return Array.from({ length: loops }, (_, loop) => once.map((t) => t + loop * loopMs)).flat();
}

function busiestWindow(times: readonly number[]): number {
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

function findSet(id: string): IndicatorSet {
  const set = DEMOSCENE_SETS.find((candidate) => candidate.id === id);
  if (!set) throw new Error(`No demoscene set ${id}`);
  return set;
}

const STATE_CASES = EXPECTED.flatMap((expected) =>
  expected.states.map((state) => [expected.id, state] as const),
);

describe('DEMOSCENE_SETS', () => {
  it('lists the six demoscene sets in proposal order', () => {
    expect(DEMOSCENE_SETS.map((set) => set.id)).toEqual(EXPECTED.map((expected) => expected.id));
  });

  it.each(EXPECTED.map((expected) => [expected.id, expected] as const))(
    '%s has the proposed grid, intent, transition and states',
    (id, expected) => {
      const set = findSet(id);

      expect([set.cols, set.rows, set.intent, set.transition]).toEqual([
        expected.cols,
        expected.rows,
        expected.intent,
        expected.transition,
      ]);
      expect([...stateNames(set)]).toEqual(expected.states);
    },
  );

  it.each(DEMOSCENE_SETS.map((set) => [set.id, set] as const))(
    '%s is a built-in demoscene set with a description, tags and contexts',
    (_, set) => {
      expect(set.author).toBe('Flickering Dots');
      expect(set.source).toBe('builtin');
      expect(set.addedAt).toBe('2026-09-29');
      expect(set.collections).toContain('demoscene');
      expect(set.description?.length ?? 0).toBeGreaterThan(20);
      expect(set.tags.length).toBeGreaterThan(0);
      expect(set.contexts?.length ?? 0).toBeGreaterThan(0);
    },
  );

  it.each(STATE_CASES)('%s %s renders lit frames of the set grid', (id, state) => {
    const set = findSet(id);
    const clip = resolve(set, state);

    expect(clip.state).toBe(state);
    expect(clip.frames.length).toBeGreaterThan(0);
    expect(clip.durations).toHaveLength(clip.frames.length);
    clip.frames.forEach((frame) => expect(frame).toHaveLength(set.cols * set.rows));
    expect(clip.frames.some((frame) => frame.includes(1))).toBe(true);
  });

  it.each(STATE_CASES)('%s %s renders the same frames every time', (id, state) => {
    const set = findSet(id);

    expect(resolve(set, state).frames).toEqual(resolve(set, state).frames);
  });

  it.each(STATE_CASES)('%s %s changes 20 percent of the grid at most 6 times a second', (id, state) => {
    const clip = resolve(findSet(id), state);

    expect(busiestWindow(bigChangeTimes(clip, !isOneShotState(state)))).toBeLessThanOrEqual(
      MAX_BIG_CHANGES_PER_WINDOW,
    );
  });

  it.each(STATE_CASES)('%s %s turns any one dot on at most 3 times a second', (id, state) => {
    expect(countPeakFlashesPerSecond(resolve(findSet(id), state))).toBeLessThanOrEqual(
      MAX_CELL_FLASHES_PER_SECOND,
    );
  });

  it.each(STATE_CASES.filter(([, state]) => !isOneShotState(state)))(
    '%s %s loops without a jump at the seam',
    (id, state) => {
      const { frames } = resolve(findSet(id), state);
      const inner = frames.slice(1).map((frame, index) => changedCells(frames[index], frame));

      expect(changedCells(frames[frames.length - 1], frames[0])).toBeLessThanOrEqual(Math.max(0, ...inner));
    },
  );
});
