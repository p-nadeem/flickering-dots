import { describe, expect, it } from 'vitest';

import {
  createPropMap,
  isFlagOn,
  isPropName,
  PROP_NAMES,
  readJson,
  readLabel,
  readNumber,
  readText,
  toPropKey,
  withProp,
} from '../../src/element/props';

describe('element props', () => {
  it('observes every attribute the element documents', () => {
    expect(PROP_NAMES).toEqual([
      'set',
      'state',
      'recipe',
      'params',
      'frames',
      'cols',
      'rows',
      'tune',
      'on',
      'off',
      'mode',
      'shape',
      'gap',
      'speed',
      'direction',
      'size',
      'paused',
      'frame',
      'cycle',
      'reduced',
      'audible',
      'transition',
      'label',
    ]);
  });

  it('recognises prop names and rejects others', () => {
    expect(isPropName('tune')).toBe(true);
    expect(isPropName('class')).toBe(false);
    expect(isPropName('toString')).toBe(false);
  });

  it('starts with every prop unset', () => {
    const props = createPropMap();

    expect(Object.keys(props)).toEqual([...PROP_NAMES]);
    expect(props.set).toEqual({ value: null, key: null });
  });

  it('keys objects by their JSON so an equal object counts as unchanged', () => {
    expect(toPropKey({ size: 28 })).toBe(toPropKey({ size: 28 }));
    expect(toPropKey({ size: 28 })).toBe('{"size":28}');
    expect(toPropKey({ size: 28 })).not.toBe(toPropKey({ size: 30 }));
  });

  it('keys strings, numbers and booleans by their text, and absent values as null', () => {
    expect(toPropKey('pulse')).toBe('pulse');
    expect(toPropKey(5)).toBe('5');
    expect(toPropKey(true)).toBe('true');
    expect(toPropKey(null)).toBeNull();
    expect(toPropKey(undefined)).toBeNull();
  });

  it('gives an object that cannot be serialised a key of its own every time', () => {
    const looped: { self?: unknown } = {};
    looped.self = looped;

    expect(toPropKey(looped)).not.toBe(toPropKey(looped));
  });

  it('returns a new map with the prop replaced and leaves the old map alone', () => {
    const before = createPropMap();

    const after = withProp(before, 'state', 'success');

    expect(after.state).toEqual({ value: 'success', key: 'success' });
    expect(before.state).toEqual({ value: null, key: null });
  });

  it('treats presence and true-like values as a set flag', () => {
    expect(isFlagOn('')).toBe(true);
    expect(isFlagOn('true')).toBe(true);
    expect(isFlagOn('paused')).toBe(true);
    expect(isFlagOn(true)).toBe(true);
    expect(isFlagOn(1)).toBe(true);
  });

  it('treats absence, false, "false" and "0" as an unset flag', () => {
    expect(isFlagOn(null)).toBe(false);
    expect(isFlagOn(undefined)).toBe(false);
    expect(isFlagOn(false)).toBe(false);
    expect(isFlagOn('false')).toBe(false);
    expect(isFlagOn('0')).toBe(false);
    expect(isFlagOn(0)).toBe(false);
  });

  it('reads non-empty text and numbers as text', () => {
    expect(readText('thinking')).toBe('thinking');
    expect(readText(7)).toBe('7');
    expect(readText('')).toBeNull();
    expect(readText('   ')).toBeNull();
    expect(readText({})).toBeNull();
    expect(readText(null)).toBeNull();
  });

  it('keeps an empty label so it can hide the element from assistive tech', () => {
    expect(readLabel('')).toBe('');
    expect(readLabel('Loading')).toBe('Loading');
    expect(readLabel(null)).toBeNull();
    expect(readLabel(3)).toBeNull();
  });

  it('reads finite numbers from numbers and numeric text', () => {
    expect(readNumber(28)).toBe(28);
    expect(readNumber('0.5')).toBe(0.5);
    expect(readNumber(' 12 ')).toBe(12);
    expect(readNumber('')).toBeNull();
    expect(readNumber('wide')).toBeNull();
    expect(readNumber(Number.NaN)).toBeNull();
    expect(readNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(readNumber(true)).toBeNull();
  });

  it('parses JSON text that starts with a brace or bracket', () => {
    expect(readJson('tune', '{"size":40}')).toEqual({ size: 40 });
    expect(readJson('frames', ' [1, 0]')).toEqual([1, 0]);
  });

  it('passes objects and plain text through unparsed', () => {
    const tune = { size: 40 };

    expect(readJson('tune', tune)).toBe(tune);
    expect(readJson('set', 'pulse')).toBe('pulse');
    expect(readJson('set', null)).toBeNull();
  });

  it('names the prop when its JSON does not parse', () => {
    expect(() => readJson('tune', '{size:40}')).toThrow(/^flickering-dots element: tune is not valid JSON: /);
  });
});
