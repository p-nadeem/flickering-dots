import { describe, expect, it } from 'vitest';

import { generateParticles } from '../../../../src/core/recipes/particles';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { digest, toRows } from './clip-checks';

const GRID: GridSize = { cols: 9, rows: 9 };
const TAP = '000111000';
const SURFACE = '111111111';
const EMPTY = '000000000';
const FORM_MS = 600;
const STILL_MS = 400;
const HOLD_MS = 1500;

const PINS: readonly (readonly [string, RecipeParams, string])[] = [
  ['drip', { variant: 'drip' }, '14:805d2f42'],
  ['drip-form', { variant: 'drip-form' }, '2:b7759b8b'],
  ['drip-fill', { variant: 'drip-fill' }, '8:783d122b'],
  ['drip-miss', { variant: 'drip-miss' }, '8:f28e2d9a'],
];

function rowsOf(frame: Frame): string[] {
  return toRows(frame, GRID.cols).split(' ');
}

function dropRow(frame: Frame): number {
  const column = rowsOf(frame).map((row) => row[4]);
  return Math.max(...column.flatMap((bit, y) => (bit === '1' && y > 0 && y < GRID.rows - 2 ? [y] : [])));
}

describe('particles droplet variants', () => {
  it.each(PINS)('keeps the exact %s frames on the 9x9 grid', (_, params, pin) => {
    expect(digest(generateParticles(GRID, params))).toBe(pin);
  });

  it('stretches the drop at the tap, then lets it fall faster and faster', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'drip' });
    expect(rowsOf(frames[0])).toEqual([TAP, '000010000', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, SURFACE, EMPTY]);
    expect(rowsOf(frames[1]).slice(1, 3)).toEqual(['000010000', '000010000']);
    expect(durations.slice(0, 2)).toEqual([150, 150]);
    const fall = frames.slice(2, 6).map(dropRow);
    const steps = fall.slice(1).map((row, index) => row - fall[index]);
    expect(steps.every((step, index) => index === 0 || step >= steps[index - 1])).toBe(true);
  });

  it('opens a gap in the surface on impact, sends a V wave and splash dots, then rests 400 ms', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'drip' });
    expect(rowsOf(frames[6])[7]).toBe('111101111');
    expect(rowsOf(frames[7]).slice(6)).toEqual(['000101000', '111000111', '000111000']);
    expect(frames.some((frame) => rowsOf(frame)[5] === '001000100')).toBe(true);
    expect(rowsOf(frames[frames.length - 1])).toEqual(
      rowsOf(frames[0]).map((row, y) => (y === 1 ? EMPTY : row)),
    );
    expect(durations[durations.length - 1]).toBe(STILL_MS);
    expect(durations.reduce((sum, ms) => sum + ms, 0)).toBe(1250);
  });

  it('swells the drop at the tap and never lets it fall', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'drip-form' });
    expect(frames.map((frame) => rowsOf(frame).slice(1, 3))).toEqual([
      ['000010000', EMPTY],
      ['000010000', '000010000'],
    ]);
    expect(durations).toEqual([FORM_MS, FORM_MS]);
  });

  it('raises the surface a row after the drop lands and holds it', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'drip-fill' });
    expect(rowsOf(frames[frames.length - 1])).toEqual([
      TAP,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      EMPTY,
      SURFACE,
      SURFACE,
      EMPTY,
    ]);
    expect(durations[durations.length - 1]).toBe(HOLD_MS);
  });

  it('lets the drop fall off the bottom with no surface and leaves only the tap', () => {
    const { frames } = generateParticles(GRID, { variant: 'drip-miss' });
    expect(frames.every((frame) => rowsOf(frame)[7] !== SURFACE)).toBe(true);
    expect(frames.some((frame) => rowsOf(frame)[7] === '000010000')).toBe(true);
    expect(rowsOf(frames[frames.length - 1])).toEqual([TAP, ...Array.from({ length: 8 }, () => EMPTY)]);
  });
});
