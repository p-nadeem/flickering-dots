import { describe, expect, it } from 'vitest';

import { foldLoopSeam, mergeEqualNeighbours } from '../../src/core/compact';
import type { Bit, Clip } from '../../src/core/types';

const A: Bit[] = [1, 0, 0, 0];
const B: Bit[] = [0, 1, 0, 0];
const C: Bit[] = [0, 0, 1, 0];

function clipOf(frames: Bit[][], durations: number[], still?: number): Clip {
  return { cols: 2, rows: 2, frames, durations, ...(still === undefined ? {} : { still }) };
}

describe('mergeEqualNeighbours', () => {
  it('joins equal neighbouring frames and adds their durations', () => {
    const merged = mergeEqualNeighbours(clipOf([A, A, B, B, B, A], [10, 20, 30, 40, 50, 60]));

    expect(merged.frames).toEqual([A, B, A]);
    expect(merged.durations).toEqual([30, 120, 60]);
  });

  it('keeps the still on the same picture after a merge', () => {
    const merged = mergeEqualNeighbours(clipOf([A, A, B, C], [10, 10, 10, 10], 3));

    expect(merged.still).toBe(2);
  });

  it('returns the same clip when no neighbours repeat', () => {
    const clip = clipOf([A, B, C], [10, 20, 30], 1);

    expect(mergeEqualNeighbours(clip)).toBe(clip);
  });
});

describe('foldLoopSeam', () => {
  it('drops a last frame that equals the first and gives its time to the first', () => {
    const folded = foldLoopSeam(clipOf([A, B, A], [10, 20, 30]));

    expect(folded.frames).toEqual([A, B]);
    expect(folded.durations).toEqual([40, 20]);
  });

  it('moves a still on the dropped frame to the first frame', () => {
    expect(foldLoopSeam(clipOf([A, B, A], [10, 20, 30], 2)).still).toBe(0);
  });

  it('leaves a single frame and a clip without a seam repeat alone', () => {
    const single = clipOf([A], [10]);
    const open = clipOf([A, B, C], [10, 20, 30]);

    expect(foldLoopSeam(single)).toBe(single);
    expect(foldLoopSeam(open)).toBe(open);
  });
});
