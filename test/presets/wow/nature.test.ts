import { describe, expect, it } from 'vitest';

import { isOneShotState } from '../../../src/core/one-shot';
import { resolve } from '../../../src/core/resolve';
import { stateNames } from '../../../src/core/state-names';
import type { Clip, Frame, IndicatorSet } from '../../../src/core/types';
import { NATURE_SETS } from '../../../src/presets/wow/nature';

const EXPECTED_IDS = [
  'campfire',
  'fireworks',
  'fountain',
  'pendulum-wave',
  'cradle',
  'hourglass',
  'slosh',
  'droplet',
  'lightning',
  'aurora',
  'snowfall',
  'orrery',
];

const FLASH_SHARE = 0.2;
const MAX_FLASHES_PER_WINDOW = 6;
const WINDOW_MS = 1000;
const BANNED_COPY = /[–—←-⇿⟰-⟿⤀-⥿]|->|<-|=>|\p{Extended_Pictographic}/u;
const BRAND_NAMES = /claude|anthropic|openai|codex|gemini|cursor/i;
const MOTION_ONLY_STATES = new Set(['pendulum-wave thinking']);

const SETS: readonly IndicatorSet[] = NATURE_SETS;
const STATE_CASES = SETS.flatMap((set) => stateNames(set).map((state): [string, string] => [set.id, state]));

function getSet(id: string): IndicatorSet {
  const set = SETS.find((candidate) => candidate.id === id);
  if (set === undefined) throw new Error(`missing set ${id}`);
  return set;
}

type StepSize = (previous: Frame, next: Frame) => number;

function countLit(frame: Frame): number {
  return frame.reduce<number>((sum, cell) => sum + cell, 0);
}

const countChanged: StepSize = (a, b) =>
  a.reduce<number>((sum, cell, index) => sum + (cell === b[index] ? 0 : 1), 0);

const countLitStep: StepSize = (a, b) => Math.abs(countLit(a) - countLit(b));

function getFlashTimes(clip: Clip, isLooping: boolean, stepSize: StepSize): number[] {
  const threshold = FLASH_SHARE * clip.cols * clip.rows;
  const starts = clip.durations.map((_, index) =>
    clip.durations.slice(0, index).reduce((sum, ms) => sum + ms, 0),
  );
  const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);
  const steps = clip.frames.flatMap((frame, index) => {
    if (index === 0 && !isLooping) return [];
    const previous = clip.frames[(index - 1 + clip.frames.length) % clip.frames.length] ?? frame;
    const at = index === 0 ? loopMs : (starts[index] ?? 0);
    return stepSize(previous, frame) >= threshold ? [at] : [];
  });
  if (!isLooping) return steps;
  const loops = Math.ceil(WINDOW_MS / Math.max(1, loopMs)) + 1;
  return Array.from({ length: loops }, (_, loop) => steps.map((t) => t + loop * loopMs)).flat();
}

function getPeakFlashes(clip: Clip, isLooping: boolean, stepSize: StepSize): number {
  const times = getFlashTimes(clip, isLooping, stepSize);
  return Math.max(
    0,
    ...times.map((start) => times.filter((t) => t >= start && t < start + WINDOW_MS).length),
  );
}

describe('NATURE_SETS', () => {
  it('lists the twelve nature sets in proposal order', () => {
    expect(SETS.map((set) => set.id)).toEqual(EXPECTED_IDS);
  });

  it.each(EXPECTED_IDS)('marks %s as a builtin nature set added on 2026-09-29', (id) => {
    const set = getSet(id);
    expect(set.author).toBe('Flickering Dots');
    expect(set.source).toBe('builtin');
    expect(set.addedAt).toBe('2026-09-29');
    expect(set.collections?.[0]).toBe('nature');
    expect(Object.hasOwn(set.states, 'thinking')).toBe(true);
  });

  it('cross-lists only the cradle, in the terminal collection', () => {
    const crossListed = SETS.filter((set) => (set.collections?.length ?? 0) > 1);
    expect(crossListed.map((set) => [set.id, set.collections])).toEqual([['cradle', ['nature', 'term']]]);
  });

  it.each(EXPECTED_IDS)('keeps the copy of %s free of dashes, arrows, emoji and brands', (id) => {
    const set = getSet(id);
    const copy = [set.name, set.description ?? '', ...set.tags, ...Object.keys(set.states)];
    copy.forEach((text) => {
      expect(text).not.toMatch(BANNED_COPY);
      expect(text).not.toMatch(BRAND_NAMES);
    });
  });
});

describe.each(STATE_CASES)('%s %s', (id, state) => {
  const set = getSet(id);
  const clip = resolve(set, state);

  it('renders lit frames on the set grid', () => {
    expect(clip.state).toBe(state);
    expect(clip.frames.length).toBeGreaterThan(0);
    expect(clip.frames.every((frame) => frame.length === set.cols * set.rows)).toBe(true);
    expect(clip.frames.some((frame) => frame.some((cell) => cell === 1))).toBe(true);
  });

  it('renders the same frames every time', () => {
    expect(resolve(set, state).frames).toEqual(clip.frames);
  });

  const isLooping = !isOneShotState(state);

  it('steps the lit count by 20 percent of the grid at most 6 times in any second', () => {
    expect(getPeakFlashes(clip, isLooping, countLitStep)).toBeLessThanOrEqual(MAX_FLASHES_PER_WINDOW);
  });

  if (MOTION_ONLY_STATES.has(`${id} ${state}`)) {
    it('moves dots without ever changing how many are lit', () => {
      const counts = new Set(clip.frames.map(countLit));
      expect(counts.size).toBe(1);
    });
    return;
  }

  it('changes 20 percent of the grid at most 6 times in any second', () => {
    expect(getPeakFlashes(clip, isLooping, countChanged)).toBeLessThanOrEqual(MAX_FLASHES_PER_WINDOW);
  });
});
