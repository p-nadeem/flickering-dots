import type { Clip, Frame } from '../../src/core/types';
import { createPlayer } from '../../src/player';
import type { Player, PlayerOptions } from '../../src/player';

import { createFakeClock } from './fake-clock';
import type { FakeClock } from './fake-clock';

export type HarnessOptions = Pick<PlayerOptions, 'speed' | 'startAt' | 'loop'>;

export interface Harness {
  readonly player: Player;
  readonly clock: FakeClock;
  readonly shown: readonly number[];
  readonly ends: number;
}

export function createClip(durations: readonly number[], frameCount = durations.length): Clip {
  const frames = Array.from({ length: frameCount }, (_, index): Frame => (index % 2 === 0 ? [1] : [0]));
  return { cols: 1, rows: 1, frames, durations };
}

export function createHarness(clip: Clip, options: HarnessOptions = {}): Harness {
  const clock = createFakeClock();
  let shown: readonly number[] = [];
  let ends = 0;
  const player = createPlayer({
    ...options,
    clip,
    clock,
    onFrame: (index) => {
      shown = [...shown, index];
    },
    onEnd: () => {
      ends += 1;
    },
  });
  return {
    player,
    clock,
    get shown() {
      return shown;
    },
    get ends() {
      return ends;
    },
  };
}
