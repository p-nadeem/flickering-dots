import type { Frame } from '../../types';
import { createFrameFromPoints } from '../helpers';
import type { Point, RecipeOutput } from '../helpers';
import { lookPositions } from './layout';
import type { FaceLayout } from './layout';
import { mirrorMask, openEye, squashEye } from './masks';
import type { EyeMask } from './masks';

const LIT = '#';

/** One face frame: the left eye's mask (the right eye mirrors it), the look in columns and the mask's top row. */
export interface FacePose {
  mask: EyeMask;
  dx: number;
  y: number;
}

/** A pose held for `ms` milliseconds. */
export interface FaceStep {
  pose: FacePose;
  ms: number;
}

function maskPoints(mask: EyeMask, left: number, top: number): Point[] {
  return mask.flatMap((line, y) =>
    [...line].flatMap((cell, x): Point[] => (cell === LIT ? [[left + x, top + y]] : [])),
  );
}

/** Draws both eyes of a pose on the layout's grid. */
export function drawFace(layout: FaceLayout, { mask, dx, y }: FacePose): Frame {
  const { leftX, rightX } = lookPositions(layout, dx);
  return createFrameFromPoints(layout, [
    ...maskPoints(mask, leftX, y),
    ...maskPoints(mirrorMask(mask), rightX, y),
  ]);
}

/** Turns held poses into recipe output. */
export function renderSteps(layout: FaceLayout, steps: readonly FaceStep[], still: number): RecipeOutput {
  return {
    frames: steps.map(({ pose }) => drawFace(layout, pose)),
    durations: steps.map(({ ms }) => ms),
    still,
  };
}

/** The open eyes looking `dx` columns across and `dy` rows down. */
export function openPose(layout: FaceLayout, dx: number, dy: number): FacePose {
  return { mask: openEye(layout.eyeWidth, layout.eyeHeight), dx, y: layout.top + dy };
}

/** An eye `fullHeight` rows tall whose top row is `top`, squashed to `height` rows for a blink. */
export function blinkPose(
  layout: FaceLayout,
  fullHeight: number,
  top: number,
  height: number,
  dx: number,
): FacePose {
  const { rows, offset } = squashEye(layout.eyeWidth, fullHeight, Math.min(height, fullHeight));
  return { mask: rows, dx, y: top + offset };
}

/** The heights of a blink: half closed, a 1-row slit, half closed. */
export function blinkHeights(fullHeight: number): number[] {
  const half = Math.max(1, Math.floor(fullHeight / 2));
  return [half, 1, half];
}
