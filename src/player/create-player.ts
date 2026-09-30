import type { Clip } from '../core/types';
import { SYSTEM_CLOCK } from './clock';
import { assertClip, assertSpeed, getFrameMs, toFrameIndex } from './timing';
import type { Clock, Player, PlayerOptions } from './types';

const DEFAULT_SPEED = 1;

interface PlayerState {
  readonly index: number;
  readonly speed: number;
  readonly playing: boolean;
  readonly ended: boolean;
  readonly timer: unknown;
  readonly dueAt: number;
  readonly remaining: number | null;
}

interface PlayerContext {
  readonly clip: Clip;
  readonly loop: boolean;
  readonly clock: Clock;
  readonly onFrame: (index: number) => void;
  readonly onEnd: (() => void) | undefined;
  readonly read: () => PlayerState;
  readonly write: (patch: Partial<PlayerState>) => void;
}

function frameMs(context: PlayerContext, index: number): number {
  return getFrameMs(context.clip.durations, index, context.read().speed);
}

function timeLeft(context: PlayerContext): number {
  return Math.max(0, context.read().dueAt - context.clock.now());
}

function run(context: PlayerContext, ms: number): void {
  const dueAt = context.clock.now() + ms;
  const timer = context.clock.schedule(() => advance(context), ms);
  context.write({ playing: true, timer, dueAt, remaining: null });
}

function halt(context: PlayerContext): void {
  const { playing, timer } = context.read();
  if (playing) context.clock.cancel(timer);
  context.write({ playing: false, timer: undefined });
}

function showFrame(context: PlayerContext, index: number): void {
  context.write({ index, ended: false });
  run(context, frameMs(context, index));
  context.onFrame(index);
}

function finish(context: PlayerContext): void {
  context.write({ playing: false, ended: true, timer: undefined, remaining: null });
  context.onEnd?.();
}

function advance(context: PlayerContext): void {
  const next = context.read().index + 1;
  if (next < context.clip.frames.length) {
    showFrame(context, next);
    return;
  }
  if (context.loop) {
    showFrame(context, 0);
    return;
  }
  finish(context);
}

function play(context: PlayerContext): void {
  const { playing, ended, index, remaining } = context.read();
  if (playing) return;
  if (ended) {
    showFrame(context, 0);
    return;
  }
  if (remaining === null) {
    showFrame(context, index);
    return;
  }
  run(context, remaining);
}

function pause(context: PlayerContext): void {
  if (!context.read().playing) return;
  const remaining = timeLeft(context);
  halt(context);
  context.write({ remaining });
}

function stop(context: PlayerContext): void {
  halt(context);
  context.write({ index: 0, ended: false, remaining: null });
}

function seek(context: PlayerContext, target: number): void {
  const index = toFrameIndex(target, context.clip.frames.length);
  if (context.read().playing) {
    halt(context);
    showFrame(context, index);
    return;
  }
  context.write({ index, ended: false, remaining: frameMs(context, index) });
  context.onFrame(index);
}

function setSpeed(context: PlayerContext, target: number): void {
  const speed = assertSpeed(target);
  const { playing, remaining, speed: previous } = context.read();
  const scale = previous / speed;
  context.write({ speed });
  if (playing) {
    const left = timeLeft(context) * scale;
    halt(context);
    run(context, left);
    return;
  }
  if (remaining !== null) context.write({ remaining: remaining * scale });
}

/** Plays a clip frame by frame on a timer, calling `onFrame` with each index to show. */
export function createPlayer(options: PlayerOptions): Player {
  const clip = assertClip(options.clip);
  let state: PlayerState = {
    index: toFrameIndex(options.startAt ?? 0, clip.frames.length),
    speed: assertSpeed(options.speed ?? DEFAULT_SPEED),
    playing: false,
    ended: false,
    timer: undefined,
    dueAt: 0,
    remaining: null,
  };
  const context: PlayerContext = {
    clip,
    loop: options.loop ?? true,
    clock: options.clock ?? SYSTEM_CLOCK,
    onFrame: options.onFrame,
    onEnd: options.onEnd,
    read: () => state,
    write: (patch) => {
      state = { ...state, ...patch };
    },
  };
  return Object.freeze({
    play: () => play(context),
    pause: () => pause(context),
    stop: () => stop(context),
    seek: (index: number) => seek(context, index),
    setSpeed: (speed: number) => setSpeed(context, speed),
    get playing() {
      return state.playing;
    },
    get index() {
      return state.index;
    },
  });
}
