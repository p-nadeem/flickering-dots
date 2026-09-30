import type { Clock } from './types';

interface SystemTimer {
  readonly clear: () => void;
}

function isSystemTimer(handle: unknown): handle is SystemTimer {
  return (
    typeof handle === 'object' && handle !== null && 'clear' in handle && typeof handle.clear === 'function'
  );
}

function scheduleTimer(callback: () => void, ms: number): SystemTimer {
  const id = globalThis.setTimeout(callback, ms);
  return Object.freeze({ clear: () => globalThis.clearTimeout(id) });
}

export const SYSTEM_CLOCK: Clock = Object.freeze({
  now: () => globalThis.performance.now(),
  schedule: scheduleTimer,
  cancel: (handle: unknown) => {
    if (isSystemTimer(handle)) handle.clear();
  },
});
