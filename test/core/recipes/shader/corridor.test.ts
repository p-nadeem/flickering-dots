import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateCheck } from '../../../../src/core/recipes/check';
import { generateShader } from '../../../../src/core/recipes/shader';
import type { Frame } from '../../../../src/core/types';

import { countLit } from '../frame-text';
import { countChanged, isMirroredBothWays, toRows, totalMs } from './checks';

const CORRIDOR = { cols: 9, rows: 9 };
const HOVER_MS = 600;
const LAND_STEPS_MS = [150, 220, 320];
const HOLD_MS = 1500;
const COLLAPSE_MS = 90;
const BLINK_MS = 250;
const ERROR_HOLD_MS = 1000;
const INSET = 2;
const THINKING_MS = 175;
const MAX_CHANGE_SHARE = 0.85;
const CELLS = CORRIDOR.cols * CORRIDOR.rows;

function largestLoopChange(frames: readonly Frame[]): number {
  return frames.reduce(
    (most, frame, index) =>
      Math.max(most, countChanged(frames[(index + frames.length - 1) % frames.length], frame)),
    0,
  );
}

function isBorderLit(rows: readonly string[]): boolean {
  const last = rows.length - 1;
  const isEdgeRow = (row: string) => [...row].every((bit) => bit === '1');
  const isEdgeCol = rows.every((row) => row[0] === '1' && row[row.length - 1] === '1');
  return isEdgeRow(rows[0]) && isEdgeRow(rows[last]) && isEdgeCol;
}

describe('shader corridor', () => {
  it('rushes rings three steps apart out of a drifting vanishing point at a steady pace', () => {
    const output = generateShader(CORRIDOR, { variant: 'corridor' });

    expect(output.frames).toHaveLength(12);
    output.durations.forEach((ms) => expect(ms).toBe(THINKING_MS));
    expect(output.frames.some((frame) => !isMirroredBothWays(frame, CORRIDOR.cols))).toBe(true);
  });

  it('shows at least three ring phases so the thinking rings read as moving outward', () => {
    const output = generateShader(CORRIDOR, { variant: 'corridor' });
    const phases = new Set(output.frames.slice(0, 3).map((frame) => frame.join('')));

    expect(phases.size).toBe(3);
    expect(largestLoopChange(output.frames)).toBeLessThanOrEqual(MAX_CHANGE_SHARE * CELLS);
  });

  it('hovers with centred rings that creep outward one step every 600 ms', () => {
    const output = generateShader(CORRIDOR, { variant: 'corridor-hover' });

    expect(output.frames).toHaveLength(3);
    output.durations.forEach((ms) => expect(ms).toBe(HOVER_MS));
    output.frames.forEach((frame) => expect(isMirroredBothWays(frame, CORRIDOR.cols)).toBe(true));
    expect(largestLoopChange(output.frames)).toBeLessThanOrEqual(MAX_CHANGE_SHARE * CELLS);
  });

  it('rushes centred rings faster per step than the thinking loop', () => {
    const rush = generateShader(CORRIDOR, { variant: 'corridor-rush' });
    const thinking = generateShader(CORRIDOR, { variant: 'corridor' });

    rush.frames.forEach((frame) => expect(isMirroredBothWays(frame, CORRIDOR.cols)).toBe(true));
    expect(totalMs(rush) / rush.frames.length).toBeLessThan(totalMs(thinking) / thinking.frames.length);
  });

  it('lands with three slowing steps and frames the tick in the outer ring', () => {
    const output = generateShader(CORRIDOR, { variant: 'corridor-land' });
    const last = output.frames[output.frames.length - 1];
    const rows = toRows(last, CORRIDOR.cols);
    const inner = rows.slice(INSET, -INSET).map((row) => row.slice(INSET, -INSET));
    const tick = toRows(glyphMask('check', { cols: 5, rows: 5 }), 5);

    expect(output.durations.slice(0, 3)).toEqual(LAND_STEPS_MS);
    expect(output.durations[output.durations.length - 1]).toBe(HOLD_MS);
    expect(isBorderLit(rows)).toBe(true);
    expect(rows[1]).toBe('100000001');
    expect(inner).toEqual(tick);
  });

  it('lands on the plain tick when the grid has no room for a frame', () => {
    const grid = { cols: 5, rows: 5 };
    const output = generateShader(grid, { variant: 'corridor-land' });
    const check = generateCheck(grid);

    expect(output.frames[output.frames.length - 1]).toEqual(check.frames[check.frames.length - 1]);
  });

  it('lands without inverting the whole grid', () => {
    const output = generateShader(CORRIDOR, { variant: 'corridor-land' });

    output.frames.slice(1).forEach((frame, index) => {
      expect(countChanged(output.frames[index], frame)).toBeLessThanOrEqual(MAX_CHANGE_SHARE * CELLS);
    });
  });

  it('collapses the rings, then blinks the last ring twice', () => {
    const output = generateShader(CORRIDOR, { variant: 'corridor-reverse' });
    const blink = output.frames.slice(-5).map(countLit);

    expect(output.durations.slice(0, 4)).toEqual([COLLAPSE_MS, COLLAPSE_MS, COLLAPSE_MS, COLLAPSE_MS]);
    expect(output.durations.slice(-4)).toEqual([BLINK_MS, BLINK_MS, BLINK_MS, ERROR_HOLD_MS]);
    expect(blink).toEqual([8, 0, 8, 0, 8]);
  });
});
