import { describe, expect, it } from 'vitest';

import { createRng } from '../../src/core/rng';

function takeValues(seed: number, count: number): number[] {
  const next = createRng(seed);
  return Array.from({ length: count }, () => next());
}

describe('createRng', () => {
  it('reproduces the prototype sequence for seed 7', () => {
    expect(takeValues(7, 4)).toEqual([
      0.899089464917779, 0.6117583212908357, 0.2999320565722883, 0.7393166152760386,
    ]);
  });

  it('reproduces the prototype sequence for a zero, a negative and the largest 32-bit seed', () => {
    expect(takeValues(0, 2)).toEqual([0.00006295018829405308, 0.015739798778668046]);
    expect(takeValues(-5, 2)).toEqual([0.8452207311056554, 0.3249256373383105]);
    expect(takeValues(2147483647, 2)).toEqual([0.9134748512879014, 0.05850070854648948]);
  });

  it('truncates a fractional seed to an integer', () => {
    expect(takeValues(1.9, 4)).toEqual(takeValues(1, 4));
  });

  it('keeps the same sequence for the same seed and a different one for another seed', () => {
    expect(takeValues(42, 50)).toEqual(takeValues(42, 50));
    expect(takeValues(42, 50)).not.toEqual(takeValues(43, 50));
  });

  it('returns values from zero up to but not including one', () => {
    const values = takeValues(99, 2000);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('gives each generator its own state', () => {
    const first = createRng(5);
    const second = createRng(5);
    first();
    first();
    expect(second()).toBe(takeValues(5, 1)[0]);
  });

  it('rejects a seed that is not a finite number', () => {
    expect(() => createRng(Number.NaN)).toThrow(
      'flickering-dots createRng: seed must be a finite number, got NaN',
    );
    expect(() => createRng(Number.POSITIVE_INFINITY)).toThrow('got Infinity');
  });
});
