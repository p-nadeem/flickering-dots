import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { VARIANTS_A } from '../../../../src/core/recipes/columns/variants-a';
import type { Frame } from '../../../../src/core/types';

import { lastFrame, litRowsInColumn } from './support-a';

const SET_GRID = { cols: 16, rows: 7 };
const BASELINE = 4;
const ecg = VARIANTS_A.ecg(SET_GRID, {});

function isColumnBlank(frame: Frame, x: number): boolean {
  return litRowsInColumn(frame, SET_GRID, x).length === 0;
}

describe('ecg', () => {
  it('loops once across the grid, one column per 45 ms frame', () => {
    expect(ecg.frames).toHaveLength(16);
    expect(new Set(ecg.durations)).toEqual(new Set([45]));
  });

  it('erases the two columns ahead of the pen', () => {
    ecg.frames.forEach((frame, f) => {
      expect(isColumnBlank(frame, (f + 1) % 16)).toBe(true);
      expect(isColumnBlank(frame, (f + 2) % 16)).toBe(true);
      expect(isColumnBlank(frame, f)).toBe(false);
    });
  });

  it('draws a flat baseline with a spike to the top row', () => {
    const frame = ecg.frames[13];
    expect(litRowsInColumn(frame, SET_GRID, 0)).toEqual([BASELINE]);
    expect(
      Math.min(...Array.from({ length: 16 }, (_, x) => litRowsInColumn(frame, SET_GRID, x)).flat()),
    ).toBe(0);
  });

  it('keeps the loop exactly cols frames on every width', () => {
    [9, 10, 11, 12, 13, 14, 15].forEach((cols) => {
      expect(VARIANTS_A.ecg({ cols, rows: 7 }, {}).frames).toHaveLength(cols);
    });
  });

  it('plays the same trace at 90 ms for ecg-slow', () => {
    const slow = VARIANTS_A['ecg-slow'](SET_GRID, {});
    expect(slow.frames).toEqual(ecg.frames);
    expect(new Set(slow.durations)).toEqual(new Set([90]));
  });
});

describe('ecg-skip', () => {
  it('draws every other beat flat in a loop of 2 * cols', () => {
    const { frames } = VARIANTS_A['ecg-skip'](SET_GRID, {});
    expect(frames).toHaveLength(32);
    expect(frames[15]).toEqual(ecg.frames[15]);
    const flat = Array.from({ length: 16 }, (_, x) => litRowsInColumn(frames[31], SET_GRID, x)).flat();
    expect(new Set(flat)).toEqual(new Set([BASELINE]));
  });
});

describe('ecg-irregular', () => {
  it('draws seeded irregular spikes over three sweeps', () => {
    const first = VARIANTS_A['ecg-irregular'](SET_GRID, { seed: 1 });
    expect(first.frames).toHaveLength(48);
    expect(VARIANTS_A['ecg-irregular'](SET_GRID, { seed: 2 }).frames).not.toEqual(first.frames);
  });
});

describe('ecg-rise', () => {
  const output = VARIANTS_A['ecg-rise'](SET_GRID, {});

  it('sweeps three beats faster each time and settles into the check', () => {
    const sweeps = [0, 1, 2].map((sweep) => output.durations[sweep * 16]);
    expect(sweeps[0]).toBeGreaterThan(sweeps[1]);
    expect(sweeps[1]).toBeGreaterThan(sweeps[2]);
    expect(lastFrame(output)).toEqual(glyphMask('check', SET_GRID));
    expect(output.durations[output.durations.length - 1]).toBe(1500);
  });
});

describe('ecg-flat', () => {
  const output = VARIANTS_A['ecg-flat'](SET_GRID, {});

  it('sweeps a flat line over the beat and holds it', () => {
    const rows = Array.from({ length: 16 }, (_, x) => litRowsInColumn(lastFrame(output), SET_GRID, x));
    expect(rows).toEqual(Array.from({ length: 16 }, () => [BASELINE]));
    expect(output.durations[output.durations.length - 1]).toBe(1500);
  });
});
