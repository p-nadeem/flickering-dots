import { describe, expect, it } from 'vitest';

import * as runtime from '../../src/index';
import { directedFinalMarkFrame, finalMarkFrame, isOneShotState } from '../../src/core/one-shot';
import type { Clip } from '../../src/core/types';

import { CENTRE_3, CROSS_3, FULL_3, PLUS_3 } from './fixtures';

const BLANK_3: Clip['frames'][number] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

function toClip(frames: Clip['frames']): Clip {
  return { cols: 3, rows: 3, frames, durations: frames.map(() => 100) };
}

describe('isOneShotState', () => {
  it('is true for success and error only', () => {
    expect(isOneShotState('success')).toBe(true);
    expect(isOneShotState('error')).toBe(true);
    expect(['idle', 'thinking', 'waiting', 'Success'].map(isOneShotState)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(isOneShotState(null)).toBe(false);
  });
});

describe('finalMarkFrame', () => {
  it('picks the last frame, where the result settles, even when a frame before it is busier', () => {
    expect(finalMarkFrame(toClip([CENTRE_3, FULL_3, PLUS_3]))).toBe(2);
  });

  it('picks the frame the clip names as its still when there is one', () => {
    expect(finalMarkFrame({ ...toClip([CENTRE_3, FULL_3, PLUS_3]), still: 1 })).toBe(1);
  });

  it('ignores a still that is not a frame of the clip', () => {
    expect(finalMarkFrame({ ...toClip([CENTRE_3, FULL_3, PLUS_3]), still: 7 })).toBe(2);
  });

  it('picks the last of the busiest frames when the clip ends blank', () => {
    expect(finalMarkFrame(toClip([CENTRE_3, CROSS_3, PLUS_3, CROSS_3, BLANK_3]))).toBe(3);
  });
});

describe('directedFinalMarkFrame', () => {
  const clip = toClip([CENTRE_3, FULL_3, PLUS_3]);

  it('keeps the forward finished mark for forward and ping-pong play', () => {
    expect(directedFinalMarkFrame(clip, 'forward')).toBe(2);
    expect(directedFinalMarkFrame(clip, 'pingpong')).toBe(2);
  });

  it('points at the same picture in a reversed clip', () => {
    expect(directedFinalMarkFrame(clip, 'reverse')).toBe(0);
  });
});

describe('runtime root entry one-shot rule', () => {
  it('exports the one-shot rule', () => {
    expect(runtime.isOneShotState).toBe(isOneShotState);
    expect(runtime.finalMarkFrame).toBe(finalMarkFrame);
    expect(runtime.directedFinalMarkFrame).toBe(directedFinalMarkFrame);
  });

  it('holds the finished mark of the built-in cross', () => {
    const clip = runtime.build('cross', { cols: 7, rows: 7 });
    const index = runtime.finalMarkFrame(clip);
    expect(runtime.countLit(clip.frames[index])).toBe(Math.max(...clip.frames.map(runtime.countLit)));
    expect(
      clip.frames
        .slice(index + 1)
        .every((frame) => runtime.countLit(frame) < runtime.countLit(clip.frames[index])),
    ).toBe(true);
  });
});
