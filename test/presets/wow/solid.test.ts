import { describe, expect, it } from 'vitest';

import { isOneShotState } from '../../../src/core/one-shot';
import { resolve } from '../../../src/core/resolve';
import type { Clip, Frame } from '../../../src/core/types';
import { SOLID_SETS } from '../../../src/presets/wow/solid';

const EXPECTED = [
  { id: 'cube', cols: 12, rows: 12, intent: 'thinking', transition: 'flip' },
  { id: 'globe', cols: 11, rows: 11, intent: 'loading', transition: 'crossfade' },
  { id: 'donut', cols: 16, rows: 16, intent: 'thinking', transition: 'crossfade' },
  { id: 'helix', cols: 16, rows: 9, intent: 'thinking', transition: 'flip' },
  { id: 'ridgeline', cols: 16, rows: 10, intent: 'thinking', transition: 'crossfade' },
  { id: 'coin-flip', cols: 7, rows: 7, intent: 'result', transition: 'flip' },
];

const EXPECTED_STATES: Readonly<Record<string, readonly string[]>> = {
  cube: ['idle', 'thinking', 'waiting', 'success', 'error'],
  globe: ['idle', 'thinking', 'listening', 'success', 'error'],
  donut: ['idle', 'thinking', 'cooking', 'success', 'error'],
  helix: ['idle', 'thinking', 'indexing', 'success', 'error'],
  ridgeline: ['idle', 'thinking', 'listening', 'success', 'error'],
  'coin-flip': ['idle', 'thinking', 'deciding', 'success', 'error'],
};

const LARGE_CHANGE_SHARE = 0.2;
const MAX_LARGE_CHANGES_PER_SECOND = 6;
const WINDOW_MS = 1000;
const BANNED_COPY = /[–—←-⇿⟰-⟿⤀-⥿]|->|<-|=>|\p{Extended_Pictographic}/u;

const CONSTANT_LIT_SCROLLS = new Set(['helix thinking', 'helix indexing']);

type ChangeSize = (a: Frame, b: Frame) => number;

function countLit(frame: Frame): number {
  return frame.filter((cell) => cell === 1).length;
}

const changedShare: ChangeSize = (a, b) => a.filter((cell, index) => cell !== b[index]).length / a.length;

const litShare: ChangeSize = (a, b) => Math.abs(countLit(a) - countLit(b)) / a.length;

function largeChangeTimes(clip: Clip, isLooping: boolean, size: ChangeSize): number[] {
  const loops = isLooping ? Math.ceil(WINDOW_MS / clip.durations.reduce((s, ms) => s + ms, 0)) + 1 : 1;
  const count = clip.frames.length;
  const steps = Array.from({ length: count * loops }, (_, step) => step).filter(
    (step) => isLooping || step < count - 1,
  );
  return steps.reduce<{ at: number; times: number[] }>(
    (acc, step) => {
      const at = acc.at + (clip.durations[step % count] ?? 0);
      const from = clip.frames[step % count] ?? [];
      const to = clip.frames[(step + 1) % count] ?? [];
      const isLarge = size(from, to) >= LARGE_CHANGE_SHARE;
      return { at, times: isLarge ? [...acc.times, at] : acc.times };
    },
    { at: 0, times: [] },
  ).times;
}

function peakLargeChanges(clip: Clip, isLooping: boolean, size: ChangeSize): number {
  const times = largeChangeTimes(clip, isLooping, size);
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

const STATE_CASES = SOLID_SETS.flatMap((set) =>
  Object.keys(set.states).map((state) => [set.id, state] as const),
);

function setById(id: string) {
  const set = SOLID_SETS.find((candidate) => candidate.id === id);
  if (set === undefined) throw new Error(`missing set ${id}`);
  return set;
}

describe('SOLID_SETS', () => {
  it('lists the six 3D sets with their proposal grid, intent and transition', () => {
    expect(
      SOLID_SETS.map(({ id, cols, rows, intent, transition }) => ({ id, cols, rows, intent, transition })),
    ).toEqual(EXPECTED);
  });

  it.each(SOLID_SETS.map((set) => [set.id, set] as const))(
    '%s is a builtin in the solid collection',
    (_, set) => {
      expect(set.author).toBe('Flickering Dots');
      expect(set.source).toBe('builtin');
      expect(set.addedAt).toBe('2026-09-29');
      expect(set.collections).toEqual(['solid']);
      expect(Object.keys(set.states)).toEqual(EXPECTED_STATES[set.id]);
      expect(set.tags).toHaveLength(4);
    },
  );

  it('keeps names, descriptions and tags free of dashes, arrows and emoji', () => {
    const copy = SOLID_SETS.flatMap((set) => [set.name, set.description, ...set.tags]);
    expect(copy.filter((text) => BANNED_COPY.test(text))).toEqual([]);
  });

  it.each(STATE_CASES)('%s %s resolves to on or off frames at the set grid', (id, state) => {
    const set = setById(id);
    const clip = resolve(set, state);
    expect(clip.frames.length).toBeGreaterThan(0);
    expect(clip.durations).toHaveLength(clip.frames.length);
    expect(clip.frames.every((frame) => frame.length === set.cols * set.rows)).toBe(true);
    expect(clip.frames.every((frame) => frame.every((cell) => cell === 0 || cell === 1))).toBe(true);
    expect(clip.frames.some((frame) => frame.includes(1))).toBe(true);
    expect(resolve(set, state)).toEqual(clip);
  });

  it.each(STATE_CASES)('%s %s steps its lit count by a fifth at most 6 times a second', (id, state) => {
    const clip = resolve(setById(id), state);
    const peak = peakLargeChanges(clip, !isOneShotState(state), litShare);
    expect(peak).toBeLessThanOrEqual(MAX_LARGE_CHANGES_PER_SECOND);
  });

  it.each(STATE_CASES.filter(([id, state]) => !CONSTANT_LIT_SCROLLS.has(`${id} ${state}`)))(
    '%s %s changes a fifth of the grid at most 6 times a second',
    (id, state) => {
      const clip = resolve(setById(id), state);
      const peak = peakLargeChanges(clip, !isOneShotState(state), changedShare);
      expect(peak).toBeLessThanOrEqual(MAX_LARGE_CHANGES_PER_SECOND);
    },
  );

  it.each([...CONSTANT_LIT_SCROLLS].map((name) => name.split(' ')))(
    '%s %s scrolls with a constant lit count instead of flashing',
    (id = '', state = '') => {
      const clip = resolve(setById(id), state);
      expect(new Set(clip.frames.map(countLit)).size).toBe(1);
    },
  );
});
