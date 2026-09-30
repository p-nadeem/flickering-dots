import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateProjection } from '../../../../src/core/recipes/projection';
import type { Frame } from '../../../../src/core/types';

import { changedCells, largestStep, litCount, maxBigChangesPerSecond } from './clip-checks';

const GRID = { cols: 16, rows: 16 };
const CELLS = GRID.cols * GRID.rows;
const BIG_SHARE = 0.2;
const MAX_THINKING_MS = 100;
const MIN_THINKING_MS = 80;
const HOLD_MS = 1500;
const FIRST_SECOND_MS = 1000;

function has2x2Block(frame: Frame, cols: number): boolean {
  return frame.some((bit, index) => {
    const x = index % cols;
    return (
      bit === 1 &&
      x < cols - 1 &&
      frame[index + 1] === 1 &&
      frame[index + cols] === 1 &&
      frame[index + cols + 1] === 1
    );
  });
}

function framesInFirstSecond(durations: readonly number[]): number {
  return durations.reduce((count, _, index) => {
    const start = durations.slice(0, index).reduce((sum, ms) => sum + ms, 0);
    return start < FIRST_SECOND_MS ? count + 1 : count;
  }, 0);
}

describe('projection cloud thinking', () => {
  const { frames, durations, still } = generateProjection(GRID, { variant: 'cloud' });

  it('plays at 80 to 100 ms a frame', () => {
    durations.forEach((ms) => {
      expect(ms).toBeGreaterThanOrEqual(MIN_THINKING_MS);
      expect(ms).toBeLessThanOrEqual(MAX_THINKING_MS);
    });
  });

  it('never changes a fifth of the grid in one step, so the points can be tracked', () => {
    expect(largestStep([...frames, frames[0]])).toBeLessThan(BIG_SHARE * CELLS);
    expect(maxBigChangesPerSecond({ frames, durations }, true)).toBe(0);
  });

  it('draws near points as 2x2 balls', () => {
    expect(frames.filter((frame) => has2x2Block(frame, GRID.cols)).length).toBeGreaterThan(frames.length / 2);
  });

  it('keeps the cloud small: at most 60 lit dots in any frame', () => {
    frames.forEach((frame) => expect(litCount(frame)).toBeLessThanOrEqual(60));
  });

  it('holds one shape through the first second', () => {
    const early = frames.slice(0, framesInFirstSecond(durations));
    early
      .slice(1)
      .forEach((frame, index) => expect(changedCells(early[index], frame)).toBeLessThan(CELLS / 10));
  });

  it('names a held frame as its still', () => {
    expect(still).toBeDefined();
    expect(litCount(frames[still ?? 0])).toBeGreaterThan(0);
  });
});

describe('projection cloud idle and results', () => {
  it('turns the ball sphere once per 126 frames at 120 ms when idle', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'cloud', glyph: 'sphere' });

    expect(frames).toHaveLength(126);
    expect(new Set(durations)).toEqual(new Set([120]));
    expect(largestStep([...frames, frames[0]])).toBeLessThan(BIG_SHARE * CELLS);
  });

  it('takes the idle loop length from frames', () => {
    expect(generateProjection(GRID, { variant: 'cloud', glyph: 'sphere', frames: 48 }).frames).toHaveLength(
      48,
    );
  });

  it('flows into the flat check facing the viewer and holds it', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'cloud', glyph: 'check' });

    expect(durations.at(-1)).toBe(HOLD_MS);
    durations.slice(0, -1).forEach((ms) => expect(ms).toBeLessThanOrEqual(MAX_THINKING_MS));
    expect(frames.at(-1)).toEqual(glyphMask('check', GRID));
  });

  it('shakes the whole cross after forming it, not only its corner dots', () => {
    const { frames } = generateProjection(GRID, { variant: 'cloud', glyph: 'cross' });
    const cross = glyphMask('cross', GRID);
    const shake = frames.slice(-4, -1);

    expect(frames.at(-1)).toEqual(cross);
    expect(Math.max(...shake.map((frame) => changedCells(frame, cross)))).toBeGreaterThanOrEqual(
      litCount(cross),
    );
  });
});
