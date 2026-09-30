import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateGranular } from '../../../../src/core/recipes/granular';
import { getHourglassLayout } from '../../../../src/core/recipes/granular/hourglass-layout';
import type { Frame, GridSize } from '../../../../src/core/types';

import { countLit, toFrameText } from '../frame-text';
import { gridsFrom, hashFrames, labelGrids } from './checks';

const SET_GRID: GridSize = { cols: 9, rows: 11 };
const GRIDS = gridsFrom(7, 9);
const STEP_MS = 60;
const SLOW_STEP_MS = 200;

const FULL =
  '000000000 011111110 001111100 000111000 000010000 000000000 000000000 000000000 000000000 000000000 000000000';
const EMPTY_TOP_CONE =
  '000000000 000000000 000000000 000000000 000000000 000000000 000000000 000010000 000111000 001111100 011111110';
const FULL_WITH_BASE =
  '000000000 011111110 001111100 000111000 000010000 000000000 000000000 000000000 000000000 000000000 010000010';
const HALF_DRAINED =
  '000000000 010000010 001000100 000111000 000010000 000010000 000010000 000000000 000010000 000111000 001111100';

function text(frame: Frame, grid: GridSize = SET_GRID): string {
  return toFrameText(frame, grid.cols);
}

function isLit(frame: Frame, { cols }: GridSize, x: number, y: number): boolean {
  return frame[y * cols + x] === 1;
}

function hasFloatingGrain(frame: Frame, grid: GridSize): boolean {
  const [, neckY] = getHourglassLayout(grid).neck;
  return Array.from({ length: neckY - 1 }, (_, y) => y).some((y) =>
    Array.from({ length: grid.cols }, (_, x) => x).some(
      (x) => isLit(frame, grid, x, y) && ![x - 1, x, x + 1].some((below) => isLit(frame, grid, below, y + 1)),
    ),
  );
}

function mirror(frame: Frame, { cols }: GridSize): Frame {
  return frame.map((_, index) => frame[index - (index % cols) + (cols - 1 - (index % cols))]);
}

describe('granular hourglass', () => {
  it('drains 16 grains at the set grid in two 60 ms sub-frames each, holds 400 ms, then turns', () => {
    const { frames, durations, still } = generateGranular(SET_GRID, { variant: 'hourglass' });
    expect(frames).toHaveLength(34);
    expect(durations).toEqual([200, ...Array.from({ length: 32 }, () => STEP_MS), 400]);
    expect(text(frames[0])).toBe(FULL);
    expect(text(frames[frames.length - 1])).toBe(EMPTY_TOP_CONE);
    expect(still).toBe(17);
    expect(text(frames[17])).toBe(HALF_DRAINED);
    expect(hashFrames(frames)).toBe('27ceb37f');
  });

  it('defaults to the hourglass variant', () => {
    expect(generateGranular(SET_GRID)).toEqual(generateGranular(SET_GRID, { variant: 'hourglass' }));
  });

  it('draws a dashed stream whose dashes swap each sub-frame', () => {
    const { frames } = generateGranular(SET_GRID, { variant: 'hourglass' });
    expect(text(frames[1])).toBe(
      '000000000 011111110 001111100 000111000 000010000 000010000 000010000 000000000 000010000 000000000 000010000',
    );
    expect(text(frames[2])).toBe(
      '000000000 011111110 001111100 000111000 000010000 000010000 000000000 000010000 000000000 000010000 000000000',
    );
  });

  it.each(labelGrids(GRIDS))('turns back to full with the same lit count on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'hourglass' });
    const grains = getHourglassLayout(grid).drain.length;
    expect(countLit(frames[0])).toBe(grains);
    expect(countLit(frames[frames.length - 1])).toBe(grains);
  });

  it.each(labelGrids(GRIDS))('fills the pile evenly on both sides of the stream on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'hourglass' });
    const [neckX, neckY] = getHourglassLayout(grid).neck;
    const leads = frames.map((frame) => {
      const below = frame.flatMap((bit, index) =>
        bit === 1 && Math.floor(index / grid.cols) > neckY ? [index % grid.cols] : [],
      );
      const lead = below.filter((x) => x < neckX).length - below.filter((x) => x > neckX).length;
      expect(Math.abs(lead)).toBeLessThanOrEqual(1);
      return lead;
    });
    expect(leads.includes(1) && leads.includes(-1)).toBe(true);
  });

  it.each(labelGrids(GRIDS))('never leaves a grain floating in the top chamber on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'hourglass' });
    expect(frames.some((frame) => hasFloatingGrain(frame, grid))).toBe(false);
  });

  it.each(labelGrids(GRIDS.filter(({ cols }) => cols % 2 === 1)))(
    'starts and ends mirror-symmetric on odd widths such as %s',
    (_, grid) => {
      const { frames } = generateGranular(grid, { variant: 'hourglass' });
      const ends = [frames[0], frames[frames.length - 1]];
      ends.forEach((frame) => expect(mirror(frame, grid)).toEqual(frame));
    },
  );

  it('fits the smallest readable grid with a full-width glass', () => {
    const grid = { cols: 7, rows: 9 };
    expect(text(generateGranular(grid, { variant: 'hourglass-full' }).frames[0], grid)).toBe(
      '0000000 0111110 0011100 0001000 0000000 0000000 0000000 0000000 0100010',
    );
  });

  it('centres the glass with the spare row above and the spare column left', () => {
    const grid = { cols: 8, rows: 10 };
    expect(getHourglassLayout(grid).neck).toEqual([4, 5]);
    expect(text(generateGranular(grid, { variant: 'hourglass-full' }).frames[0], grid)).toBe(
      '00000000 00000000 00111110 00011100 00001000 00000000 00000000 00000000 00000000 00100010',
    );
  });
});

describe('granular hourglass-full, hourglass-slow and hourglass-progress', () => {
  it('holds the full top chamber with no stream over the corners of the empty bottom chamber', () => {
    const output = generateGranular(SET_GRID, { variant: 'hourglass-full' });
    expect(output.durations).toEqual([1200]);
    expect(text(output.frames[0])).toBe(FULL_WITH_BASE);
  });

  it('drains the same pictures at 400 ms per grain', () => {
    const slow = generateGranular(SET_GRID, { variant: 'hourglass-slow' });
    expect(slow.frames).toEqual(generateGranular(SET_GRID, { variant: 'hourglass' }).frames);
    expect(slow.durations).toEqual([200, ...Array.from({ length: 32 }, () => SLOW_STEP_MS), 400]);
  });

  it('steps through seeded progress updates and rests between them', () => {
    const { frames, durations } = generateGranular(SET_GRID, { variant: 'hourglass-progress' });
    expect(frames).toHaveLength(38);
    expect(durations.filter((ms) => ms === 480)).toHaveLength(4);
    expect(text(frames[0])).toBe(FULL);
    expect(text(frames[frames.length - 1])).toBe(EMPTY_TOP_CONE);
    expect(hashFrames(frames)).toBe('6cc936af');
  });

  it('changes its steps with the seed', () => {
    const one = generateGranular(SET_GRID, { variant: 'hourglass-progress', seed: 1 });
    const two = generateGranular(SET_GRID, { variant: 'hourglass-progress', seed: 2 });
    expect(one.durations).not.toEqual(two.durations);
  });
});

describe('granular hourglass-done and hourglass-jam', () => {
  it('lands the last grains, holds the mound 400 ms, then flows into the check', () => {
    const { frames, durations } = generateGranular(SET_GRID, { variant: 'hourglass-done' });
    expect(durations).toEqual([60, 60, 60, 60, 60, 60, 400, 60, 60, 60, 60, 60, 700]);
    expect(text(frames[6])).toBe(EMPTY_TOP_CONE);
    expect(frames[frames.length - 1]).toEqual(glyphMask('check', SET_GRID));
    expect(hashFrames(frames)).toBe('a416d5dd');
  });

  it.each(labelGrids(GRIDS))('ends on the check glyph on %s', (_, grid) => {
    const { frames } = generateGranular(grid, { variant: 'hourglass-done' });
    expect(frames[frames.length - 1]).toEqual(glyphMask('check', grid));
  });

  it('stops the stream mid-fall, blinks the whole stream twice at 250 ms and flows into the cross', () => {
    const { frames, durations } = generateGranular(SET_GRID, { variant: 'hourglass-jam' });
    const [neckX, neckY] = getHourglassLayout(SET_GRID).neck;
    const stream = [neckY, neckY + 1, neckY + 2].map((y) => y * SET_GRID.cols + neckX);
    expect(durations.slice(4, 8)).toEqual([250, 250, 250, 250]);
    frames.slice(4, 8).forEach((frame, index) => {
      const lit = stream.filter((cell) => frame[cell] === 1).length;
      expect(lit > 0).toBe(index % 2 === 0);
    });
    expect(frames[frames.length - 1]).toEqual(glyphMask('cross', SET_GRID));
    expect(durations[durations.length - 1]).toBe(1500);
  });
});
