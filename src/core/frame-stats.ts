import { countLit } from './frame';
import type { Clip, Frame, GridSize } from './types';

function centreOffset(frame: Frame, { cols, rows }: GridSize): number {
  const lit = frame.flatMap((bit, index) => (bit === 1 ? [index] : []));
  if (lit.length === 0) return 0;
  const xs = lit.map((index) => index % cols);
  const ys = lit.map((index) => Math.floor(index / cols));
  const middleX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const middleY = (Math.min(...ys) + Math.max(...ys)) / 2;
  return Math.hypot(middleX - (cols - 1) / 2, middleY - (rows - 1) / 2);
}

function isBusier(clip: Clip, counts: readonly number[], index: number, best: number): boolean {
  if (counts[index] !== counts[best]) return counts[index] > counts[best];
  return centreOffset(clip.frames[index], clip) < centreOffset(clip.frames[best], clip);
}

/** Index of the frame with the most lit cells; ties go to the frame whose lit cells sit closest to the centre. */
export function busiestFrame(clip: Clip): number {
  const counts = clip.frames.map(countLit);
  return counts.reduce((best, _, index) => (isBusier(clip, counts, index, best) ? index : best), 0);
}

/** Index of the frame shown under reduced motion: the clip's still frame, else its busiest frame. */
export function stillFrame(clip: Clip): number {
  const { still } = clip;
  const isValid = still !== undefined && Number.isInteger(still) && still >= 0 && still < clip.frames.length;
  return isValid ? still : busiestFrame(clip);
}
