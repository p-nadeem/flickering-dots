import { describe, expect, it } from 'vitest';

import { GRID_MAX, GRID_MIN } from '../../src/index';
import { resolve } from '../../src/core/resolve';
import { stateNames } from '../../src/core/state-names';
import type { IndicatorSet } from '../../src/core/types';
import { COLLECTIONS, getPreset, PRESETS } from '../../src/presets';
import { AILIFE_SETS } from '../../src/presets/wow/ai-life';
import { ARCADE_SETS } from '../../src/presets/wow/arcade';
import { DEMOSCENE_SETS } from '../../src/presets/wow/demoscene';
import { EMERGENCE_SETS } from '../../src/presets/wow/emergence';
import { NATURE_SETS } from '../../src/presets/wow/nature';
import { SIGNBOARD_SETS } from '../../src/presets/wow/signboard';
import { SOLID_SETS } from '../../src/presets/wow/solid';
import { MIN_FRAME_MS } from '../../src/player/timing';

import {
  NEW_COLLECTION_MEMBERS,
  NEW_COLLECTIONS,
  ORIGINAL_SET_COUNT,
  WOW_FEATURED_IDS,
  WOW_PROPOSAL_IDS,
  WOW_SET_COUNT,
} from './wow-catalog';

const TOTAL_SET_COUNT = ORIGINAL_SET_COUNT + WOW_SET_COUNT;
const BRAND_NAMES =
  /claude|anthropic|openai|codex|gemini|cursor|chatgpt|copilot|nintendo|atari|pac-?man|tetris/i;
const WOW_ADDED_AT = '2026-09-29';
const WOW_SOURCES: readonly (readonly IndicatorSet[])[] = [
  DEMOSCENE_SETS,
  SOLID_SETS,
  ARCADE_SETS,
  NATURE_SETS,
  EMERGENCE_SETS,
  AILIFE_SETS,
  SIGNBOARD_SETS,
];
const WOW_SETS = PRESETS.slice(ORIGINAL_SET_COUNT);
const SET_CASES = PRESETS.map((set) => [set.id, set] as const);

function getCopy(set: IndicatorSet): string[] {
  return [set.id, set.name, set.description ?? '', ...set.tags, ...stateNames(set)];
}

describe('the full catalogue', () => {
  it('holds the 29 original sets and the 56 wow sets', () => {
    expect(PRESETS).toHaveLength(TOTAL_SET_COUNT);
  });

  it('gives every set a unique id', () => {
    expect(new Set(PRESETS.map((set) => set.id)).size).toBe(TOTAL_SET_COUNT);
  });

  it.each(SET_CASES)('keeps the grid of %s between 3 and 16 on both sides', (_id, set) => {
    [set.cols, set.rows].forEach((side) => {
      expect(Number.isInteger(side)).toBe(true);
      expect(side).toBeGreaterThanOrEqual(GRID_MIN);
      expect(side).toBeLessThanOrEqual(GRID_MAX);
    });
  });

  it.each(SET_CASES)(
    'holds every frame of %s for whole milliseconds, at least one display frame',
    (_id, set) => {
      stateNames(set).forEach((state) => {
        resolve(set, state).durations.forEach((ms) => {
          expect(Number.isInteger(ms)).toBe(true);
          expect(ms).toBeGreaterThanOrEqual(MIN_FRAME_MS);
        });
      });
    },
  );

  it.each(SET_CASES)('keeps brand names out of the copy of %s', (_id, set) => {
    getCopy(set).forEach((text) => expect(text).not.toMatch(BRAND_NAMES));
  });

  it('keeps brand names out of every collection', () => {
    COLLECTIONS.forEach((collection) => {
      [collection.id, collection.name, collection.description].forEach((text) =>
        expect(text).not.toMatch(BRAND_NAMES),
      );
    });
  });
});

describe('the wow sets', () => {
  it('merges every set of the seven wow files exactly once', () => {
    const merged = WOW_SOURCES.flat().map((set) => set.id);

    expect(merged).toEqual(WOW_PROPOSAL_IDS);
    expect([...WOW_SETS.map((set) => set.id)].sort()).toEqual([...merged].sort());
  });

  it('follows the 29 original sets, ordered by wow score with ties in proposal order', () => {
    expect(WOW_SETS.map((set) => set.id)).toEqual(WOW_FEATURED_IDS);
  });

  it('keeps the set objects of the wow files unchanged', () => {
    WOW_SOURCES.flat().forEach((set) => expect(getPreset(set.id)).toBe(set));
  });

  it.each(WOW_SETS.map((set) => [set.id, set] as const))(
    'credits %s to Flickering Dots as a built-in set added today',
    (_id, set) => {
      expect(set).toMatchObject({ author: 'Flickering Dots', source: 'builtin', addedAt: WOW_ADDED_AT });
      expect(Object.hasOwn(set.states, 'thinking')).toBe(true);
    },
  );
});

describe('the wow collections', () => {
  it('follows the four original collections with the seven new ones in proposal order', () => {
    expect(COLLECTIONS.slice(-NEW_COLLECTIONS.length)).toEqual(NEW_COLLECTIONS);
  });

  it.each(NEW_COLLECTIONS.map((collection) => [collection.id] as const))(
    'files the approved members under %s in Featured order',
    (id) => {
      const members = NEW_COLLECTION_MEMBERS[id] ?? [];
      const filed = PRESETS.filter((set) => set.collections?.includes(id)).map((set) => set.id);

      expect(members.length).toBeGreaterThan(0);
      expect(filed).toEqual(WOW_FEATURED_IDS.filter((setId) => members.includes(setId)));
    },
  );

  it('files every wow set under exactly one new collection, first in its list', () => {
    const newIds = new Set(NEW_COLLECTIONS.map((collection) => collection.id));

    WOW_SETS.forEach((set) => {
      const own = (set.collections ?? []).filter((id) => newIds.has(id));

      expect(own).toHaveLength(1);
      expect(set.collections?.[0]).toBe(own[0]);
    });
  });
});
