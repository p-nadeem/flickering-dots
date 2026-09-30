import { describe, expect, it } from 'vitest';

import { applyDirection } from '../../src/core/apply-direction';
import type { ResolvedState } from '../../src/core/types';

import { CENTRE_3, CROSS_3, FULL_3, PLUS_3 } from './fixtures';

const FOUR: ResolvedState = Object.freeze({
  state: 'thinking',
  cols: 3,
  rows: 3,
  on: '#ff5a1f',
  frames: Object.freeze([CENTRE_3, PLUS_3, FULL_3, CROSS_3]),
  durations: Object.freeze([10, 20, 30, 40]),
});

describe('applyDirection', () => {
  it('leaves a forward clip as it is', () => {
    expect(applyDirection(FOUR, 'forward')).toEqual(FOUR);
  });

  it('reverses frames and durations together for reverse', () => {
    const result = applyDirection(FOUR, 'reverse');

    expect(result.frames).toEqual([CROSS_3, FULL_3, PLUS_3, CENTRE_3]);
    expect(result.durations).toEqual([40, 30, 20, 10]);
  });

  it('keeps the other fields of the clip', () => {
    const result = applyDirection(FOUR, 'reverse');

    expect(result).toMatchObject({ state: 'thinking', cols: 3, rows: 3, on: '#ff5a1f' });
  });

  it('keeps the still frame on the same picture in every direction', () => {
    const withStill = { ...FOUR, still: 1 };

    expect(applyDirection(withStill, 'forward').still).toBe(1);
    expect(applyDirection(withStill, 'reverse').still).toBe(2);
    expect(applyDirection(withStill, 'pingpong').still).toBe(1);
    expect(applyDirection(FOUR, 'reverse')).not.toHaveProperty('still');
  });

  it('appends the reversed middle frames for pingpong', () => {
    const result = applyDirection(FOUR, 'pingpong');

    expect(result.frames).toEqual([CENTRE_3, PLUS_3, FULL_3, CROSS_3, FULL_3, PLUS_3]);
    expect(result.durations).toEqual([10, 20, 30, 40, 30, 20]);
  });

  it('plays three frames as a b c b for pingpong', () => {
    const clip = { cols: 3, rows: 3, frames: [CENTRE_3, PLUS_3, FULL_3], durations: [1, 2, 3] };

    expect(applyDirection(clip, 'pingpong').durations).toEqual([1, 2, 3, 2]);
  });

  it('leaves clips of two frames or fewer unchanged for pingpong', () => {
    const two = { cols: 3, rows: 3, frames: [CENTRE_3, PLUS_3], durations: [1, 2] };
    const one = { cols: 3, rows: 3, frames: [CENTRE_3], durations: [1] };

    expect(applyDirection(two, 'pingpong')).toEqual(two);
    expect(applyDirection(one, 'pingpong')).toEqual(one);
  });

  it('never mutates the input clip', () => {
    applyDirection(FOUR, 'reverse');
    applyDirection(FOUR, 'pingpong');

    expect(FOUR.frames).toEqual([CENTRE_3, PLUS_3, FULL_3, CROSS_3]);
    expect(FOUR.durations).toEqual([10, 20, 30, 40]);
  });
});
