import { countLit } from './frame';
import type { Clip, PlayDirection, StateName } from './types';

const ONE_SHOT_STATES: readonly StateName[] = ['success', 'error'];

/** True for a state that plays once and holds its last frame instead of looping: `success` and `error`. */
export function isOneShotState(state: StateName | null): boolean {
  return state !== null && ONE_SHOT_STATES.includes(state);
}

function hasStill(clip: Clip): clip is Clip & { still: number } {
  const { still } = clip;
  return still !== undefined && Number.isInteger(still) && still >= 0 && still < clip.frames.length;
}

function lastBusiestFrame(clip: Clip): number {
  const counts = clip.frames.map(countLit);
  return counts.lastIndexOf(Math.max(...counts));
}

/** Index of the finished mark a one-shot clip shows under reduced motion: its named still, else its last frame, else (when it ends blank) the last of its busiest frames. */
export function finalMarkFrame(clip: Clip): number {
  if (hasStill(clip)) return clip.still;
  const last = clip.frames.length - 1;
  return countLit(clip.frames[last]) > 0 ? last : lastBusiestFrame(clip);
}

/** Index of a forward clip's finished mark within the same clip after `applyDirection(clip, direction)`. */
export function directedFinalMarkFrame(clip: Clip, direction: PlayDirection): number {
  const mark = finalMarkFrame(clip);
  return direction === 'reverse' ? clip.frames.length - 1 - mark : mark;
}
