import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateParticles } from '../../../../src/core/recipes/particles';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { digest, toRows } from './clip-checks';

const ELEVEN: GridSize = { cols: 11, rows: 11 };
const THIRTEEN: GridSize = { cols: 13, rows: 13 };
const RISE_MS = 50;
const FLASH_MS = 80;
const SPARK_MS = 70;
const RING_HOLD_MS = 600;
const MIN_CELEBRATE_MS = 33;
const PLUS_LIT = 5;

const PINS: readonly (readonly [string, RecipeParams, GridSize, string])[] = [
  ['ember', { variant: 'ember' }, ELEVEN, '2:3a0fc0cf'],
  ['fuse', { variant: 'fuse' }, ELEVEN, '10:37b1b9ae'],
  ['burst', { variant: 'burst' }, ELEVEN, '14:1a2ade2d'],
  ['burst of three shells', { variant: 'burst', length: 3 }, THIRTEEN, '31:a9cf3cf0'],
  ['dud', { variant: 'dud' }, ELEVEN, '28:1163508b'],
];

function countLit(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}

function isMirroredLeftRight(frame: Frame, cols: number): boolean {
  return toRows(frame, cols)
    .split(' ')
    .every((row) => row === [...row].reverse().join(''));
}

describe('particles fireworks variants', () => {
  it.each(PINS)('keeps the exact %s frames on its set grid', (_, params, grid, pin) => {
    expect(digest(generateParticles(grid, params))).toBe(pin);
  });

  it('glows one ember at the bottom middle, then goes dark', () => {
    const { frames, durations } = generateParticles(ELEVEN, { variant: 'ember' });
    expect(frames.map((frame) => toRows(frame, ELEVEN.cols).split(' ')[10])).toEqual([
      '00000100000',
      '00000000000',
    ]);
    expect(durations).toEqual([900, 300]);
  });

  it('climbs a row every 50 ms with a trail right below and pops a plus at the apex before the dark', () => {
    const { frames, durations } = generateParticles(ELEVEN, { variant: 'fuse' });
    expect(toRows(frames[2], ELEVEN.cols)).toBe(
      '00000000000 00000000000 00000000000 00000000000 00000000000 00000000000 00000000000 00000000000 00000100000 00000100000 00000000000',
    );
    expect(durations.slice(0, 7)).toEqual(Array.from({ length: 7 }, () => RISE_MS));
    expect(Math.max(...frames.map(countLit))).toBe(PLUS_LIT);
    expect(countLit(frames[frames.length - 1])).toBe(0);
  });

  it('flashes a plus at the apex for 80 ms and opens a ring of sparks mirrored left to right', () => {
    const { frames, durations } = generateParticles(ELEVEN, { variant: 'burst' });
    const flash = frames.findIndex((frame) => countLit(frame) === PLUS_LIT);
    expect(durations[flash]).toBe(FLASH_MS);
    expect(durations[flash + 1]).toBe(SPARK_MS);
    frames.slice(flash).forEach((frame) => expect(isMirroredLeftRight(frame, ELEVEN.cols)).toBe(true));
  });

  it('holds the burst ring for 600 ms, then blooms and holds the sparkle as its still', () => {
    const output = generateParticles(ELEVEN, { variant: 'burst' });
    const { frames, durations } = output;
    const last = frames.length - 1;
    expect(durations).toContain(RING_HOLD_MS);
    expect(frames[last]).toEqual(glyphMask('sparkle', ELEVEN));
    expect(durations[last]).toBe(1500);
    expect(output.still).toBe(last);
  });

  it('merges the celebrate slivers so every frame shows for at least 33 ms', () => {
    const { durations } = generateParticles(ELEVEN, { variant: 'burst', length: 3 });
    expect(Math.min(...durations)).toBeGreaterThanOrEqual(MIN_CELEBRATE_MS);
  });

  it('throws 8 sparks below 13 columns and 12 from 13', () => {
    const sparkCount = (grid: GridSize) => {
      const { frames, durations } = generateParticles(grid, { variant: 'burst' });
      return countLit(frames[durations.indexOf(RING_HOLD_MS)]);
    };
    expect(sparkCount(ELEVEN)).toBeLessThanOrEqual(8);
    expect(sparkCount(THIRTEEN)).toBeGreaterThan(8);
    expect(sparkCount(THIRTEEN)).toBeLessThanOrEqual(12);
  });

  it('launches three staggered shells for length 3 and ends on an empty sky', () => {
    const { frames } = generateParticles(THIRTEEN, { variant: 'burst', length: 3 });
    const bottomRow = (frame: Frame) => toRows(frame, THIRTEEN.cols).split(' ')[12];
    const launches = frames.slice(0, 2).map(bottomRow);
    expect(launches).toEqual(['0000001000000', '0000001000000']);
    const launchColumns = [6, 3, 9];
    launchColumns.forEach((column) =>
      expect(frames.map(bottomRow).some((row) => row[column] === '1')).toBe(true),
    );
    expect(countLit(frames[frames.length - 1])).toBe(0);
  });

  it.each([ELEVEN, THIRTEEN])(
    'holds every frame of three staggered shells for at least one display frame at %o',
    (grid) => {
      const { durations } = generateParticles(grid, { variant: 'burst', length: 3 });

      expect(Math.min(...durations)).toBeGreaterThanOrEqual(16);
    },
  );

  it('falls back as two dots and finishes on the cross for the dud', () => {
    const { frames, durations } = generateParticles(ELEVEN, { variant: 'dud' });
    expect(toRows(frames[4], ELEVEN.cols).split(' ')[9]).toBe('00001010000');
    expect(frames[frames.length - 1]).toEqual(glyphMask('cross', ELEVEN));
    expect(durations[durations.length - 1]).toBe(1500);
  });
});
