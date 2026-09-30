import { describe, expect, it } from 'vitest';

import type { DotsElementProperties } from '../../src/element';
import { PROP_NAMES } from '../../src/element/props';
import { resolveTuning } from '../../src/element/tuning';
import type { Clip, IndicatorSet, Tuning } from '../../src/index';
import { build, getPreset } from '../../src/index';
import { assignDotsProperties, toDotsProperties } from '../../src/react/dots-properties';

import { propsWith } from '../element/helpers';

const CLIP: Clip = build('orbit', { cols: 5, rows: 5 });

function getPulse(): IndicatorSet {
  const pulse = getPreset('pulse');
  if (pulse === undefined) throw new Error('the pulse preset is missing');
  return pulse;
}

function createRecordingTarget() {
  const values = new Map<string, unknown>();
  const writes: string[] = [];
  const target = Object.fromEntries(PROP_NAMES.map((name) => [name, undefined]));
  PROP_NAMES.forEach((name) => {
    Object.defineProperty(target, name, {
      get: () => values.get(name),
      set: (value: unknown) => {
        writes.push(name);
        values.set(name, value);
      },
      enumerable: true,
    });
  });
  return { target, values, writes };
}

function isDotsTarget(value: object): value is DotsElementProperties {
  return PROP_NAMES.every((name) => name in value);
}

function toTarget(value: object): DotsElementProperties {
  if (!isDotsTarget(value)) throw new Error('the recording target is missing a property');
  return value;
}

describe('toDotsProperties', () => {
  it('sets every element property to null when no props are given, so the element plays pulse', () => {
    const properties = toDotsProperties({});

    expect(Object.keys(properties).sort()).toEqual([...PROP_NAMES].sort());
    expect(Object.values(properties).every((value) => value === null)).toBe(true);
  });

  it('passes a preset id through as the set', () => {
    expect(toDotsProperties({ set: 'radar', state: 'thinking' })).toMatchObject({
      set: 'radar',
      state: 'thinking',
    });
  });

  it('passes a set object through as the same object, not as text', () => {
    const pulse = getPulse();

    expect(toDotsProperties({ set: pulse }).set).toBe(pulse);
  });

  it('passes the clip through as the frames property', () => {
    const properties = toDotsProperties({ clip: CLIP, frame: 3 });

    expect(properties.frames).toBe(CLIP);
    expect(properties.frame).toBe(3);
  });

  it('maps the grid to cols and rows', () => {
    expect(toDotsProperties({ recipe: 'ripple', grid: { cols: 9, rows: 7 } })).toMatchObject({
      recipe: 'ripple',
      cols: 9,
      rows: 7,
    });
  });

  it('passes recipe params through as the same object', () => {
    const params = { frames: 12, seed: 4 };

    expect(toDotsProperties({ recipe: 'noise', params }).params).toBe(params);
  });

  it('passes the tuning through as the same object, so an unchanged tuning never restarts playback', () => {
    const tuning: Partial<Tuning> = { mode: 'led', size: 28 };

    expect(toDotsProperties({ tuning }).tune).toBe(tuning);
  });

  it('passes each individual look prop to its own property', () => {
    expect(
      toDotsProperties({
        on: 'var(--primary-dot-on)',
        off: '#101010',
        mode: 'flip',
        shape: 'diamond',
        gap: 0.4,
        speed: 2,
        direction: 'pingpong',
        size: 16,
      }),
    ).toMatchObject({
      on: 'var(--primary-dot-on)',
      off: '#101010',
      mode: 'flip',
      shape: 'diamond',
      gap: 0.4,
      speed: 2,
      direction: 'pingpong',
      size: 16,
    });
  });

  it('keeps false flags and a zero frame instead of dropping them', () => {
    expect(
      toDotsProperties({ paused: false, cycle: false, reduced: false, audible: false, frame: 0 }),
    ).toMatchObject({ paused: false, cycle: false, reduced: false, audible: false, frame: 0 });
  });

  it('passes true flags, the transition and the label through', () => {
    expect(
      toDotsProperties({
        paused: true,
        cycle: true,
        reduced: true,
        audible: true,
        transition: 'crossfade',
        label: 'Busy',
      }),
    ).toMatchObject({
      paused: true,
      cycle: true,
      reduced: true,
      audible: true,
      transition: 'crossfade',
      label: 'Busy',
    });
  });

  it('keeps an empty label so the element hides itself from assistive tech', () => {
    expect(toDotsProperties({ label: '' }).label).toBe('');
  });

  it('ignores the class name, which is rendered as the class attribute instead', () => {
    expect(Object.values(toDotsProperties({ className: 'mark' }))).not.toContain('mark');
  });
});

describe('merged look', () => {
  function resolveLook(properties: DotsElementProperties) {
    return resolveTuning(propsWith({ ...properties })).tuning;
  }

  it('lets an individual size win over the tuning size', () => {
    const tuning: Partial<Tuning> = { size: 28, shape: 'square' };

    expect(resolveLook(toDotsProperties({ tuning, size: 40 }))).toMatchObject({ size: 40, shape: 'square' });
  });

  it('lets individual colours win over tuning colours that follow the theme', () => {
    const tuning: Partial<Tuning> = { on: null, off: null, mode: 'led' };
    const look = resolveLook(
      toDotsProperties({ tuning, on: 'var(--primary-dot-on)', off: 'var(--primary-dot-off)' }),
    );

    expect(look).toMatchObject({ on: 'var(--primary-dot-on)', off: 'var(--primary-dot-off)', mode: 'led' });
  });

  it('keeps every tuning value that no individual prop overrides', () => {
    const tuning: Tuning = {
      on: '#ff0000',
      off: '#000000',
      mode: 'flip',
      shape: 'rounded',
      gap: 0.5,
      speed: 0.5,
      direction: 'reverse',
      size: 56,
    };

    expect(resolveLook(toDotsProperties({ tuning, gap: 0.1 }))).toEqual({ ...tuning, gap: 0.1 });
  });

  it('falls back to the tuning when an individual colour is empty', () => {
    const tuning: Partial<Tuning> = { on: '#00ff00' };

    expect(resolveLook(toDotsProperties({ tuning, on: '' })).on).toBe('#00ff00');
  });
});

describe('assignDotsProperties', () => {
  it('writes every property on the first pass', () => {
    const { target, writes } = createRecordingTarget();

    assignDotsProperties(toTarget(target), toDotsProperties({ set: 'pulse' }));

    expect([...writes].sort()).toEqual([...PROP_NAMES].sort());
  });

  it('writes objects as the same objects', () => {
    const { target, values } = createRecordingTarget();
    const pulse = getPulse();
    const tuning: Partial<Tuning> = { size: 28 };

    assignDotsProperties(toTarget(target), toDotsProperties({ set: pulse, clip: CLIP, tuning }));

    expect(values.get('set')).toBe(pulse);
    expect(values.get('frames')).toBe(CLIP);
    expect(values.get('tune')).toBe(tuning);
  });

  it('skips properties whose value has not changed', () => {
    const { target, writes } = createRecordingTarget();
    const pulse = getPulse();
    const tuning: Partial<Tuning> = { size: 28 };
    assignDotsProperties(toTarget(target), toDotsProperties({ set: pulse, tuning, state: 'idle' }));
    const firstPassWrites = writes.length;

    assignDotsProperties(toTarget(target), toDotsProperties({ set: pulse, tuning, state: 'thinking' }));

    expect(writes.slice(firstPassWrites)).toEqual(['state']);
  });

  it('resets a property to null once its prop is removed', () => {
    const { target, values } = createRecordingTarget();
    assignDotsProperties(toTarget(target), toDotsProperties({ paused: true, size: 40 }));

    assignDotsProperties(toTarget(target), toDotsProperties({}));

    expect(values.get('paused')).toBeNull();
    expect(values.get('size')).toBeNull();
  });

  it('leaves the given values untouched', () => {
    const { target } = createRecordingTarget();
    const properties = Object.freeze(toDotsProperties({ set: 'radar', size: 32 }));

    expect(() => assignDotsProperties(toTarget(target), properties)).not.toThrow();
    expect(properties).toMatchObject({ set: 'radar', size: 32 });
  });
});
