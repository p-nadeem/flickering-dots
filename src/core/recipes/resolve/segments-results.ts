import { framesEqual } from '../../frame';
import type { GridSize, RecipeParams } from '../../types';
import { generateCheck } from '../check';
import { mergeRepeatedFrames } from '../helpers';
import type { RecipeOutput } from '../helpers';
import { generateRipple } from '../ripple';
import { morphMasks } from './morph';
import { counterFrame, readCounter } from './segments';
import { joinOutputs, resultMask, RESULT_HOLD_MS } from './shared';

const RESULT_GLYPH = '0';
const ZERO_MS = 400;
const DIGIT_MS = 120;
const FLIGHT_MS = 60;
const BURST_RINGS = 4;
const CROSS = 'cross';

function lastDigit(grid: GridSize, params: RecipeParams): RecipeOutput['frames'][number] {
  const [counter, numbers] = readCounter(grid, params, RESULT_GLYPH);
  const value = numbers[numbers.length - 1];
  return counterFrame(counter, value, value, 0);
}

function burst(grid: GridSize): RecipeOutput {
  const ripple = generateRipple(grid, { frames: BURST_RINGS + 1 });
  return { frames: ripple.frames.slice(0, -1), durations: ripple.durations.slice(0, -1) };
}

/** The counter lands on its digit, bursts into ripple rings, then the check draws itself and holds. */
export function generateSegmentsDone(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const digit = { frames: [lastDigit(grid, params)], durations: [ZERO_MS] };
  return mergeRepeatedFrames(joinOutputs(digit, burst(grid), generateCheck(grid)));
}

/** The digit's dots fly into the cross, which holds; no shake, so the flight's six steps are the only big changes. */
export function generateSegmentsFail(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const digit = lastDigit(grid, params);
  const cross = resultMask(CROSS, grid);
  const moving = morphMasks(grid, digit, cross)
    .slice(1)
    .filter((frame) => !framesEqual(frame, cross));
  const flight = mergeRepeatedFrames({
    frames: [digit, ...moving],
    durations: [DIGIT_MS, ...moving.map(() => FLIGHT_MS)],
  });
  return joinOutputs(flight, { frames: [cross], durations: [RESULT_HOLD_MS] });
}
