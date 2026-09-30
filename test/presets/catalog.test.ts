import { describe, expect, it } from 'vitest';

import { COLLECTIONS, INTENTS, PRESETS } from '../../src/presets';

import { CROSS_LISTINGS, NEW_COLLECTIONS, ORIGINAL_SET_COUNT, WOW_FEATURED_IDS } from './wow-catalog';

const ORIGINAL_COLLECTIONS = [
  {
    id: 'ai',
    name: 'AI replies',
    description: 'Calm pulses, sparkles and shimmers made for assistant replies.',
  },
  {
    id: 'minimal',
    name: 'Minimal dots',
    description: 'The three-dot ellipsis and its small neighbours, quiet enough for any chat.',
  },
  {
    id: 'term',
    name: 'Terminal-ready',
    description: 'Small, crisp sets that sit on a CLI line next to text.',
  },
  {
    id: 'agent',
    name: 'Agent states',
    description: 'Sets with extra states for agents: waiting, warning, cancelled, listening and connecting.',
  },
];

const EXPECTED_COLLECTIONS = [...ORIGINAL_COLLECTIONS, ...NEW_COLLECTIONS];

const BRAND_NAMES = /claude|anthropic|openai|codex|gemini|cursor/i;

const EXPECTED_INTENTS = [
  { id: 'thinking', label: 'Thinking' },
  { id: 'loading', label: 'Loading' },
  { id: 'progress', label: 'Progress' },
  { id: 'result', label: 'Success / Error' },
  { id: 'playful', label: 'Playful' },
  { id: 'icons', label: 'Icons' },
];

const BANNED_COPY = /[–—←-⇿⟰-⟿⤀-⥿]|->|<-|=>|\p{Extended_Pictographic}/u;

function getCopy(): string[] {
  return [
    ...PRESETS.flatMap((preset) => [preset.name, preset.description ?? '', ...preset.tags]),
    ...COLLECTIONS.flatMap((collection) => [collection.name, collection.description]),
    ...INTENTS.map((intent) => intent.label),
  ];
}

describe('COLLECTIONS', () => {
  it('lists the four original collections, then the seven wow collections, in order', () => {
    expect(COLLECTIONS).toEqual(EXPECTED_COLLECTIONS);
  });

  it.each(COLLECTIONS.map((collection) => [collection.id]))('has at least one set in %s', (id) => {
    expect(PRESETS.some((preset) => preset.collections?.includes(id))).toBe(true);
  });

  it('only lets presets name collections that exist', () => {
    const ids = new Set(COLLECTIONS.map((collection) => collection.id));

    PRESETS.forEach((preset) => {
      (preset.collections ?? []).forEach((id) => expect(ids.has(id)).toBe(true));
    });
  });

  it('puts the approved sets in each original collection, in Featured order', () => {
    const idsIn = (collection: string): string[] =>
      PRESETS.filter((preset) => preset.collections?.includes(collection)).map((preset) => preset.id);
    const wowIn = (collection: string): string[] =>
      WOW_FEATURED_IDS.filter((id) => CROSS_LISTINGS[collection]?.includes(id));

    expect(idsIn('ai')).toEqual(['pulse', 'typing-hop', 'shimmer', 'ember', 'sparkle', ...wowIn('ai')]);
    expect(idsIn('minimal')).toEqual(['typing-hop', 'dots3', 'braille', 'steps']);
    expect(idsIn('term')).toEqual([
      'ember',
      'breathe',
      'braille',
      'scanner',
      'snake',
      'fill-bar',
      'type',
      'tool-call',
      ...wowIn('term'),
    ]);
    expect(idsIn('agent')).toEqual(['equalizer', 'steps', 'tool-call', 'attention', ...wowIn('agent')]);
  });

  it('keeps product brands out of collection ids, names and set tags', () => {
    COLLECTIONS.forEach((collection) => {
      expect(collection.id).not.toMatch(BRAND_NAMES);
      expect(collection.name).not.toMatch(BRAND_NAMES);
    });
    PRESETS.forEach((preset) => preset.tags.forEach((tag) => expect(tag).not.toMatch(BRAND_NAMES)));
  });
});

describe('INTENTS', () => {
  it('lists the six prototype intents in order', () => {
    expect(INTENTS).toEqual(EXPECTED_INTENTS);
  });

  it('gives every preset an intent from the list', () => {
    const ids = new Set<string>(INTENTS.map((intent) => intent.id));

    PRESETS.forEach((preset) => expect(ids.has(preset.intent ?? '')).toBe(true));
  });

  it.each(INTENTS.map((intent) => [intent.id]))('has at least one preset for %s', (id) => {
    expect(PRESETS.some((preset) => preset.intent === id)).toBe(true);
  });

  it('groups the original presets by intent in the Featured order', () => {
    const order = INTENTS.map((intent) => intent.id);
    const positions = PRESETS.slice(0, ORIGINAL_SET_COUNT).map((preset) =>
      order.indexOf(preset.intent ?? 'thinking'),
    );

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe('catalogue copy', () => {
  it('uses no emoji, dashes other than hyphens, or arrows', () => {
    getCopy().forEach((text) => expect(text).not.toMatch(BANNED_COPY));
  });
});
