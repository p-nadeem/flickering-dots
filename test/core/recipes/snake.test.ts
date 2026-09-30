import { describe, expect, it } from 'vitest';

import { getPerimeterPoints } from '../../../src/core/recipes/helpers';
import { generateSnake } from '../../../src/core/recipes/snake';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toFrameText, toOutputText } from './frame-text';

const LAP_MS = 880;
const MIN_FRAME_MS = 40;
const MAX_FRAME_MS = 110;
const MAX_FLASHES_PER_SECOND = 3;
const GRIDS: GridSize[] = [
  { cols: 3, rows: 3 },
  { cols: 4, rows: 3 },
  { cols: 5, rows: 5 },
  { cols: 7, rows: 7 },
  { cols: 9, rows: 9 },
  { cols: 12, rows: 5 },
  { cols: 16, rows: 8 },
];

function litIndexes(frame: Frame): number[] {
  return frame.flatMap((bit, index) => (bit === 1 ? [index] : []));
}

function perimeterIndexes(grid: GridSize): number[] {
  return getPerimeterPoints(grid).map(([x, y]) => y * grid.cols + x);
}

function rotateClockwise(frame: Frame, side: number): Frame {
  return frame.map((_, index) => {
    const x = index % side;
    const y = Math.floor(index / side);
    return frame[(side - 1 - x) * side + y];
  });
}

describe('generateSnake', () => {
  it('keeps the approved 5x5 frames at 55 ms a step', () => {
    expect(toOutputText(generateSnake({ cols: 5, rows: 5 }, {}), 5)).toEqual({
      frames: [
        '10000 10000 10000 10000 00000',
        '11000 10000 10000 00000 00000',
        '11100 10000 00000 00000 00000',
        '11110 00000 00000 00000 00000',
        '01111 00000 00000 00000 00000',
        '00111 00001 00000 00000 00000',
        '00011 00001 00001 00000 00000',
        '00001 00001 00001 00001 00000',
        '00000 00001 00001 00001 00001',
        '00000 00000 00001 00001 00011',
        '00000 00000 00000 00001 00111',
        '00000 00000 00000 00000 01111',
        '00000 00000 00000 00000 11110',
        '00000 00000 00000 10000 11100',
        '00000 00000 10000 10000 11000',
        '00000 10000 10000 10000 10000',
      ],
      durations: Array.from({ length: 16 }, () => 55),
    });
  });

  it('draws the braille ring on 3x3: a 3-dot arc stepping clockwise at 110 ms with the centre off', () => {
    expect(toOutputText(generateSnake({ cols: 3, rows: 3 }, {}), 3)).toEqual({
      frames: [
        '100 100 100',
        '110 100 000',
        '111 000 000',
        '011 001 000',
        '001 001 001',
        '000 001 011',
        '000 000 111',
        '000 100 110',
      ],
      durations: Array.from({ length: 8 }, () => 110),
    });
  });

  it('turns the 3x3 ring by a quarter every two frames', () => {
    const { frames } = generateSnake({ cols: 3, rows: 3 }, {});
    frames.forEach((frame, index) => {
      expect(rotateClockwise(frame, 3)).toEqual(frames[(index + 2) % frames.length]);
    });
  });

  it('keeps the 4x3 length 2 frames and scales the step to the 10-cell edge', () => {
    expect(toOutputText(generateSnake({ cols: 4, rows: 3 }, { length: 2 }), 4)).toEqual({
      frames: [
        '1000 1000 0000',
        '1100 0000 0000',
        '0110 0000 0000',
        '0011 0000 0000',
        '0001 0001 0000',
        '0000 0001 0001',
        '0000 0000 0011',
        '0000 0000 0110',
        '0000 0000 1100',
        '0000 1000 1000',
      ],
      durations: Array.from({ length: 10 }, () => 88),
    });
  });

  it('runs once around the edge with a quarter-length tail by default', () => {
    const output = generateSnake({ cols: 8, rows: 8 }, {});
    expect(output.frames).toHaveLength(28);
    expect(output.frames.map(countLit)).toEqual(Array.from({ length: 28 }, () => 7));
  });

  it.each(GRIDS)('scales frame time to one 880 ms lap within 40 to 110 ms on $cols x $rows', (grid) => {
    const { durations } = generateSnake(grid, {});
    const pathLength = getPerimeterPoints(grid).length;
    const expected = Math.min(MAX_FRAME_MS, Math.max(MIN_FRAME_MS, Math.round(LAP_MS / pathLength)));
    expect(durations).toEqual(Array.from({ length: pathLength }, () => expected));
  });

  it('clamps the step to 40 ms on long edges and 110 ms on tiny ones', () => {
    expect(new Set(generateSnake({ cols: 16, rows: 16 }, {}).durations)).toEqual(new Set([MIN_FRAME_MS]));
    expect(new Set(generateSnake({ cols: 2, rows: 2 }, {}).durations)).toEqual(new Set([MAX_FRAME_MS]));
  });

  it.each(GRIDS)('lights only edge cells as one contiguous run led by the head on $cols x $rows', (grid) => {
    const edge = perimeterIndexes(grid);
    const { frames } = generateSnake(grid, {});
    const length = countLit(frames[0]);
    frames.forEach((frame, index) => {
      const expected = Array.from({ length }, (_, step) => edge[(index - step + edge.length) % edge.length]);
      expect(litIndexes(frame)).toEqual([...expected].sort((a, b) => a - b));
    });
  });

  it.each(GRIDS)('lights each edge cell at most three times a second on $cols x $rows', (grid) => {
    const { frames, durations } = generateSnake(grid, {});
    const lapMs = durations.reduce((sum, ms) => sum + ms, 0);
    const onsets = frames[0].map(
      (_, cell) =>
        frames.filter(
          (frame, index) =>
            frame[cell] === 1 && frames[(index - 1 + frames.length) % frames.length][cell] === 0,
        ).length,
    );
    expect(Math.max(...onsets) / (lapMs / 1000)).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
  });

  it('lights the whole edge when the tail is longer than the loop', () => {
    const output = generateSnake({ cols: 3, rows: 3 }, { length: 40 });
    expect(output.frames.map((frame) => toFrameText(frame, 3))).toEqual(
      Array.from({ length: 8 }, () => '111 101 111'),
    );
  });
});
