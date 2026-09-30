import type { Transition } from '../core/types';
import type { Clock } from '../player/types';

export type TransitionStep =
  | { readonly at: number; readonly action: 'fade' | 'paint' | 'done' }
  | { readonly at: number; readonly action: 'column'; readonly column: number };

export interface TransitionActions {
  readonly fade: () => void;
  readonly paint: () => void;
  readonly column: (index: number) => void;
  readonly done: () => void;
}

const CROSSFADE_HALF_MS = 140;
const WIPE_COLUMN_MS = 26;
const WIPE_TURN_MS = 180;

function planCrossfade(): readonly TransitionStep[] {
  return [
    { at: 0, action: 'fade' },
    { at: CROSSFADE_HALF_MS, action: 'paint' },
    { at: CROSSFADE_HALF_MS * 2, action: 'done' },
  ];
}

function planWipe(cols: number): readonly TransitionStep[] {
  const columns = Array.from({ length: cols }, (_, column): TransitionStep => ({
    at: column * WIPE_COLUMN_MS,
    action: 'column',
    column,
  }));
  return [...columns, { at: (cols - 1) * WIPE_COLUMN_MS + WIPE_TURN_MS, action: 'done' }];
}

export function planTransition(kind: Transition, cols: number): readonly TransitionStep[] {
  if (kind === 'crossfade') return planCrossfade();
  if (kind === 'flip') return planWipe(cols);
  return [{ at: 0, action: 'done' }];
}

function applyStep(step: TransitionStep, actions: TransitionActions): void {
  if (step.action === 'column') {
    actions.column(step.column);
    return;
  }
  actions[step.action]();
}

export function runTransition(
  steps: readonly TransitionStep[],
  clock: Clock,
  actions: TransitionActions,
): () => void {
  let timer: unknown;
  let isCancelled = false;

  const runFrom = (index: number, elapsed: number): void => {
    const step = steps[index];
    if (step === undefined || isCancelled) return;
    if (step.at > elapsed) {
      timer = clock.schedule(() => runFrom(index, step.at), step.at - elapsed);
      return;
    }
    applyStep(step, actions);
    runFrom(index + 1, elapsed);
  };

  runFrom(0, 0);
  return () => {
    isCancelled = true;
    clock.cancel(timer);
  };
}
