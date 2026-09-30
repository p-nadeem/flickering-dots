import type { RecipeOutput } from '../helpers';
import { blinkPose, renderSteps } from './draw';
import type { FacePose, FaceStep } from './draw';
import type { FaceLayout } from './layout';
import { angryEye, happyArc } from './masks';

const SLIT_ROWS = 1;
const SLIT_MS = 80;
const HAPPY_OPEN_MS = 120;
const HAPPY_BOUNCE_MS = 140;
const HAPPY_BOUNCES = 2;
const HOLD_MS = 1200;
const ANGRY_GLARE_MS = 600;
const ANGRY_SHAKE = [-1, 0, 1, 0, -1];
const ANGRY_SHAKE_MS = 80;

function slitStep(layout: FaceLayout): FaceStep {
  return { pose: blinkPose(layout, layout.eyeHeight, layout.top, SLIT_ROWS, 0), ms: SLIT_MS };
}

function finish(layout: FaceLayout, steps: readonly FaceStep[]): RecipeOutput {
  return renderSteps(layout, steps, steps.length - 1);
}

/** Success: a blink shut, then happy arcs that bounce up 1 row twice and hold. */
export function generateHappy(layout: FaceLayout): RecipeOutput {
  const mask = happyArc(layout.eyeWidth, layout.eyeHeight);
  const top = Math.floor((layout.rows - mask.length) / 2);
  const arc = (dy: number, ms: number): FaceStep => ({ pose: { mask, dx: 0, y: top + dy }, ms });
  const bounces = Array.from({ length: HAPPY_BOUNCES }, () => [
    arc(-1, HAPPY_BOUNCE_MS),
    arc(0, HAPPY_BOUNCE_MS),
  ]).flat();
  const settled = bounces.slice(0, -1);
  return finish(layout, [slitStep(layout), arc(0, HAPPY_OPEN_MS), ...settled, arc(0, HOLD_MS)]);
}

/** Error: a blink shut, then angry slanted eyes that glare, shake 1 column 3 times and hold. */
export function generateAngry(layout: FaceLayout): RecipeOutput {
  const pose = (dx: number): FacePose => ({
    mask: angryEye(layout.eyeWidth, layout.eyeHeight),
    dx,
    y: layout.top,
  });
  const shakes = ANGRY_SHAKE.map((dx): FaceStep => ({ pose: pose(dx), ms: ANGRY_SHAKE_MS }));
  return finish(layout, [
    slitStep(layout),
    { pose: pose(0), ms: ANGRY_GLARE_MS },
    ...shakes,
    { pose: pose(0), ms: HOLD_MS },
  ]);
}
