import { describe, expect, it } from 'vitest';

import { generateAutomaton } from '../../../../src/core/recipes/automaton';
import { getAntSteps } from '../../../../src/core/recipes/automaton/ant';
import { runAnt, stepAnt, unstepAnt } from '../../../../src/core/recipes/automaton/ant-sim';
import type { Frame } from '../../../../src/core/types';

import { countChanged, countLit, gridName, gridsFrom } from './clip-metrics';

const GRIDS = gridsFrom([
  [7, 7],
  [8, 8],
  [11, 11],
  [12, 9],
  [16, 16],
]);
const CASES = GRIDS.map((grid) => [gridName(grid), grid] as const);
const PLUS_CELLS = 5;
const REDRAW_STRIDE = 4;

function withoutCell(frame: Frame, index: number): Frame {
  return frame.map((bit, at) => (at === index ? 0 : bit));
}

describe('automaton ant', () => {
  it('uses about 1.2 steps per cell, rounded to an even count', () => {
    expect(getAntSteps({ cols: 11, rows: 11 })).toBe(146);
    expect(getAntSteps({ cols: 7, rows: 7 })).toBe(58);
  });

  it.each(CASES)('undoes every Langton step exactly at %s', (_label, grid) => {
    const states = runAnt(grid, getAntSteps(grid));
    states.slice(1).forEach((state, index) => {
      expect(unstepAnt(state, grid)).toEqual(states[index]);
      expect(stepAnt(states[index], grid)).toEqual(state);
    });
  });

  it.each(CASES)('scribbles forward, rewinds to the empty grid and blinks the ant at %s', (_label, grid) => {
    const steps = getAntSteps(grid);
    const { frames, durations, still } = generateAutomaton(grid, { variant: 'ant' });
    expect(frames).toHaveLength(2 * steps);
    expect(durations.slice(0, steps).every((ms) => ms === 40)).toBe(true);
    expect(durations.slice(steps).every((ms) => ms === 25)).toBe(true);
    expect(frames.slice(0, 4).map(countLit)).toEqual([1, 2, 2, 3]);
    expect(still).toBe(steps);
    expect(countLit(frames[steps])).toBeGreaterThan(countLit(frames[steps / 2]) / 2);
  });

  it.each(CASES)('changes at most two dots per frame, across the seam too, at %s', (_label, grid) => {
    const { frames } = generateAutomaton(grid, { variant: 'ant' });
    const wrapped = [...frames, frames[0]];
    expect(wrapped.slice(1).every((frame, index) => countChanged(wrapped[index], frame) <= 2)).toBe(true);
  });

  it.each(CASES)('redraws quickly then rewinds one step per frame for undo at %s', (_label, grid) => {
    const steps = getAntSteps(grid);
    const { frames, durations } = generateAutomaton(grid, { variant: 'ant-undo' });
    const redraw = Math.ceil(steps / REDRAW_STRIDE);
    const wrapped = [...frames.slice(redraw), frames[0]];
    expect(frames).toHaveLength(redraw + steps);
    expect(countLit(frames[0])).toBe(1);
    expect(wrapped.slice(1).every((frame, index) => countChanged(wrapped[index], frame) <= 2)).toBe(true);
    expect(durations.every((ms) => ms === 25)).toBe(true);
  });

  it.each(CASES)('blinks the lone ant slowly at rest at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'ant-rest' });
    expect(frames.map(countLit)).toEqual([1, 0]);
    expect(durations).toEqual([500, 500]);
  });

  it.each(CASES)('rewinds home, pulses as a plus and settles as a dot at %s', (_label, grid) => {
    const { frames, durations } = generateAutomaton(grid, { variant: 'ant-home' });
    const home = frames[frames.length - 1];
    expect(countLit(home)).toBe(1);
    expect(countLit(frames[frames.length - 2])).toBe(PLUS_CELLS);
    expect(frames[frames.length - 3]).toEqual(home);
    expect(durations.slice(-2)).toEqual([160, 1500]);
  });

  it.each(CASES)(
    'freezes mid-scribble, blinks the ant twice and leaves the pattern at %s',
    (_label, grid) => {
      const { frames } = generateAutomaton(grid, { variant: 'ant-freeze' });
      const frozen = frames[frames.length - 1];
      const shown = frames[frames.length - 2];
      const antIndex = shown.findIndex((bit, index) => bit === 1 && frozen[index] === 0);
      expect(antIndex).toBeGreaterThanOrEqual(0);
      expect(withoutCell(shown, antIndex)).toEqual(frozen);
      expect(frames.slice(-5)).toEqual([frozen, shown, frozen, shown, frozen]);
      expect(countLit(frozen)).toBeGreaterThan(PLUS_CELLS);
    },
  );
});
