import type { IntentInfo } from '../core/types';

/** The six intents a set is filed under, with their display labels, in Featured order. */
export const INTENTS: readonly IntentInfo[] = [
  { id: 'thinking', label: 'Thinking' },
  { id: 'loading', label: 'Loading' },
  { id: 'progress', label: 'Progress' },
  { id: 'result', label: 'Success / Error' },
  { id: 'playful', label: 'Playful' },
  { id: 'icons', label: 'Icons' },
];
