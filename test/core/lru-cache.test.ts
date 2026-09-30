import { describe, expect, it } from 'vitest';

import { createLruCache } from '../../src/core/lru-cache';

describe('createLruCache', () => {
  it('returns what was written and nothing for an unknown key', () => {
    const cache = createLruCache<number>(2);
    cache.write('a', 1);

    expect(cache.read('a')).toBe(1);
    expect(cache.read('b')).toBeUndefined();
  });

  it('drops the least recently used entry once the limit is passed', () => {
    const cache = createLruCache<number>(2);
    cache.write('a', 1);
    cache.write('b', 2);
    cache.read('a');
    cache.write('c', 3);

    expect(cache.read('a')).toBe(1);
    expect(cache.read('b')).toBeUndefined();
    expect(cache.read('c')).toBe(3);
    expect(cache.size()).toBe(2);
  });

  it('replaces the value of a key that is written again without growing', () => {
    const cache = createLruCache<number>(2);
    cache.write('a', 1);
    cache.write('a', 5);

    expect(cache.read('a')).toBe(5);
    expect(cache.size()).toBe(1);
  });

  it('rejects a limit that is not a positive whole number', () => {
    expect(() => createLruCache<number>(0)).toThrow(
      'flickering-dots cache: limit must be a whole number above 0, got 0',
    );
  });
});
