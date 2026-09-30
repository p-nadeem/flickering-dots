import type { StandardState, Tuning } from './types';

/** Fewest dots per grid side a set may use. */
export const GRID_MIN = 3;
/** Most dots per grid side a set may use. */
export const GRID_MAX = 16;

/** Display order of the standard states; custom states follow in insertion order. */
export const STATE_ORDER: readonly StandardState[] = ['idle', 'thinking', 'success', 'error'];

/** Tuning used when none is given: theme colours, flat round dots, normal speed, 28px wide. */
export const DEFAULT_TUNING: Tuning = {
  on: null,
  off: null,
  mode: 'flat',
  shape: 'circle',
  gap: 0.25,
  speed: 1,
  direction: 'forward',
  size: 28,
};

/** Fallback duration for frames that have none, in ms. */
export const DEFAULT_FRAME_MS = 90;
