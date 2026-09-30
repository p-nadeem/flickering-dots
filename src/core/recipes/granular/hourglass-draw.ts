import type { Point } from '../helpers';
import type { HourglassLayout } from './hourglass-layout';
import { range } from './shared';
import type { Shot } from './shared';

/** Milliseconds of each of the two sub-frames a grain takes to fall at normal speed. */
export const GRAIN_STEP_MS = 60;
/** Sub-frames drawn while one grain falls through the neck. */
export const STEPS_PER_GRAIN = 2;

/** Which dash of the falling stream shows, or null when no sand flows. */
export type StreamPhase = 0 | 1 | null;

function pileTop(layout: HourglassLayout, bottom: readonly Point[]): number {
  const [neckX] = layout.neck;
  const column = bottom.filter(([x]) => x === neckX).map(([, y]) => y);
  return Math.min(layout.bottomRow + 1, ...column);
}

function streamPoints(layout: HourglassLayout, bottom: readonly Point[], phase: 0 | 1): Point[] {
  const [neckX, neckY] = layout.neck;
  const dashes = range(neckY + 1, pileTop(layout, bottom))
    .filter((y) => (y + phase) % 2 === 0)
    .map((y): Point => [neckX, y]);
  return [layout.neck, ...dashes];
}

/** The glass after `drained` grains: the rest above, the pile below and, while flowing, the neck and a dashed stream. */
export function drawHourglass(layout: HourglassLayout, drained: number, phase: StreamPhase): Point[] {
  const bottom = layout.fill.slice(0, drained);
  const sand = [...layout.drain.slice(drained), ...bottom];
  return phase === null ? sand : [...sand, ...streamPoints(layout, bottom, phase)];
}

/** Shots of grains `from` up to but not including `to` falling, two dash phases each. */
export function flowShots(layout: HourglassLayout, from: number, to: number, stepMs: number): Shot[] {
  return range(from, to).flatMap((drained) =>
    range(0, STEPS_PER_GRAIN).map((step): Shot => ({
      points: drawHourglass(layout, drained, step % 2 === 0 ? 0 : 1),
      ms: stepMs,
    })),
  );
}

/** A still shot of the glass after `drained` grains, with no flow. */
export function restShot(layout: HourglassLayout, drained: number, ms: number): Shot {
  return { points: drawHourglass(layout, drained, null), ms };
}
