import { describe, expect, it } from 'vitest';

import { framesEqual } from '../../../src/core/frame';
import { isOneShotState } from '../../../src/core/one-shot';
import { resolve } from '../../../src/core/resolve';
import { stateNames } from '../../../src/core/state-names';
import type { Clip, Frame, IndicatorSet } from '../../../src/core/types';
import { SIGNBOARD_SETS } from '../../../src/presets/wow/signboard';

import { countPeakFlashesPerSecond } from '../flashes';

const WINDOW_MS = 1000;
const BIG_CHANGE_SHARE = 0.2;
const MAX_BIG_CHANGES_PER_SECOND = 6;
const MAX_FLASHES_PER_SECOND = 3;
const ADDED_AT = '2026-09-29';
const BANNED_MARKS = [...[0x2014, 0x2190, 0x2192].map((code) => String.fromCodePoint(code)), '->', '<-'];
const BRAND_NAMES = /claude|anthropic|openai|codex|gemini|cursor/i;

const EXPECTED = [
  { id: 'split-flap', name: 'Split Flap', cols: 9, rows: 9, intent: 'result', transition: 'flip', cross: [] },
  {
    id: 'departure-board',
    name: 'Departure Board',
    cols: 16,
    rows: 7,
    intent: 'progress',
    transition: 'flip',
    cross: [],
  },
  { id: 'decode', name: 'Decode', cols: 7, rows: 7, intent: 'result', transition: 'cut', cross: ['ai'] },
  { id: 'countdown', name: 'Countdown', cols: 5, rows: 7, intent: 'progress', transition: 'cut', cross: [] },
  {
    id: 'ecg-trace',
    name: 'Heartbeat Trace',
    cols: 16,
    rows: 7,
    intent: 'thinking',
    transition: 'cut',
    cross: ['term'],
  },
  { id: 'scope', name: 'Scope', cols: 7, rows: 7, intent: 'thinking', transition: 'cut', cross: ['term'] },
  {
    id: 'spirograph',
    name: 'Spirograph',
    cols: 9,
    rows: 9,
    intent: 'progress',
    transition: 'cut',
    cross: [],
  },
] as const;

const EXPECTED_STATES: Readonly<Record<string, readonly string[]>> = {
  'split-flap': ['idle', 'thinking', 'success', 'error', 'answer-ready'],
  'departure-board': ['idle', 'thinking', 'success', 'error', 'waiting'],
  decode: ['idle', 'thinking', 'success', 'error', 'answer-ready'],
  countdown: ['idle', 'thinking', 'success', 'error', 'retrying'],
  'ecg-trace': ['idle', 'thinking', 'success', 'error', 'waiting', 'overloaded'],
  scope: ['idle', 'thinking', 'success', 'error', 'listening'],
  spirograph: ['idle', 'thinking', 'success', 'error', 'progress'],
};

const STATE_CASES = SIGNBOARD_SETS.flatMap((set) =>
  stateNames(set).map((name) => [`${set.id} ${name}`, set, name] as const),
);

function changedCells(a: Frame, b: Frame): number {
  return a.reduce<number>((count, bit, index) => (bit === b[index] ? count : count + 1), 0);
}

function bigChangeTimes(clip: Clip, isLooping: boolean): number[] {
  const threshold = BIG_CHANGE_SHARE * clip.cols * clip.rows;
  const starts = clip.durations.map((_, index) =>
    clip.durations.slice(0, index).reduce((sum, ms) => sum + ms, 0),
  );
  return clip.frames.flatMap((frame, index) => {
    if (index === 0 && !isLooping) return [];
    const previous = clip.frames[(index - 1 + clip.frames.length) % clip.frames.length];
    return changedCells(previous, frame) >= threshold ? [starts[index]] : [];
  });
}

function peakBigChangesPerSecond(clip: Clip, isLooping: boolean): number {
  const once = bigChangeTimes(clip, isLooping);
  const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);
  const loops = isLooping ? Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1 : 1;
  const times = Array.from({ length: loops }, (_, loop) => once.map((t) => t + loop * loopMs)).flat();
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

function repeatedNeighbours(frames: readonly Frame[], isLooping: boolean): number[] {
  const repeats = frames
    .slice(1)
    .flatMap((frame, index) => (framesEqual(frames[index], frame) ? [index] : []));
  const last = frames.length - 1;
  return isLooping && frames.length > 1 && framesEqual(frames[last], frames[0])
    ? [...repeats, last]
    : repeats;
}

function findSet(id: string): IndicatorSet {
  const set = SIGNBOARD_SETS.find((candidate) => candidate.id === id);
  if (!set) throw new Error(`No signboard set with id ${id}`);
  return set;
}

describe('SIGNBOARD_SETS', () => {
  it('holds the seven signboard sets in proposal order', () => {
    expect(SIGNBOARD_SETS.map((set) => set.id)).toEqual(EXPECTED.map((set) => set.id));
  });

  it.each(EXPECTED.map((expected) => [expected.id, expected] as const))(
    'keeps the metadata of %s',
    (id, expected) => {
      const set = findSet(id);

      expect(set).toMatchObject({
        name: expected.name,
        cols: expected.cols,
        rows: expected.rows,
        intent: expected.intent,
        transition: expected.transition,
        author: 'Flickering Dots',
        source: 'builtin',
        addedAt: ADDED_AT,
      });
      expect(set.collections).toEqual(['signboard', ...expected.cross]);
      expect(stateNames(set)).toEqual(EXPECTED_STATES[id]);
    },
  );

  it('gives every set a one-line description of its own', () => {
    SIGNBOARD_SETS.forEach((set) => expect(set.description ?? '').toMatch(/^[A-Z][^\n]*\.$/));
    expect(new Set(SIGNBOARD_SETS.map((set) => set.description)).size).toBe(SIGNBOARD_SETS.length);
  });

  it('keeps copy free of em dashes, arrows and brand names', () => {
    const copy = JSON.stringify(SIGNBOARD_SETS);

    BANNED_MARKS.forEach((mark) => expect(copy).not.toContain(mark));
    expect(copy).not.toMatch(BRAND_NAMES);
  });
});

describe('signboard states', () => {
  it.each(STATE_CASES)('resolves %s to on and off frames of the set grid', (_label, set, name) => {
    const clip = resolve(set, name);

    expect(clip).toMatchObject({ cols: set.cols, rows: set.rows, state: name });
    expect(clip.frames.length).toBeGreaterThan(0);
    expect(clip.durations).toHaveLength(clip.frames.length);
    clip.frames.forEach((frame) => {
      expect(frame).toHaveLength(set.cols * set.rows);
      frame.forEach((bit) => expect([0, 1]).toContain(bit));
    });
  });

  it.each(STATE_CASES)('keeps %s at most 6 big changes in any second', (_label, set, name) => {
    expect(peakBigChangesPerSecond(resolve(set, name), !isOneShotState(name))).toBeLessThanOrEqual(
      MAX_BIG_CHANGES_PER_SECOND,
    );
  });

  it.each(STATE_CASES)('keeps %s at or under three flashes a second per dot', (_label, set, name) => {
    expect(countPeakFlashesPerSecond(resolve(set, name))).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it.each(STATE_CASES)('never shows the same frame twice in a row in %s', (_label, set, name) => {
    expect(repeatedNeighbours(resolve(set, name).frames, !isOneShotState(name))).toEqual([]);
  });

  it.each(STATE_CASES)('resolves %s to the same frames every time', (_label, set, name) => {
    expect(resolve(set, name)).toEqual(resolve(set, name));
  });
});
