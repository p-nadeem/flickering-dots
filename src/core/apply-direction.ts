import type { Clip, PlayDirection } from './types';

const MIN_PINGPONG_FRAMES = 3;

function toReturnLeg<T>(items: readonly T[]): T[] {
  return items.slice(1, -1).reverse();
}

/** reverse flips the order; pingpong appends the reversed middle frames. */
export function applyDirection<T extends Clip>(clip: T, direction: PlayDirection): T {
  if (direction === 'reverse') {
    const reversed = {
      ...clip,
      frames: [...clip.frames].reverse(),
      durations: [...clip.durations].reverse(),
    };
    return clip.still === undefined ? reversed : { ...reversed, still: clip.frames.length - 1 - clip.still };
  }
  if (direction === 'pingpong' && clip.frames.length >= MIN_PINGPONG_FRAMES) {
    return {
      ...clip,
      frames: [...clip.frames, ...toReturnLeg(clip.frames)],
      durations: [...clip.durations, ...toReturnLeg(clip.durations)],
    };
  }
  return clip;
}
