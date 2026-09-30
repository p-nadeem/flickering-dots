import type { ClickOutput } from './audio-output';
import { createWebAudioOutput, SYSTEM_AUDIO } from './audio-output';

export interface ClickerOptions {
  readonly now: () => number;
  readonly random: () => number;
  readonly output: ClickOutput;
}

export interface Clicker {
  setEnabled(enabled: boolean): void;
  click(): void;
  readonly enabled: boolean;
}

const CLICK_SAMPLES = 220;
const CLICK_GAIN = 0.25;
const CLICK_DECAY_POWER = 6;
const CLICK_THROTTLE_MS = 45;

export function createClickSamples(random: () => number): Float32Array {
  return Float32Array.from(
    { length: CLICK_SAMPLES },
    (_, index) => (random() * 2 - 1) * (1 - index / CLICK_SAMPLES) ** CLICK_DECAY_POWER * CLICK_GAIN,
  );
}

export function createClicker(options: ClickerOptions): Clicker {
  let enabled = false;
  let isAvailable = true;
  let lastClickAt = Number.NEGATIVE_INFINITY;

  return Object.freeze({
    setEnabled: (next: boolean) => {
      enabled = next;
      if (enabled && isAvailable) isAvailable = options.output.prepare();
    },
    click: () => {
      if (!enabled || !isAvailable) return;
      const now = options.now();
      if (now - lastClickAt < CLICK_THROTTLE_MS) return;
      lastClickAt = now;
      isAvailable = options.output.play(createClickSamples(options.random));
    },
    get enabled() {
      return enabled;
    },
  });
}

const SYSTEM_CLICKER = createClicker({
  now: () => globalThis.performance.now(),
  random: Math.random,
  output: createWebAudioOutput(SYSTEM_AUDIO),
});

/** Turns the frame click of audible indicators on or off for the whole page (off by default). */
export function setDotSoundEnabled(enabled: boolean): void {
  SYSTEM_CLICKER.setEnabled(enabled);
}

/** Plays one frame click, but only while dot sound is on; rapid calls are throttled. */
export function playDotClick(): void {
  SYSTEM_CLICKER.click();
}
