import { createRng } from '../../rng';
import type { RecipeOutput } from '../helpers';
import { blinkHeights, blinkPose, openPose, renderSteps } from './draw';
import type { FaceStep } from './draw';
import type { FaceLayout } from './layout';

const LOOK = 2;
const NEAR = 1;
const UP = -1;
const LOOPS = 3;
const SIDE_CHANCE = 0.5;
const REST_MS = 900;
const EASE_MS = 80;
const FIRST_HOLD_MS = 500;
const FIRST_LINGER_MS = 400;
const RETURN_MS = 200;
const SECOND_HOLD_MS = 600;
const UP_MS = 400;
const SETTLE_MS = 300;
const BLINK_MS = [60, 80, 60];
const END_MS = 800;

interface Look {
  side: number;
  upDx: number;
}

function pickLook(seed: number): Look {
  const rng = createRng(seed);
  const side = rng() < SIDE_CHANCE ? -1 : 1;
  const upDx = rng() < SIDE_CHANCE ? -side * LOOK : 0;
  return { side, upDx };
}

function loopSteps(layout: FaceLayout, { side, upDx }: Look): FaceStep[] {
  const at = (dx: number, dy: number, ms: number): FaceStep => ({ pose: openPose(layout, dx, dy), ms });
  const blinks = blinkHeights(layout.eyeHeight).map((height, index): FaceStep => ({
    pose: blinkPose(layout, layout.eyeHeight, layout.top, height, 0),
    ms: BLINK_MS[index],
  }));
  return [
    at(0, 0, REST_MS),
    at(side * NEAR, 0, EASE_MS),
    at(side * LOOK, 0, FIRST_HOLD_MS),
    at(side * LOOK, 0, FIRST_LINGER_MS),
    at(0, 0, RETURN_MS),
    at(-side * NEAR, 0, EASE_MS),
    at(-side * LOOK, 0, SECOND_HOLD_MS),
    at(upDx, UP, UP_MS),
    at(0, 0, SETTLE_MS),
    ...blinks,
    at(0, 0, END_MS),
  ];
}

/** Thinking: the eyes rest, glance to one side, then the other, look up and blink; three loops with seeded look targets. */
export function generateGlance(layout: FaceLayout, seed: number): RecipeOutput {
  const steps = Array.from({ length: LOOPS }, (_, loop) => loopSteps(layout, pickLook(seed + loop))).flat();
  return renderSteps(layout, steps, 0);
}
