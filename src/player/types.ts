import type { Clip } from '../core/types';

/** Time source and timer the player runs on; inject a fake one in tests. */
export interface Clock {
  /** Current time in ms from any fixed origin. */
  now: () => number;
  /** Runs `callback` once after `ms` and returns a handle for `cancel`. */
  schedule: (callback: () => void, ms: number) => unknown;
  /** Cancels a pending callback by the handle `schedule` returned. */
  cancel: (handle: unknown) => void;
}

/** Options for `createPlayer`. */
export interface PlayerOptions {
  clip: Clip;
  /** Playback multiplier; durations are divided by it (minimum 16 ms per frame). */
  speed?: number;
  /** Starting frame index. */
  startAt?: number;
  /** Starts again from the first frame after the last one; true by default. */
  loop?: boolean;
  /** Called with the frame index to show whenever the shown frame changes or playback starts. */
  onFrame: (index: number) => void;
  /** Called once the last frame has been held for its duration when `loop` is false. */
  onEnd?: () => void;
  /** Timer source; defaults to `setTimeout`, `clearTimeout` and `performance.now`. */
  clock?: Clock;
}

/** Controls for one playing clip. */
export interface Player {
  /** Starts or resumes playback; after the end of a non-looping clip it starts from the first frame. */
  play: () => void;
  /** Holds the current frame; `play` resumes with the time that was left on it. */
  pause: () => void;
  /** Cancels the pending frame and rewinds to the first frame without showing it. */
  stop: () => void;
  /** Shows the frame at `index`, clamped into the clip, and holds it for its full duration. */
  seek: (index: number) => void;
  /** Changes the playback multiplier, rescaling the time left on the current frame. */
  setSpeed: (speed: number) => void;
  /** True while frames are advancing. */
  readonly playing: boolean;
  /** Index of the frame last shown or sought. */
  readonly index: number;
}
