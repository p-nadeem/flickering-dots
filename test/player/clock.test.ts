import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SYSTEM_CLOCK } from '../../src/player/clock';

describe('SYSTEM_CLOCK', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a scheduled callback once its delay passes', () => {
    const callback = vi.fn();

    SYSTEM_CLOCK.schedule(callback, 50);
    vi.advanceTimersByTime(49);
    const callsBefore = callback.mock.calls.length;
    vi.advanceTimersByTime(1);

    expect(callsBefore).toBe(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels a scheduled callback', () => {
    const callback = vi.fn();

    const handle = SYSTEM_CLOCK.schedule(callback, 50);
    SYSTEM_CLOCK.cancel(handle);
    vi.advanceTimersByTime(100);

    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores a handle it did not create', () => {
    expect(() => SYSTEM_CLOCK.cancel('unknown')).not.toThrow();
  });

  it('reports elapsed time in ms', () => {
    const start = SYSTEM_CLOCK.now();

    vi.advanceTimersByTime(250);

    expect(SYSTEM_CLOCK.now() - start).toBe(250);
  });
});
