import type { RecipeOutput } from '../helpers';
import { blinkHeights, blinkPose, renderSteps } from './draw';
import type { FaceStep } from './draw';
import type { FaceLayout } from './layout';
import { lidEye, openEye } from './masks';

const SLIT_ROWS = 2;
const SLEEPY_CYCLE_MS = 4000;
const SLEEPY_STEP_MS = 160;
const SLEEPY_OPEN_MS = 800;
const WIDE_EXTRA_ROWS = 2;
const WIDE_LOOK = 2;
const WIDE_BACK = 1;
const WIDE_REST_MS = 2000;
const WIDE_BLINK_MS = [60, 80, 60];
const WIDE_HOLD_MS = 1200;
const WIDE_BACK_MS = 500;
const READ_LOOKS = [-2, -1, 0, 1, 2];
const READ_LINES = [0, 1];
const READ_STEP_MS = 250;
const READ_END_MS = 400;
const READ_STILL = 2;

function lidStep(layout: FaceLayout, height: number, ms: number): FaceStep {
  const { eyeWidth, eyeHeight, top } = layout;
  return { pose: { mask: lidEye(eyeWidth, eyeHeight, height), dx: 0, y: top + eyeHeight - height }, ms };
}

/** Idle: 2-row slits that slowly open to full and close again every 4 s. */
export function generateSleepy(layout: FaceLayout): RecipeOutput {
  const slit = Math.min(SLIT_ROWS, layout.eyeHeight);
  if (layout.eyeHeight === slit) return renderSteps(layout, [lidStep(layout, slit, SLEEPY_CYCLE_MS)], 0);
  const opening = Array.from({ length: layout.eyeHeight - slit - 1 }, (_, index) => slit + 1 + index);
  const closing = [...opening].reverse();
  const rest = SLEEPY_CYCLE_MS - 2 * opening.length * SLEEPY_STEP_MS - SLEEPY_OPEN_MS;
  const steps = [
    lidStep(layout, slit, rest),
    ...opening.map((height) => lidStep(layout, height, SLEEPY_STEP_MS)),
    lidStep(layout, layout.eyeHeight, SLEEPY_OPEN_MS),
    ...closing.map((height) => lidStep(layout, height, SLEEPY_STEP_MS)),
  ];
  return renderSteps(layout, steps, 0);
}

/** Listening: eyes opened 2 rows taller, looking toward the right edge, with one blink and a glance back. */
export function generateWide(layout: FaceLayout): RecipeOutput {
  const height = Math.min(layout.rows, layout.eyeHeight + WIDE_EXTRA_ROWS);
  const top = Math.floor((layout.rows - height) / 2);
  const wide = (dx: number, ms: number): FaceStep => ({
    pose: { mask: openEye(layout.eyeWidth, height), dx, y: top },
    ms,
  });
  const blinks = blinkHeights(height).map((rows, index): FaceStep => ({
    pose: blinkPose(layout, height, top, rows, WIDE_LOOK),
    ms: WIDE_BLINK_MS[index],
  }));
  return renderSteps(
    layout,
    [wide(WIDE_LOOK, WIDE_REST_MS), ...blinks, wide(WIDE_LOOK, WIDE_HOLD_MS), wide(WIDE_BACK, WIDE_BACK_MS)],
    0,
  );
}

/** Reading: lidded eyes scan left to right, then drop 1 row and scan the next line. */
export function generateRead(layout: FaceLayout): RecipeOutput {
  const { eyeWidth, eyeHeight, top } = layout;
  const height = Math.max(1, eyeHeight - 1);
  const mask = lidEye(eyeWidth, eyeHeight, height);
  const last = READ_LOOKS.length - 1;
  const steps = READ_LINES.flatMap((dy) =>
    READ_LOOKS.map((dx, index): FaceStep => ({
      pose: { mask, dx, y: top + eyeHeight - height + dy },
      ms: index === last ? READ_END_MS : READ_STEP_MS,
    })),
  );
  return renderSteps(layout, steps, READ_STILL);
}
