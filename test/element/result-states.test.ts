import { describe, expect, it } from 'vitest';

import { finalMarkFrame, getPreset, PRESETS, resolve } from '../../src/index';
import type { Clip, IndicatorSet } from '../../src/index';

import { toBits } from './fake-dom';
import { mount } from './fake-host';

const ON = 'var(--dot-on, #e4ff3e)';
const RESULT_STATES = ['success', 'error'] as const;

function presetOf(id: string): IndicatorSet {
  const preset = getPreset(id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return preset;
}

function totalMs(clip: Clip): number {
  return clip.durations.reduce((sum, ms) => sum + ms, 0);
}

describe('dots controller result states', () => {
  it.each(RESULT_STATES)('plays %s once and holds its last frame', (state) => {
    const clip = resolve(presetOf('okfail'), state);
    const { grid, env } = mount({ set: 'okfail', state });

    env.clock.advance(totalMs(clip) * 3);

    expect(toBits(grid.cells, ON)).toEqual([...clip.frames[clip.frames.length - 1]]);
    expect(env.clock.pending).toBe(0);
  });

  it('keeps looping a thinking state', () => {
    const clip = resolve(presetOf('pulse'), 'thinking');
    const { env } = mount({ set: 'pulse', state: 'thinking' });

    env.clock.advance(totalMs(clip) * 2);

    expect(env.clock.pending).toBe(1);
  });

  it('keeps looping a custom state such as waiting', () => {
    const clip = resolve(presetOf('attention'), 'waiting');
    const { env } = mount({ set: 'attention', state: 'waiting' });

    env.clock.advance(totalMs(clip) * 2);

    expect(env.clock.pending).toBe(1);
  });

  it.each(RESULT_STATES)('shows the finished mark of %s under reduced motion', (state) => {
    const clip = resolve(presetOf('okfail'), state);
    const { grid, env } = mount({ set: 'okfail', state, reduced: '' });

    expect(toBits(grid.cells, ON)).toEqual([...clip.frames[clip.frames.length - 1]]);
    expect(env.clock.pending).toBe(0);
  });

  it.each(
    PRESETS.flatMap((set) =>
      RESULT_STATES.filter((state) => state in set.states).map((state) => [set.id, state]),
    ),
  )('shows the finished mark of %s %s under reduced motion', (id, state) => {
    const clip = resolve(presetOf(id), state);
    const { grid } = mount({ set: id, state, reduced: '' });

    expect(toBits(grid.cells, ON)).toEqual([...clip.frames[finalMarkFrame(clip)]]);
  });

  it.each(
    PRESETS.flatMap((set) =>
      RESULT_STATES.filter((state) => state in set.states).map((state) => [set.id, state]),
    ),
  )('shows the last frame of %s %s under reduced motion when that frame is not blank', (id, state) => {
    const clip = resolve(presetOf(id), state);
    const last = clip.frames[clip.frames.length - 1];
    if (!last.includes(1) || clip.still !== undefined) return;
    const { grid } = mount({ set: id, state, reduced: '' });

    expect(toBits(grid.cells, ON)).toEqual([...last]);
  });

  it('shows the finished cross, not a shaken one, when the error plays in reverse under reduced motion', () => {
    const forward = resolve(presetOf('okfail'), 'error');
    const { grid } = mount({ set: 'okfail', state: 'error', reduced: '', tune: { direction: 'reverse' } });

    expect(toBits(grid.cells, ON)).toEqual([...forward.frames[forward.frames.length - 1]]);
  });
});
