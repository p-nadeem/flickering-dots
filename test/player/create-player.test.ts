import { describe, expect, it } from 'vitest';

import { DEFAULT_FRAME_MS } from '../../src/core/constants';
import { createPlayer } from '../../src/player';

import { createFakeClock } from './fake-clock';
import { createClip, createHarness } from './harness';

describe('createPlayer playback', () => {
  it('does nothing until play is called', () => {
    const harness = createHarness(createClip([100, 100]));

    harness.clock.advance(1000);

    expect(harness.shown).toEqual([]);
    expect(harness.player.playing).toBe(false);
    expect(harness.player.index).toBe(0);
  });

  it('shows the first frame as soon as play is called', () => {
    const harness = createHarness(createClip([100, 100]));

    harness.player.play();

    expect(harness.shown).toEqual([0]);
    expect(harness.player.playing).toBe(true);
    expect(harness.clock.pending).toBe(1);
  });

  it('shows the frames in order, holding each for its own duration', () => {
    const harness = createHarness(createClip([100, 200, 300]));

    harness.player.play();
    harness.clock.advance(99);
    const beforeFirstStep = harness.shown;
    harness.clock.advance(1);
    const afterFirstStep = harness.shown;
    harness.clock.advance(199);
    const beforeSecondStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeFirstStep).toEqual([0]);
    expect(afterFirstStep).toEqual([0, 1]);
    expect(beforeSecondStep).toEqual([0, 1]);
    expect(harness.shown).toEqual([0, 1, 2]);
    expect(harness.player.index).toBe(2);
  });

  it('divides every duration by the speed', () => {
    const harness = createHarness(createClip([100, 200]), { speed: 2 });

    harness.player.play();
    harness.clock.advance(49);
    const beforeFirstStep = harness.shown;
    harness.clock.advance(1);
    harness.clock.advance(99);
    const beforeSecondStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeFirstStep).toEqual([0]);
    expect(beforeSecondStep).toEqual([0, 1]);
    expect(harness.shown).toEqual([0, 1, 0]);
  });

  it('holds slow speeds longer than the stored duration', () => {
    const harness = createHarness(createClip([100, 100]), { speed: 0.25 });

    harness.player.play();
    harness.clock.advance(399);
    const beforeStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeStep).toEqual([0]);
    expect(harness.shown).toEqual([0, 1]);
  });

  it('never holds a frame for less than 16 ms', () => {
    const harness = createHarness(createClip([4, 40]), { speed: 4 });

    harness.player.play();
    harness.clock.advance(15);
    const beforeFirstStep = harness.shown;
    harness.clock.advance(1);
    harness.clock.advance(15);
    const beforeSecondStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeFirstStep).toEqual([0]);
    expect(beforeSecondStep).toEqual([0, 1]);
    expect(harness.shown).toEqual([0, 1, 0]);
  });

  it('uses the default frame duration when a frame has none', () => {
    const harness = createHarness(createClip([100], 2));

    harness.player.play();
    harness.clock.advance(100);
    harness.clock.advance(DEFAULT_FRAME_MS - 1);
    const beforeStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeStep).toEqual([0, 1]);
    expect(harness.shown).toEqual([0, 1, 0]);
  });

  it('loops back to the first frame by default and never ends', () => {
    const harness = createHarness(createClip([50, 50]));

    harness.player.play();
    harness.clock.advance(200);

    expect(harness.shown).toEqual([0, 1, 0, 1, 0]);
    expect(harness.ends).toBe(0);
    expect(harness.player.playing).toBe(true);
  });

  it('keeps showing a single frame clip while looping', () => {
    const harness = createHarness(createClip([100]));

    harness.player.play();
    harness.clock.advance(200);

    expect(harness.shown).toEqual([0, 0, 0]);
    expect(harness.clock.pending).toBe(1);
  });

  it('stays on the last frame and calls onEnd once its duration passes when loop is false', () => {
    const harness = createHarness(createClip([100, 100]), { loop: false });

    harness.player.play();
    harness.clock.advance(199);
    const endsBeforeLastFrameEnds = harness.ends;
    harness.clock.advance(1);
    harness.clock.advance(1000);

    expect(endsBeforeLastFrameEnds).toBe(0);
    expect(harness.ends).toBe(1);
    expect(harness.shown).toEqual([0, 1]);
    expect(harness.player.playing).toBe(false);
    expect(harness.player.index).toBe(1);
    expect(harness.clock.pending).toBe(0);
  });

  it('ends quietly when loop is false and no onEnd is given', () => {
    const clock = createFakeClock();
    const player = createPlayer({
      clip: createClip([100, 100]),
      clock,
      loop: false,
      onFrame: () => undefined,
    });

    player.play();
    clock.advance(200);

    expect(player.playing).toBe(false);
    expect(player.index).toBe(1);
    expect(clock.pending).toBe(0);
  });

  it('plays from the first frame again when play is called after the end', () => {
    const harness = createHarness(createClip([100, 100]), { loop: false });
    harness.player.play();
    harness.clock.advance(200);

    harness.player.play();
    harness.clock.advance(100);

    expect(harness.shown).toEqual([0, 1, 0, 1]);
    expect(harness.player.playing).toBe(true);
  });

  it('starts at startAt and continues in order from there', () => {
    const harness = createHarness(createClip([100, 100, 100]), { startAt: 2 });

    harness.player.play();
    harness.clock.advance(100);

    expect(harness.shown).toEqual([2, 0]);
  });

  it('clamps startAt into the clip and drops any fraction', () => {
    const clip = createClip([100, 100, 100]);

    const past = createHarness(clip, { startAt: 7 });
    const before = createHarness(clip, { startAt: -3 });
    const fractional = createHarness(clip, { startAt: 1.8 });

    expect(past.player.index).toBe(2);
    expect(before.player.index).toBe(0);
    expect(fractional.player.index).toBe(1);
  });

  it('ignores play while already playing', () => {
    const harness = createHarness(createClip([100, 100]));

    harness.player.play();
    harness.player.play();

    expect(harness.shown).toEqual([0]);
    expect(harness.clock.pending).toBe(1);
  });

  it('lets onFrame pause the player without leaving a timer behind', () => {
    const clock = createFakeClock();
    const player = createPlayer({
      clip: createClip([100, 100, 100]),
      clock,
      onFrame: (index) => {
        if (index === 1) player.pause();
      },
    });

    player.play();
    clock.advance(1000);

    expect(player.index).toBe(1);
    expect(player.playing).toBe(false);
    expect(clock.pending).toBe(0);
  });

  it('lets onEnd start the clip again', () => {
    const clock = createFakeClock();
    let shown: readonly number[] = [];
    const player = createPlayer({
      clip: createClip([100, 100]),
      clock,
      loop: false,
      onFrame: (index) => {
        shown = [...shown, index];
      },
      onEnd: () => player.play(),
    });

    player.play();
    clock.advance(300);

    expect(shown).toEqual([0, 1, 0, 1]);
    expect(player.playing).toBe(true);
  });

  it('rejects a clip without frames', () => {
    const clip = createClip([]);

    expect(() => createPlayer({ clip, onFrame: () => undefined })).toThrow(/no frames/);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects a starting speed of %s', (speed) => {
    const clip = createClip([100]);

    expect(() => createPlayer({ clip, speed, onFrame: () => undefined })).toThrow(/speed/);
  });

  it('rejects a startAt that is not a number', () => {
    const clip = createClip([100]);

    expect(() => createPlayer({ clip, startAt: Number.NaN, onFrame: () => undefined })).toThrow(
      /frame index/,
    );
  });
});
