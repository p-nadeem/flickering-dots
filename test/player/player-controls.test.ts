import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayer } from '../../src/player';

import { createClip, createHarness } from './harness';

describe('createPlayer seek', () => {
  it('jumps to the sought frame and holds it for its full duration while playing', () => {
    const harness = createHarness(createClip([100, 200, 300]));
    harness.player.play();
    harness.clock.advance(50);

    harness.player.seek(2);
    harness.clock.advance(299);
    const beforeStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeStep).toEqual([0, 2]);
    expect(harness.shown).toEqual([0, 2, 0]);
    expect(harness.clock.pending).toBe(1);
  });

  it('shows the sought frame without starting playback while paused', () => {
    const harness = createHarness(createClip([100, 200, 300]));

    harness.player.seek(1);
    harness.clock.advance(1000);

    expect(harness.shown).toEqual([1]);
    expect(harness.player.index).toBe(1);
    expect(harness.player.playing).toBe(false);
    expect(harness.clock.pending).toBe(0);
  });

  it('resumes from a frame sought while paused without showing it twice', () => {
    const harness = createHarness(createClip([100, 200, 300]));
    harness.player.play();
    harness.player.pause();
    harness.player.seek(1);

    harness.player.play();
    harness.clock.advance(199);
    const beforeStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeStep).toEqual([0, 1]);
    expect(harness.shown).toEqual([0, 1, 2]);
  });

  it('clamps the sought index into the clip', () => {
    const harness = createHarness(createClip([100, 100, 100]));

    harness.player.seek(10);
    const high = harness.player.index;
    harness.player.seek(-4);

    expect(high).toBe(2);
    expect(harness.player.index).toBe(0);
  });

  it('clears the end so play continues from the sought frame', () => {
    const harness = createHarness(createClip([100, 100, 100]), { loop: false });
    harness.player.play();
    harness.clock.advance(300);

    harness.player.seek(1);
    harness.player.play();
    harness.clock.advance(100);

    expect(harness.shown).toEqual([0, 1, 2, 1, 2]);
  });

  it('rejects an index that is not a number', () => {
    const harness = createHarness(createClip([100, 100]));

    expect(() => harness.player.seek(Number.NaN)).toThrow(/frame index/);
  });
});

describe('createPlayer pause and resume', () => {
  it('holds the current frame while paused and resumes with the time that was left', () => {
    const harness = createHarness(createClip([100, 200]));
    harness.player.play();
    harness.clock.advance(30);

    harness.player.pause();
    const pendingWhilePaused = harness.clock.pending;
    harness.clock.advance(1000);
    const shownWhilePaused = harness.shown;
    harness.player.play();
    harness.clock.advance(69);
    const beforeStep = harness.shown;
    harness.clock.advance(1);

    expect(pendingWhilePaused).toBe(0);
    expect(shownWhilePaused).toEqual([0]);
    expect(beforeStep).toEqual([0]);
    expect(harness.shown).toEqual([0, 1]);
  });

  it('reports playing as false while paused and keeps the index', () => {
    const harness = createHarness(createClip([100, 100]));
    harness.player.play();
    harness.clock.advance(100);

    harness.player.pause();

    expect(harness.player.playing).toBe(false);
    expect(harness.player.index).toBe(1);
  });

  it('ignores pause when not playing', () => {
    const harness = createHarness(createClip([100, 100]));

    harness.player.pause();
    harness.player.play();

    expect(harness.shown).toEqual([0]);
    expect(harness.clock.pending).toBe(1);
  });
});

describe('createPlayer stop', () => {
  it('clears the pending timer and rewinds to the first frame', () => {
    const harness = createHarness(createClip([100, 100, 100]));
    harness.player.play();
    harness.clock.advance(150);

    harness.player.stop();
    harness.clock.advance(1000);

    expect(harness.clock.pending).toBe(0);
    expect(harness.shown).toEqual([0, 1]);
    expect(harness.player.playing).toBe(false);
    expect(harness.player.index).toBe(0);
  });

  it('plays from the first frame after a stop', () => {
    const harness = createHarness(createClip([100, 100, 100]));
    harness.player.play();
    harness.clock.advance(150);
    harness.player.stop();

    harness.player.play();
    harness.clock.advance(100);

    expect(harness.shown).toEqual([0, 1, 0, 1]);
  });

  it('is safe to call when nothing is playing', () => {
    const harness = createHarness(createClip([100, 100]), { startAt: 1 });

    harness.player.stop();

    expect(harness.player.index).toBe(0);
    expect(harness.clock.pending).toBe(0);
  });
});

describe('createPlayer setSpeed', () => {
  it('scales the time left on the current frame while playing', () => {
    const harness = createHarness(createClip([200, 200]));
    harness.player.play();
    harness.clock.advance(100);

    harness.player.setSpeed(2);
    harness.clock.advance(49);
    const beforeFirstStep = harness.shown;
    harness.clock.advance(1);
    harness.clock.advance(99);
    const beforeSecondStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeFirstStep).toEqual([0]);
    expect(beforeSecondStep).toEqual([0, 1]);
    expect(harness.shown).toEqual([0, 1, 0]);
    expect(harness.clock.pending).toBe(1);
  });

  it('scales the time left on the current frame while paused', () => {
    const harness = createHarness(createClip([200, 200]));
    harness.player.play();
    harness.clock.advance(100);
    harness.player.pause();

    harness.player.setSpeed(0.5);
    harness.player.play();
    harness.clock.advance(199);
    const beforeStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeStep).toEqual([0]);
    expect(harness.shown).toEqual([0, 1]);
  });

  it('applies to the next play when set while stopped', () => {
    const harness = createHarness(createClip([100, 100]));

    harness.player.setSpeed(4);
    harness.player.play();
    harness.clock.advance(24);
    const beforeStep = harness.shown;
    harness.clock.advance(1);

    expect(beforeStep).toEqual([0]);
    expect(harness.shown).toEqual([0, 1]);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a speed of %s and keeps playing',
    (speed) => {
      const harness = createHarness(createClip([100, 100]));
      harness.player.play();

      expect(() => harness.player.setSpeed(speed)).toThrow(/speed/);
      harness.clock.advance(100);
      expect(harness.shown).toEqual([0, 1]);
    },
  );
});

describe('createPlayer default clock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses setTimeout and clearTimeout when no clock is given', () => {
    vi.useFakeTimers();
    let shown: readonly number[] = [];
    const player = createPlayer({
      clip: createClip([100, 200]),
      onFrame: (index) => {
        shown = [...shown, index];
      },
    });

    player.play();
    vi.advanceTimersByTime(130);
    player.pause();
    vi.advanceTimersByTime(1000);
    player.play();
    vi.advanceTimersByTime(169);
    const beforeStep = shown;
    vi.advanceTimersByTime(1);
    player.stop();

    expect(beforeStep).toEqual([0, 1]);
    expect(shown).toEqual([0, 1, 0]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
