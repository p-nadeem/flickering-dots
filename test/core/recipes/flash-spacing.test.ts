import { describe, expect, it } from 'vitest';

import { MIN_BIG_CHANGE_GAP_MS, spaceBigChanges } from '../../../src/core/recipes/flash-spacing';
import type { Bit } from '../../../src/core/types';

const A: Bit[] = [1, 1, 0, 0, 0];
const B: Bit[] = [0, 0, 1, 1, 0];
const C: Bit[] = [0, 0, 1, 1, 1];

describe('spaceBigChanges', () => {
  it('holds the frame before a big change until the last big change is far enough back', () => {
    expect(spaceBigChanges([A, B, A], [60, 60, 60], false)).toEqual([60, MIN_BIG_CHANGE_GAP_MS, 60]);
  });

  it('leaves small changes and well spaced big changes alone', () => {
    expect(spaceBigChanges([B, C, C], [60, 60, 60], false)).toEqual([60, 60, 60]);
    expect(spaceBigChanges([A, B, A], [200, 200, 200], false)).toEqual([200, 200, 200]);
  });

  it('counts the seam of a loop', () => {
    expect(spaceBigChanges([A, B], [60, 60], true)).toEqual([MIN_BIG_CHANGE_GAP_MS, MIN_BIG_CHANGE_GAP_MS]);
  });

  it('keeps at least a sixth of a second between big changes', () => {
    expect(MIN_BIG_CHANGE_GAP_MS).toBeGreaterThanOrEqual(1000 / 6);
  });
});
