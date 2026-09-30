import { describe, expect, it } from 'vitest';

import { createPropMap } from '../../src/element/props';
import type { ElementTuning } from '../../src/element/tuning';
import { ELEMENT_DEFAULTS, resolveTuning, toDotsLook } from '../../src/element/tuning';

import { propsWith } from './helpers';

describe('resolveTuning', () => {
  it('uses the element defaults when nothing is set', () => {
    const { tuning, error } = resolveTuning(createPropMap());

    expect(tuning).toEqual(ELEMENT_DEFAULTS);
    expect(ELEMENT_DEFAULTS).toEqual({
      on: null,
      off: null,
      mode: 'flat',
      shape: 'circle',
      gap: 0.25,
      speed: 1,
      direction: 'forward',
      size: 24,
    });
    expect(error).toBeNull();
  });

  it('reads every look setting from the tune object', () => {
    const tune = {
      on: '#ff0000',
      off: '#000000',
      mode: 'led',
      shape: 'diamond',
      gap: 0.5,
      speed: 2,
      direction: 'pingpong',
      size: 40,
    };

    expect(resolveTuning(propsWith({ tune })).tuning).toEqual(tune);
  });

  it('reads tune given as JSON text', () => {
    const { tuning } = resolveTuning(propsWith({ tune: '{"shape":"square","size":"32"}' }));

    expect(tuning.shape).toBe('square');
    expect(tuning.size).toBe(32);
  });

  it('lets single attributes win over the tune object', () => {
    const props = propsWith({ tune: { size: 40, on: '#111111', mode: 'led' }, size: '64', on: 'red' });

    const { tuning } = resolveTuning(props);

    expect(tuning.size).toBe(64);
    expect(tuning.on).toBe('red');
    expect(tuning.mode).toBe('led');
  });

  it('ignores empty single attributes', () => {
    const { tuning } = resolveTuning(propsWith({ tune: { on: '#111111' }, on: '' }));

    expect(tuning.on).toBe('#111111');
  });

  it('keeps null colours so the theme tokens apply', () => {
    const { tuning } = resolveTuning(propsWith({ tune: { on: null, off: null } }));

    expect(tuning.on).toBeNull();
    expect(tuning.off).toBeNull();
  });

  it('falls back to the default for values it does not recognise', () => {
    const props = propsWith({
      mode: 'glow',
      shape: 'star',
      direction: 'sideways',
      gap: '-1',
      speed: '0',
      size: 'big',
    });

    expect(resolveTuning(props).tuning).toEqual(ELEMENT_DEFAULTS);
  });

  it('accepts a gap of zero', () => {
    expect(resolveTuning(propsWith({ gap: '0' })).tuning.gap).toBe(0);
  });

  it('reports tune JSON that does not parse and keeps the defaults', () => {
    const { tuning, error } = resolveTuning(propsWith({ tune: '{size:40}' }));

    expect(tuning).toEqual(ELEMENT_DEFAULTS);
    expect(error).toMatch(/^flickering-dots element: tune is not valid JSON/);
  });

  it('reports a tune that is not an object', () => {
    const { error } = resolveTuning(propsWith({ tune: '[1,2]' }));

    expect(error).toBe('flickering-dots element: tune must be an object of look settings');
  });
});

describe('toDotsLook', () => {
  it('falls back to the dot colour variables', () => {
    const look = toDotsLook(ELEMENT_DEFAULTS, null);

    expect(look.on).toBe('var(--dot-on, #e4ff3e)');
    expect(look.off).toBe('var(--dot-off, #26272d)');
  });

  it('prefers the state colour, then the tuned colour', () => {
    const tuning: ElementTuning = { ...ELEMENT_DEFAULTS, on: '#00ff00', off: '#333333' };

    expect(toDotsLook(tuning, '#ff00ff').on).toBe('#ff00ff');
    expect(toDotsLook(tuning, null).on).toBe('#00ff00');
    expect(toDotsLook(tuning, null).off).toBe('#333333');
  });

  it('carries the shape, mode, size and gap through', () => {
    const tuning: ElementTuning = { ...ELEMENT_DEFAULTS, mode: 'flip', shape: 'rounded', size: 50, gap: 0.4 };

    expect(toDotsLook(tuning, null)).toMatchObject({ mode: 'flip', shape: 'rounded', size: 50, gap: 0.4 });
  });
});
