import { describe, expect, it } from 'vitest';

import { LIFE_DEFAULTS, generateLife } from '../../../src/core/recipes/life';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toFrameText, toOutputText } from './frame-text';

const FLEET_GRID = { cols: 12, rows: 12 };
const FLEET_LOOP = 48;
const GLIDER_CELLS = 5;
const GLIDER_PERIOD = 4;
const FLEET_SPACING = 4;

function shiftDiagonal(frame: Frame, grid: GridSize, step: number): Frame {
  return frame.map((_, index) => {
    const x = (index % grid.cols) - step;
    const y = Math.floor(index / grid.cols) - step;
    const wrappedX = ((x % grid.cols) + grid.cols) % grid.cols;
    const wrappedY = ((y % grid.rows) + grid.rows) % grid.rows;
    return frame[wrappedY * grid.cols + wrappedX];
  });
}

function getMargins(frame: Frame, grid: GridSize): { x: number; y: number } {
  const lit = frame.flatMap((bit, index) => (bit === 1 ? [index] : []));
  const xs = lit.map((index) => index % grid.cols);
  const ys = lit.map((index) => Math.floor(index / grid.cols));
  const left = Math.min(...xs);
  const right = grid.cols - 1 - Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = grid.rows - 1 - Math.max(...ys);
  return { x: Math.abs(left - right), y: Math.abs(top - bottom) };
}

describe('generateLife', () => {
  it('reproduces the prototype frames on 6x6 with default params', () => {
    expect(toOutputText(generateLife({ cols: 6, rows: 6 }, {}), 6)).toEqual({
      frames: [
        '010001 100001 001001 100101 000001 001000',
        '010001 010011 010000 100001 100011 100000',
        '010011 011011 010010 010010 010010 010010',
        '010000 011000 010010 111111 111111 011110',
        '100000 111000 000010 000000 000000 000000',
        '100000 110001 010000 000000 000000 000000',
        '110001 010001 010000 000000 000000 000000',
        '010001 011001 100000 000000 000000 100000',
        '011001 011001 110000 000000 000000 100000',
        '001001 000001 111000 000000 000000 110000',
        '010001 001001 110000 010000 000000 110000',
        '011001 001001 111000 110000 110000 110000',
        '001001 000101 001001 000001 001001 000001',
        '100001 101101 100001 100011 100011 100011',
        '000100 000000 000100 010000 010100 010000',
        '000000 000000 000000 000000 110000 000000',
      ],
      durations: [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120],
    });
  });

  it('reproduces the prototype frames on 5x5 with seed 1, frames 6, density 0.1', () => {
    expect(toOutputText(generateLife({ cols: 5, rows: 5 }, { seed: 1, frames: 6, density: 0.1 }), 5)).toEqual(
      {
        frames: [
          '00000 00000 11000 00000 10000',
          '00000 00000 00000 11000 00000',
          '00000 00100 00000 10000 01000',
          '00000 00000 00000 00000 10000',
          '00000 00001 00000 00000 00000',
          '00001 00000 00000 00000 00000',
        ],
        durations: [120, 120, 120, 120, 120, 120],
      },
    );
  });

  it('keeps the same frames for the same seed', () => {
    const grid = { cols: 12, rows: 12 };
    expect(LIFE_DEFAULTS).toEqual({ seed: 11, frames: 16, density: 0.35 });
    expect(generateLife(grid, { seed: 5 })).toEqual(generateLife(grid, { seed: 5 }));
    expect(generateLife(grid, { frames: 0 })).toEqual(generateLife(grid, LIFE_DEFAULTS));
  });
});

describe('generateLife glider fleet at zero density', () => {
  it('starts three gliders on one diagonal, 4 cells apart, each one generation further on', () => {
    const output = generateLife(FLEET_GRID, { density: 0, frames: FLEET_LOOP });
    expect(toFrameText(output.frames[0], FLEET_GRID.cols)).toBe(
      '010000000000 001000000000 111000000000 000000000000 000010100000 000001100000 ' +
        '000001000000 000000000000 000000000010 000000001010 000000000110 000000000000',
    );
  });

  it('loops seamlessly on 12x12 only after all 48 generations', () => {
    const output = generateLife(FLEET_GRID, { density: 0, frames: FLEET_LOOP + 1 });
    expect(output.frames[FLEET_LOOP]).toEqual(output.frames[0]);
    expect(output.frames.slice(1, FLEET_LOOP)).not.toContainEqual(output.frames[0]);
    expect(output.frames[FLEET_SPACING * GLIDER_PERIOD]).not.toEqual(output.frames[0]);
  });

  it('defaults to one full loop at 120 ms per frame', () => {
    const output = generateLife(FLEET_GRID, { density: 0 });
    expect(output.frames).toHaveLength(FLEET_LOOP);
    expect(output.durations).toEqual(Array.from({ length: FLEET_LOOP }, () => 120));
    expect(generateLife(FLEET_GRID, { density: 0, frames: FLEET_LOOP })).toEqual(output);
  });

  it('keeps every glider whole: 15 lit cells in every generation, never interacting', () => {
    const { frames } = generateLife(FLEET_GRID, { density: 0 });
    expect(frames.every((frame) => countLit(frame) === 3 * GLIDER_CELLS)).toBe(true);
    frames.slice(GLIDER_PERIOD).forEach((frame, index) => {
      expect(frame).toEqual(shiftDiagonal(frames[index], FLEET_GRID, 1));
    });
  });

  it.each([
    [5, 5, 1],
    [7, 7, 1],
    [8, 8, 2],
    [9, 9, 2],
    [16, 16, 4],
    [12, 8, 2],
    [8, 6, 1],
    [12, 5, 1],
  ])('fits floor(min/4) gliders on %ix%i, centred and looping after 4 * lcm', (cols, rows, count) => {
    const grid = { cols, rows };
    const { frames } = generateLife(grid, { density: 0 });
    const loop = frames.length;
    const next = generateLife(grid, { density: 0, frames: loop + 1 }).frames[loop];
    expect(next).toEqual(frames[0]);
    expect(frames.every((frame) => countLit(frame) === count * GLIDER_CELLS)).toBe(true);
    const margins = getMargins(frames[0], grid);
    expect(margins.x).toBeLessThanOrEqual(1);
    expect(margins.y).toBeLessThanOrEqual(1);
  });

  it('uses 4 * lcm(cols, rows) frames on non-square grids', () => {
    expect(generateLife({ cols: 8, rows: 6 }, { density: 0 }).frames).toHaveLength(96);
    expect(generateLife({ cols: 7, rows: 7 }, { density: 0 }).frames).toHaveLength(28);
  });

  it('falls back to the default seeded soup when a glider cannot fit', () => {
    const grid = { cols: 4, rows: 4 };
    expect(generateLife(grid, { density: 0 })).toEqual(
      generateLife(grid, { density: LIFE_DEFAULTS.density }),
    );
    expect(generateLife({ cols: 10, rows: 3 }, { density: 0, seed: 2 })).toEqual(
      generateLife({ cols: 10, rows: 3 }, { density: LIFE_DEFAULTS.density, seed: 2 }),
    );
  });
});
