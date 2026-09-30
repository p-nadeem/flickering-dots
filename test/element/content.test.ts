import { describe, expect, it } from 'vitest';

import { applyDirection, build, getPreset, resolve } from '../../src/index';
import type { Clip, Frame, IndicatorSet, ResolvedState } from '../../src/index';
import { getNextState, getTransitionKind, loadContent } from '../../src/element/content';

import { propsWith } from './helpers';

const PLUS: Frame = [0, 1, 0, 1, 1, 1, 0, 1, 0];
const DOT: Frame = [0, 0, 0, 0, 1, 0, 0, 0, 0];

const TINT_SET = {
  id: 'tint',
  name: 'Tint',
  cols: 3,
  rows: 3,
  transition: 'crossfade',
  transitions: { error: 'cut' },
  tags: [],
  author: 'you',
  source: 'mine',
  states: {
    thinking: { kind: 'frames', frames: [PLUS, DOT], durations: [100, 200], on: '#ff0000' },
    error: { kind: 'recipe', recipe: 'cross' },
  },
} satisfies IndicatorSet;

function toPlainClip({ cols, rows, frames, durations }: ResolvedState): Clip {
  return { cols, rows, frames, durations };
}

function presetOf(id: string): IndicatorSet {
  const preset = getPreset(id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return preset;
}

describe('loadContent with a set', () => {
  it('plays the pulse preset thinking state when nothing is set', () => {
    const { content, error } = loadContent(propsWith({}), 'forward');

    expect(content.clip).toEqual(toPlainClip(resolve(presetOf('pulse'), 'thinking')));
    expect(content.state).toBe('thinking');
    expect(content.label).toBe('thinking');
    expect(content.set).toBe(presetOf('pulse'));
    expect(error).toBeNull();
  });

  it('resolves the requested state of a preset', () => {
    const { content } = loadContent(propsWith({ set: 'okfail', state: 'error' }), 'forward');

    expect(content.clip).toEqual(toPlainClip(resolve(presetOf('okfail'), 'error')));
    expect(content.label).toBe('error');
  });

  it('labels the state it falls back to when the requested one is missing', () => {
    const { content } = loadContent(propsWith({ set: 'life', state: 'success' }), 'forward');

    expect(content.state).toBe('thinking');
    expect(content.label).toBe('thinking');
  });

  it('overrides the grid of recipe states with cols and rows', () => {
    const { content } = loadContent(propsWith({ set: 'pulse', cols: '9' }), 'forward');

    expect(content.clip).toEqual(toPlainClip(resolve(presetOf('pulse'), 'thinking', { cols: 9, rows: 7 })));
  });

  it('carries the state colour of a set', () => {
    const { content } = loadContent(propsWith({ set: TINT_SET }), 'forward');

    expect(content.on).toBe('#ff0000');
    expect(content.clip.frames).toEqual([PLUS, DOT]);
  });

  it('plays the clip in the tuned direction', () => {
    const { content } = loadContent(propsWith({ set: 'pulse' }), 'reverse');

    expect(content.clip).toEqual(
      applyDirection(toPlainClip(resolve(presetOf('pulse'), 'thinking')), 'reverse'),
    );
  });
});

describe('loadContent with a recipe', () => {
  it('builds the recipe on the given grid with its params', () => {
    const props = propsWith({ recipe: 'orbit', cols: '5', rows: '5', params: '{"trail":2}' });

    const { content } = loadContent(props, 'forward');

    expect(content.clip).toEqual(build('orbit', { cols: 5, rows: 5 }, { trail: 2 }));
    expect(content.label).toBe('orbit');
    expect(content.set).toBeNull();
  });

  it('takes the grid and transitions from the set when no grid is given', () => {
    const { content } = loadContent(propsWith({ recipe: 'bars', set: 'equalizer' }), 'forward');

    expect(content.clip).toEqual(build('bars', { cols: 9, rows: 7 }));
    expect(content.set).toBe(presetOf('equalizer'));
  });

  it('uses a 7 by 7 grid when there is no grid and no set', () => {
    const { content } = loadContent(propsWith({ recipe: 'radar' }), 'forward');

    expect(content.clip).toEqual(build('radar', { cols: 7, rows: 7 }));
  });

  it('labels a recipe with the state name when one is given', () => {
    const { content } = loadContent(propsWith({ recipe: 'check', state: 'success' }), 'forward');

    expect(content.label).toBe('success');
  });
});

describe('loadContent with frames', () => {
  it('plays explicit frames over any set or recipe', () => {
    const frames = { cols: 3, rows: 3, frames: [PLUS, DOT], durations: [100, 200] };

    const { content } = loadContent(propsWith({ frames, recipe: 'orbit', set: 'pulse' }), 'forward');

    expect(content.clip).toEqual(frames);
    expect(content.set).toBeNull();
    expect(content.state).toBeNull();
    expect(content.label).toBe('dots');
  });

  it('labels explicit frames with the state name when one is given', () => {
    const frames = { cols: 3, rows: 3, frames: [PLUS] };

    expect(loadContent(propsWith({ frames, state: 'idle' }), 'forward').content.label).toBe('idle');
  });
});

describe('loadContent with broken input', () => {
  it('falls back to the pulse preset and reports an unknown preset', () => {
    const { content, error } = loadContent(propsWith({ set: 'spinner', state: 'success' }), 'forward');

    expect(content.clip).toEqual(toPlainClip(resolve(presetOf('pulse'), 'success')));
    expect(content.set).toBe(presetOf('pulse'));
    expect(error).toBe('flickering-dots element: there is no preset called "spinner"');
  });

  it('reports frames that are not a clip', () => {
    const { content, error } = loadContent(propsWith({ frames: '{"cols":3}' }), 'forward');

    expect(content.clip).toEqual(toPlainClip(resolve(presetOf('pulse'), 'thinking')));
    expect(error).toBe('flickering-dots element: frames must be an object with frames, cols and rows');
  });

  it('reports recipe params out of range', () => {
    const { error } = loadContent(propsWith({ recipe: 'noise', params: { density: 4 } }), 'forward');

    expect(error).toMatch(/params\.density/);
  });

  it('reports a grid override outside 3 to 16', () => {
    const { error } = loadContent(propsWith({ recipe: 'orbit', cols: '20', rows: '5' }), 'forward');

    expect(error).toMatch(/grid\.cols must be a whole number from 3 to 16, got 20/);
  });
});

describe('getTransitionKind', () => {
  it("uses the set's transition", () => {
    const { content } = loadContent(propsWith({ set: TINT_SET }), 'forward');

    expect(getTransitionKind(null, content)).toBe('crossfade');
  });

  it('prefers the per-state transition of the state being entered', () => {
    const { content } = loadContent(propsWith({ set: TINT_SET, state: 'error' }), 'forward');

    expect(getTransitionKind(null, content)).toBe('cut');
  });

  it('lets a valid transition attribute override the set', () => {
    const { content } = loadContent(propsWith({ set: TINT_SET, state: 'error' }), 'forward');

    expect(getTransitionKind('flip', content)).toBe('flip');
    expect(getTransitionKind('slide', content)).toBe('cut');
  });

  it('cuts when there is no set', () => {
    const { content } = loadContent(propsWith({ recipe: 'orbit' }), 'forward');

    expect(getTransitionKind(null, content)).toBe('cut');
  });
});

describe('getNextState', () => {
  it('steps through the set states in display order and wraps around', () => {
    const next = (state: string) =>
      getNextState(loadContent(propsWith({ set: 'pulse', state }), 'forward').content);

    expect(next('idle')).toBe('thinking');
    expect(next('thinking')).toBe('success');
    expect(next('error')).toBe('idle');
  });

  it('has nothing to step to for a single state or no set', () => {
    expect(getNextState(loadContent(propsWith({ set: 'life' }), 'forward').content)).toBeNull();
    expect(getNextState(loadContent(propsWith({ recipe: 'orbit' }), 'forward').content)).toBeNull();
  });
});
