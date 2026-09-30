import { describe, expect, it } from 'vitest';

import { resolve } from '../../src/core/resolve';
import { busiestFrame } from '../../src/core/stats';
import { stateNames } from '../../src/core/state-names';
import type { Bit, Frame, IndicatorSet } from '../../src/core/types';
import { ICON_PRESETS } from '../../src/presets/icons';

const NEW_SET_DATE = '2026-09-29';
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;

const GLINT = ['......#', '.......', '.......', '.......', '.......', '.......', '.......'];
const DOT = ['.......', '.......', '.......', '...#...', '.......', '.......', '.......'];
const PLUS_SMALL = ['.......', '.......', '...#...', '..###..', '...#...', '.......', '.......'];
const PLUS_LARGE = ['.......', '...#...', '...#...', '.#####.', '...#...', '...#...', '.......'];
const STAR = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'];

function toFrame(...layers: readonly (readonly string[])[]): Frame {
  const [base] = layers;
  return base.flatMap((row, y) =>
    [...row].map((_, x): Bit => (layers.some((layer) => layer[y][x] === '#') ? 1 : 0)),
  );
}

function findIcon(id: string): IndicatorSet {
  const preset = ICON_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`No icon preset with id ${id}`);
  return preset;
}

function countCellFlashes(frames: readonly Frame[], cell: number): number {
  return frames.filter((frame, index) => {
    const previous = frames[(index - 1 + frames.length) % frames.length];
    return frame[cell] === 1 && previous[cell] === 0;
  }).length;
}

function countFlashes(frames: readonly Frame[]): number {
  const cells = frames[0]?.length ?? 0;
  return Math.max(0, ...Array.from({ length: cells }, (_, cell) => countCellFlashes(frames, cell)));
}

describe('ICON_PRESETS', () => {
  it('holds sparkle, heart and send in Featured order', () => {
    expect(ICON_PRESETS.map((preset) => preset.id)).toEqual(['sparkle', 'heart', 'send']);
  });

  it('files every set under icons and credits it to Flickering Dots', () => {
    ICON_PRESETS.forEach((preset) => {
      expect(preset).toMatchObject({ intent: 'icons', author: 'Flickering Dots', source: 'builtin' });
    });
  });

  it('keeps the added dates of kept sets and dates the new set today', () => {
    expect(ICON_PRESETS.map((preset) => preset.addedAt)).toEqual([NEW_SET_DATE, '2026-09-06', '2026-09-12']);
  });

  it.each(ICON_PRESETS.map((preset) => [preset.id, preset] as const))(
    'resolves every state of %s to full frames within the flash limit',
    (_, preset) => {
      stateNames(preset).forEach((state) => {
        const clip = resolve(preset, state);
        const loopMs = clip.durations.reduce((sum, ms) => sum + ms, 0);

        clip.frames.forEach((frame) => expect(frame).toHaveLength(preset.cols * preset.rows));
        expect(clip.durations).toHaveLength(clip.frames.length);
        expect(countFlashes(clip.frames) / (loopMs / MS_PER_SECOND)).toBeLessThanOrEqual(
          MAX_FLASHES_PER_SECOND,
        );
      });
    },
  );
});

describe('sparkle', () => {
  const sparkle = findIcon('sparkle');

  it('is a 7x7 AI mark with a crossfade', () => {
    expect(sparkle).toMatchObject({
      name: 'Sparkle',
      description:
        'A four-point star that swells and twinkles with a small glint in the corner, the AI mark in dots.',
      cols: 7,
      rows: 7,
      transition: 'crossfade',
      tags: ['ai', 'sparkle', 'icon', 'star'],
      contexts: ['button', 'inline', 'chat', 'card'],
      collections: ['ai'],
    });
    expect(Object.keys(sparkle.states)).toEqual(['idle', 'thinking', 'success']);
  });

  it('rests on the four-point star, the same frame reduced motion shows', () => {
    const thinking = resolve(sparkle, 'thinking');
    expect(sparkle.states.idle).toEqual({ kind: 'frames', frames: [toFrame(STAR)], durations: [1500] });
    expect(thinking.frames[busiestFrame(thinking)]).toEqual(toFrame(STAR));
  });

  it('swells from a glinting dot to the star and settles back', () => {
    expect(sparkle.states.thinking).toEqual({
      kind: 'frames',
      frames: [
        toFrame(DOT, GLINT),
        toFrame(PLUS_SMALL, GLINT),
        toFrame(PLUS_LARGE),
        toFrame(STAR),
        toFrame(PLUS_LARGE),
        toFrame(PLUS_SMALL),
      ],
      durations: [400, 110, 110, 360, 110, 110],
    });
  });

  it('shows the shared check on success', () => {
    expect(sparkle.states.success).toEqual({ kind: 'recipe', recipe: 'check' });
  });
});

describe('heart', () => {
  const heart = findIcon('heart');

  it('sits on a 7x6 grid resting on the small heart, with a beat and a check', () => {
    const small = ['.......', '..#.#..', '.#####.', '..###..', '...#...', '.......'];
    expect(heart).toMatchObject({ cols: 7, rows: 6, contexts: ['button', 'inline', 'chat'] });
    expect(heart.states).toEqual({
      idle: { kind: 'frames', frames: [toFrame(small)], durations: [1000] },
      thinking: { kind: 'recipe', recipe: 'heart' },
      success: { kind: 'recipe', recipe: 'check' },
    });
    expect(resolve(heart, 'thinking').frames[1]).toEqual(toFrame(small));
  });

  it('fills the grid with the large heart', () => {
    const large = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

    expect(resolve(heart, 'thinking').frames[0]).toEqual(toFrame(large));
  });
});

describe('send', () => {
  const send = findIcon('send');

  it('keeps its 7x7 arrow, resting centred, with a check and a cross', () => {
    const centred = ['.......', '...#...', '....#..', '.#####.', '....#..', '...#...', '.......'];
    expect(send).toMatchObject({ cols: 7, rows: 7, contexts: ['button', 'chat', 'inline'] });
    expect(send.states).toEqual({
      idle: { kind: 'frames', frames: [toFrame(centred)], durations: [1000] },
      thinking: { kind: 'recipe', recipe: 'arrow' },
      success: { kind: 'recipe', recipe: 'check' },
      error: { kind: 'recipe', recipe: 'cross' },
    });
  });

  it('shows the centred arrow, not one against the edge, under reduced motion', () => {
    const centred = ['.......', '...#...', '....#..', '.#####.', '....#..', '...#...', '.......'];
    const thinking = resolve(send, 'thinking');

    expect(thinking.frames[busiestFrame(thinking)]).toEqual(toFrame(centred));
  });
});
