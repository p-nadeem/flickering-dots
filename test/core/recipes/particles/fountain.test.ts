import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateParticles } from '../../../../src/core/recipes/particles';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { digest, toRows } from './clip-checks';

const GRID: GridSize = { cols: 11, rows: 11 };
const FRAME_MS = 50;
const LOOP_FRAMES = 60;
const DRAIN_MS = 60;
const BASIN = '11111111111';
const HOLD_MS = 1500;

const PINS: readonly (readonly [string, RecipeParams, string])[] = [
  ['jet', { variant: 'jet' }, '60:6dc4a5e7'],
  ['bubbler', { variant: 'jet', density: 0.3 }, '55:3e2b5450'],
  ['jet-progress', { variant: 'jet-progress' }, '60:3fced59d'],
  ['jet-burst', { variant: 'jet-burst' }, '65:638ce2de'],
  ['jet-sputter', { variant: 'jet-sputter' }, '87:5578ce97'],
];

function rowsOf(frame: Frame): string[] {
  return toRows(frame, GRID.cols).split(' ');
}

function topLitRow(frame: Frame): number {
  return rowsOf(frame).findIndex((row) => row.includes('1'));
}

function isNozzleLit(frame: Frame): boolean {
  return rowsOf(frame)[GRID.rows - 2][5] === '1';
}

describe('particles fountain variants', () => {
  it.each(PINS)('keeps the exact %s frames on the 11x11 grid', (_, params, pin) => {
    expect(digest(generateParticles(GRID, params))).toBe(pin);
  });

  it('plays 60 frames of 50 ms with the basin and the nozzle always lit', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'jet' });
    expect(frames).toHaveLength(LOOP_FRAMES);
    expect(durations.every((ms) => ms === FRAME_MS)).toBe(true);
    expect(frames.every((frame) => rowsOf(frame)[GRID.rows - 1] === BASIN && isNozzleLit(frame))).toBe(true);
  });

  it('keeps the jet inside the grid and breathes its height with the pressure pulse', () => {
    const tops = generateParticles(GRID, { variant: 'jet' }).frames.map(topLitRow);
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...tops) - Math.min(...tops)).toBeGreaterThanOrEqual(2);
  });

  it('keeps the density 0.3 bubbler within 3 rows of the basin', () => {
    const { frames } = generateParticles(GRID, { variant: 'jet', density: 0.3 });
    expect(Math.min(...frames.map(topLitRow))).toBeGreaterThanOrEqual(GRID.rows - 4);
  });

  it('raises the progress jet steadily to full height by the end of the loop', () => {
    const tops = generateParticles(GRID, { variant: 'jet-progress' }).frames.map(topLitRow);
    const low = Math.min(...tops.slice(20, 25));
    const late = Math.min(...tops.slice(55));
    expect(low).toBeGreaterThan(late + 2);
    expect(late).toBeLessThanOrEqual(3);
  });

  it('shoots the burst to the top row, settles into the bubbler and draws the tick above the basin', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'jet-burst' });
    const tick = glyphMask('check', GRID);
    const last = frames[frames.length - 1];
    const bubbling = frames.filter((frame) => topLitRow(frame) >= GRID.rows - 4 && isNozzleLit(frame));
    expect(Math.min(...frames.map(topLitRow))).toBe(0);
    expect(bubbling.length).toBeGreaterThan(0);
    expect(rowsOf(last)[GRID.rows - 1]).toBe(BASIN);
    tick.forEach((bit, index) => bit === 1 && expect(last[index]).toBe(1));
    expect(durations[durations.length - 1]).toBe(HOLD_MS);
  });

  it('sputters, stops the nozzle, drains the basin left to right at 60 ms a dot and ends on the cross', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'jet-sputter' });
    const drainedAt = frames.findIndex((frame) => frame.every((bit) => bit === 0));
    const drain = frames
      .slice(drainedAt - GRID.cols + 1, drainedAt + 1)
      .map((frame) => rowsOf(frame)[GRID.rows - 1]);
    expect(drain[0]).toBe('01111111111');
    expect(drain[drain.length - 1]).toBe('00000000000');
    expect(durations.slice(drainedAt - GRID.cols + 1, drainedAt)).toEqual(
      Array.from({ length: GRID.cols - 1 }, () => DRAIN_MS),
    );
    expect(isNozzleLit(frames[drainedAt - GRID.cols])).toBe(false);
    expect(frames[frames.length - 1]).toEqual(glyphMask('cross', GRID));
    expect(durations[durations.length - 1]).toBe(HOLD_MS);
  });
});
