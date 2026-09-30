import { glyphMask } from '../../glyphs';
import type { Frame, GridSize } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { GRAIN_STEP_MS, drawHourglass, flowShots, restShot } from './hourglass-draw';
import { getHourglassLayout } from './hourglass-layout';
import { morphPoints } from './morph';
import { mergedShotsToOutput, shotsToOutput } from './shared';
import type { Shot } from './shared';

const DONE_GRAINS = 3;
const MOUND_HOLD_MS = 400;
const MORPH_MS = 60;
const CHECK_HOLD_MS = 700;
const JAM_RUN_GRAINS = 2;
const BLINK_MS = 250;
const JAM_HOLD_MS = 400;
const CROSS_HOLD_MS = 1500;

function maskPoints(frame: Frame, { cols }: GridSize): Point[] {
  return frame.flatMap((bit, index): Point[] =>
    bit === 1 ? [[index % cols, Math.floor(index / cols)]] : [],
  );
}

/** The last grains land, the mound holds 400 ms, then its grains flow into the check. */
export function generateHourglassDone(grid: GridSize): RecipeOutput {
  const layout = getHourglassLayout(grid);
  const grains = layout.drain.length;
  const mound = drawHourglass(layout, grains, null);
  const morph = morphPoints(mound, maskPoints(glyphMask('check', grid), grid));
  const shots: Shot[] = [
    ...flowShots(layout, Math.max(0, grains - DONE_GRAINS), grains, GRAIN_STEP_MS),
    restShot(layout, grains, MOUND_HOLD_MS),
    ...morph.map((points, index): Shot => ({
      points,
      ms: index === morph.length - 1 ? CHECK_HOLD_MS : MORPH_MS,
    })),
  ];
  return shotsToOutput(grid, shots);
}

/** The stream stops mid-fall, the neck and the stream blink off twice at 250 ms, then the sand flows into the cross and holds. */
export function generateHourglassJam(grid: GridSize): RecipeOutput {
  const layout = getHourglassLayout(grid);
  const jamAt = Math.floor(layout.drain.length / 2);
  const frozen = drawHourglass(layout, jamAt, 0);
  const sand = drawHourglass(layout, jamAt, null);
  const morph = morphPoints(frozen, maskPoints(glyphMask('cross', grid), grid));
  const shots: Shot[] = [
    ...flowShots(layout, Math.max(0, jamAt - JAM_RUN_GRAINS), jamAt, GRAIN_STEP_MS),
    { points: frozen, ms: BLINK_MS },
    { points: sand, ms: BLINK_MS },
    { points: frozen, ms: BLINK_MS },
    { points: sand, ms: BLINK_MS },
    { points: frozen, ms: JAM_HOLD_MS },
    ...morph.map((points, index): Shot => ({
      points,
      ms: index === morph.length - 1 ? CROSS_HOLD_MS : MORPH_MS,
    })),
  ];
  const output = mergedShotsToOutput(grid, shots);
  return { ...output, durations: [...output.durations.slice(0, -1), CROSS_HOLD_MS] };
}
