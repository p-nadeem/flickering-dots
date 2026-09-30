import { framesEqual } from '../../frame';
import type { Frame } from '../../types';
import { mergeRepeatedFrames } from '../helpers';
import type { RecipeOutput } from '../helpers';

/** One frame and how long it shows, in ms. */
export interface Shot {
  frame: Frame;
  ms: number;
}

/** Turns shots into recipe output. */
export function fromShots(shots: readonly Shot[]): RecipeOutput {
  return { frames: shots.map((shot) => shot.frame), durations: shots.map((shot) => shot.ms) };
}

/** Turns recipe output back into shots. */
export function toShots(output: RecipeOutput): Shot[] {
  return output.frames.map((frame, index) => ({ frame, ms: output.durations[index] }));
}

/** Merges repeated neighbours of a one-shot clip into single longer frames. */
export function mergeOnce(shots: readonly Shot[]): RecipeOutput {
  return mergeRepeatedFrames(fromShots(shots));
}

/** Merges repeated neighbours of a looping clip, including a last frame that repeats the first. */
export function mergeLoop(shots: readonly Shot[]): RecipeOutput {
  const merged = mergeRepeatedFrames(fromShots(shots));
  const last = merged.frames.length - 1;
  if (last < 1 || !framesEqual(merged.frames[0], merged.frames[last])) return merged;
  return {
    frames: merged.frames.slice(0, last),
    durations: merged.durations
      .slice(0, last)
      .map((ms, index) => (index === 0 ? ms + merged.durations[last] : ms)),
  };
}

/** Returns the shots with every duration multiplied by `factor`. */
export function scaleShots(shots: readonly Shot[], factor: number): Shot[] {
  return shots.map((shot) => ({ frame: shot.frame, ms: shot.ms * factor }));
}
