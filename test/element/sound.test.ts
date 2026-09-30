import { describe, expect, it } from 'vitest';

import { createClicker, createClickSamples } from '../../src/element/sound';
import type { ClickOutput } from '../../src/element/audio-output';

function setUp(output: Partial<ClickOutput> = {}) {
  let time = 1000;
  let played = 0;
  let prepared = 0;
  const clicker = createClicker({
    now: () => time,
    random: () => 1,
    output: {
      prepare: () => {
        prepared += 1;
        return output.prepare?.() ?? true;
      },
      play: (samples) => {
        played += 1;
        return output.play?.(samples) ?? true;
      },
    },
  });
  return {
    clicker,
    wait: (ms: number) => {
      time += ms;
    },
    get played() {
      return played;
    },
    get prepared() {
      return prepared;
    },
  };
}

describe('createClickSamples', () => {
  it('makes a short burst of noise that fades out', () => {
    const samples = createClickSamples(() => 1);

    expect(samples).toHaveLength(220);
    expect(samples[0]).toBeCloseTo(0.25, 6);
    expect(samples[110]).toBeCloseTo(0.25 * 0.5 ** 6, 6);
    expect(samples[219]).toBeLessThan(1e-12);
  });

  it('centres the noise on zero', () => {
    expect(createClickSamples(() => 0)[0]).toBeCloseTo(-0.25, 6);
    expect(createClickSamples(() => 0.5)[0]).toBe(0);
  });
});

describe('createClicker', () => {
  it('stays silent until sound is enabled', () => {
    const setup = setUp();

    setup.clicker.click();

    expect(setup.played).toBe(0);
    expect(setup.clicker.enabled).toBe(false);
  });

  it('prepares the audio output when enabled and clicks after that', () => {
    const setup = setUp();

    setup.clicker.setEnabled(true);
    setup.clicker.click();

    expect(setup.prepared).toBe(1);
    expect(setup.played).toBe(1);
  });

  it('plays at most one click every 45 ms', () => {
    const setup = setUp();
    setup.clicker.setEnabled(true);

    setup.clicker.click();
    setup.wait(44);
    setup.clicker.click();
    setup.wait(1);
    setup.clicker.click();

    expect(setup.played).toBe(2);
  });

  it('stops clicking when sound is turned off again', () => {
    const setup = setUp();
    setup.clicker.setEnabled(true);

    setup.clicker.setEnabled(false);
    setup.clicker.click();

    expect(setup.played).toBe(0);
  });

  it('gives up on audio the output cannot prepare', () => {
    const setup = setUp({ prepare: () => false });

    setup.clicker.setEnabled(true);
    setup.clicker.click();

    expect(setup.played).toBe(0);
  });

  it('gives up on audio once a click fails to play', () => {
    const setup = setUp({ play: () => false });
    setup.clicker.setEnabled(true);

    setup.clicker.click();
    setup.wait(100);
    setup.clicker.click();

    expect(setup.played).toBe(1);
  });
});
