import { describe, expect, it } from 'vitest';

import { planTransition, runTransition } from '../../src/element/transitions';
import type { TransitionActions } from '../../src/element/transitions';

import { createFakeClock } from '../player/fake-clock';

function record() {
  const clock = createFakeClock();
  let log: readonly string[] = [];
  const note = (entry: string) => {
    log = [...log, `${clock.now()} ${entry}`];
  };
  const actions: TransitionActions = {
    fade: () => note('fade'),
    paint: () => note('paint'),
    column: (index) => note(`column ${index}`),
    done: () => note('done'),
  };
  return {
    clock,
    actions,
    get log() {
      return log;
    },
  };
}

describe('planTransition', () => {
  it('finishes at once for a cut', () => {
    expect(planTransition('cut', 7)).toEqual([{ at: 0, action: 'done' }]);
  });

  it('dips, paints halfway through the dip, then finishes for a crossfade', () => {
    expect(planTransition('crossfade', 7)).toEqual([
      { at: 0, action: 'fade' },
      { at: 140, action: 'paint' },
      { at: 280, action: 'done' },
    ]);
  });

  it('wipes one column every 26 ms and finishes when the last turn ends for a flip', () => {
    expect(planTransition('flip', 3)).toEqual([
      { at: 0, action: 'column', column: 0 },
      { at: 26, action: 'column', column: 1 },
      { at: 52, action: 'column', column: 2 },
      { at: 232, action: 'done' },
    ]);
  });
});

describe('runTransition', () => {
  it('runs the first steps straight away and the rest on the clock', () => {
    const recorder = record();

    runTransition(planTransition('flip', 3), recorder.clock, recorder.actions);
    const atStart = recorder.log;
    recorder.clock.advance(300);

    expect(atStart).toEqual(['0 column 0']);
    expect(recorder.log).toEqual(['0 column 0', '26 column 1', '52 column 2', '232 done']);
  });

  it('finishes a cut without waiting', () => {
    const recorder = record();

    runTransition(planTransition('cut', 3), recorder.clock, recorder.actions);

    expect(recorder.log).toEqual(['0 done']);
    expect(recorder.clock.pending).toBe(0);
  });

  it('stops where it is when cancelled', () => {
    const recorder = record();
    const cancel = runTransition(planTransition('crossfade', 3), recorder.clock, recorder.actions);
    recorder.clock.advance(150);

    cancel();
    recorder.clock.advance(500);

    expect(recorder.log).toEqual(['0 fade', '140 paint']);
    expect(recorder.clock.pending).toBe(0);
  });
});
