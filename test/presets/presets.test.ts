import { describe, expect, it } from 'vitest';

import { decodeSet, encodeSet } from '../../src/core/codec';
import { resolve } from '../../src/core/resolve';
import { stateNames } from '../../src/core/state-names';
import type { IndicatorSet } from '../../src/core/types';
import { getPreset, PRESETS } from '../../src/presets';

import { CATALOG_SETS } from './catalog-sets';
import { countPeakFlashesPerSecond } from './flashes';
import { ORIGINAL_SET_COUNT, WOW_SET_COUNT } from './wow-catalog';

const PRESET_COUNT = ORIGINAL_SET_COUNT + WOW_SET_COUNT;
const MAX_FLASHES_PER_SECOND = 3;
const PROTOTYPE_MINE_IDS = ['mine-a', 'mine-b'];
const REMOVED_IDS = ['dots3s', 'checkonly', 'term5', 'static', 'scan', 'wave'];
const PRESET_CASES = PRESETS.map((preset) => [preset.id, preset] as const);
const ORIGINAL_CASES = PRESET_CASES.slice(0, ORIGINAL_SET_COUNT);
const ORIGINAL_PRESETS = PRESETS.slice(0, ORIGINAL_SET_COUNT);
const CATALOG_CASES = CATALOG_SETS.map((expected, index) => [expected.id, expected, index] as const);

function findPreset(id: string): IndicatorSet {
  const preset = PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`No preset with id ${id}`);
  return preset;
}

describe('PRESETS', () => {
  it('holds the 29 original sets and the 56 wow sets', () => {
    expect(PRESETS).toHaveLength(PRESET_COUNT);
  });

  it('gives every preset a unique id', () => {
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESET_COUNT);
  });

  it('keeps the approved catalog order first, which is the Featured order', () => {
    expect(ORIGINAL_PRESETS.map((preset) => preset.id)).toEqual(CATALOG_SETS.map((expected) => expected.id));
  });

  it('files the original sets under their intents in the approved counts', () => {
    const countOf = (intent: string): number =>
      ORIGINAL_PRESETS.filter((preset) => preset.intent === intent).length;

    expect(['thinking', 'loading', 'progress', 'result', 'playful', 'icons'].map(countOf)).toEqual([
      7, 9, 4, 3, 3, 3,
    ]);
  });

  it('no longer ships the removed sets', () => {
    const ids = PRESETS.map((preset) => preset.id);

    REMOVED_IDS.forEach((id) => expect(ids).not.toContain(id));
  });

  it('leaves out the prototype sets that belonged to the user', () => {
    const ids = PRESETS.map((preset) => preset.id);

    PROTOTYPE_MINE_IDS.forEach((id) => expect(ids).not.toContain(id));
  });

  it('credits every preset to Flickering Dots as a built-in set', () => {
    PRESETS.forEach((preset) => {
      expect(preset.author).toBe('Flickering Dots');
      expect(preset.source).toBe('builtin');
    });
  });
});

describe('each preset against the approved catalog', () => {
  it.each(CATALOG_CASES)('keeps the metadata of %s', (id, expected, index) => {
    const { states: _states, ...metadata } = expected;

    expect(PRESETS[index]).toMatchObject({ ...metadata, id });
  });

  it.each(CATALOG_CASES)('defines the states of %s in order', (id, expected) => {
    const preset = findPreset(id);

    expect(preset.states).toEqual(expected.states);
    expect(Object.keys(preset.states)).toEqual(Object.keys(expected.states));
  });

  it('dates the oldest preset and the new additions exactly', () => {
    expect(findPreset('dots3').addedAt).toBe('2026-07-30');
    expect(findPreset('braille').addedAt).toBe('2026-09-29');
    expect(findPreset('type').addedAt).toBe('2026-09-22');
  });
});

describe('preset descriptions', () => {
  it.each(PRESET_CASES)('gives %s a one-line sentence', (_id, preset) => {
    const description = preset.description ?? '';

    expect(description.trim()).toBe(description);
    expect(description.length).toBeGreaterThan(0);
    expect(description).not.toMatch(/\n/);
    expect(description).toMatch(/^[A-Z].*\.$/);
  });

  it('gives every preset its own description', () => {
    expect(new Set(PRESETS.map((preset) => preset.description)).size).toBe(PRESET_COUNT);
  });
});

describe('resolving presets', () => {
  it.each(PRESET_CASES)('resolves every state of %s to frames of the set grid', (_id, preset) => {
    const cells = preset.cols * preset.rows;

    stateNames(preset).forEach((name) => {
      const clip = resolve(preset, name);

      expect(clip.state).toBe(name);
      expect(clip).toMatchObject({ cols: preset.cols, rows: preset.rows });
      expect(clip.frames.length).toBeGreaterThan(0);
      expect(clip.durations).toHaveLength(clip.frames.length);
      clip.frames.forEach((frame) => expect(frame).toHaveLength(cells));
      clip.durations.forEach((duration) => expect(duration).toBeGreaterThan(0));
    });
  });

  it.each(ORIGINAL_CASES)(
    'keeps every state of the original set %s at or under three flashes a second per dot',
    (_id, preset) => {
      stateNames(preset).forEach((name) => {
        expect(countPeakFlashesPerSecond(resolve(preset, name))).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
      });
    },
  );

  it.each(PRESET_CASES)('resolves the same frames for %s every time', (_id, preset) => {
    stateNames(preset).forEach((name) => {
      expect(resolve(preset, name)).toEqual(resolve(preset, name));
    });
  });
});

describe('codec round trip', () => {
  it.each(PRESET_CASES)('decodes the encoded %s to the same frames and durations', (_id, preset) => {
    const decoded = decodeSet(JSON.stringify(encodeSet(preset)));

    expect(decoded).toMatchObject({
      id: preset.id,
      name: preset.name,
      cols: preset.cols,
      rows: preset.rows,
      transition: preset.transition,
      tags: preset.tags,
      author: 'Flickering Dots',
    });
    expect(stateNames(decoded)).toEqual(stateNames(preset));
    stateNames(preset).forEach((name) => {
      expect(resolve(preset, name)).toMatchObject(resolve(decoded, name));
    });
  });

  it.each(PRESET_CASES)('encodes %s again to the same data', (_id, preset) => {
    const data = encodeSet(preset);

    expect(encodeSet(decodeSet(data))).toEqual(data);
  });
});

describe('getPreset', () => {
  it('returns the preset with the given id', () => {
    expect(getPreset('ember')).toBe(findPreset('ember'));
    expect(getPreset('tool-call')?.name).toBe('Tool Call');
  });

  it.each(REMOVED_IDS.map((id) => [id]))('returns undefined for the removed set %s', (id) => {
    expect(getPreset(id)).toBeUndefined();
  });

  it('returns undefined for an unknown id', () => {
    expect(getPreset('nope')).toBeUndefined();
    expect(getPreset('')).toBeUndefined();
  });

  it('returns undefined for the prototype sets that belonged to the user', () => {
    PROTOTYPE_MINE_IDS.forEach((id) => expect(getPreset(id)).toBeUndefined());
  });

  it('does not match names inherited from Object.prototype', () => {
    expect(getPreset('toString')).toBeUndefined();
    expect(getPreset('constructor')).toBeUndefined();
  });
});

describe('explicit-frame states of the built-in sets', () => {
  const overrideGrid = { cols: 12, rows: 12 };
  const cases = PRESETS.flatMap((set) =>
    Object.entries(set.states)
      .filter(([, def]) => def.kind === 'frames')
      .map(([state]) => [set.id, state, set] as const),
  );

  it.each(cases)('keeps %s %s on its own grid when the grid is overridden', (_id, state, set) => {
    const clip = resolve(set, state, overrideGrid);

    expect({ cols: clip.cols, rows: clip.rows }).toEqual({ cols: set.cols, rows: set.rows });
    expect(clip.frames.every((frame) => frame.length === set.cols * set.rows)).toBe(true);
  });
});
