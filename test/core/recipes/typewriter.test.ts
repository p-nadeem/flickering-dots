import { describe, expect, it } from 'vitest';

import { TYPEWRITER_DEFAULTS, generateTypewriter } from '../../../src/core/recipes/typewriter';
import type { Frame, GridSize } from '../../../src/core/types';

import { countLit, toOutputText } from './frame-text';

const TYPE_MS = 90;
const BLINK_MS = 530;
const BLINK_FRAMES = 4;
const CARET_OFF_FRAMES = 2;
const MIN_WORD = 2;
const MAX_WORD = 5;
const CARET_HEIGHT = 3;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;
const PRESET_GRID: GridSize = { cols: 10, rows: 3 };
const SHAPE_GRIDS: readonly GridSize[] = [
  { cols: 3, rows: 3 },
  { cols: 10, rows: 3 },
  { cols: 7, rows: 4 },
  { cols: 5, rows: 5 },
  { cols: 8, rows: 6 },
  { cols: 7, rows: 7 },
  { cols: 12, rows: 9 },
  { cols: 16, rows: 16 },
];
const SEEDS: readonly number[] = [1, 2, 7, 23, 99];

function isLit(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  return frame[y * grid.cols + x] === 1;
}

function getRow(frame: Frame, grid: GridSize, y: number): string {
  return Array.from({ length: grid.cols }, (_, x) => (isLit(frame, grid, x, y) ? '#' : '.')).join('');
}

function getLitRows(frame: Frame, grid: GridSize): number[] {
  return Array.from({ length: grid.rows }, (_, y) => y).filter((y) => getRow(frame, grid, y).includes('#'));
}

function getCaretColumns(frame: Frame, grid: GridSize): number[] {
  const height = Math.min(grid.rows, CARET_HEIGHT);
  const tops = Array.from({ length: grid.rows - height + 1 }, (_, top) => top);
  return Array.from({ length: grid.cols }, (_, x) => x).filter((x) =>
    tops.some((top) =>
      Array.from({ length: height }, (_, dy) => top + dy).every((y) => isLit(frame, grid, x, y)),
    ),
  );
}

function hasCaret(frame: Frame, grid: GridSize): boolean {
  return getCaretColumns(frame, grid).length === 1;
}

function getWordLengths(row: string): number[] {
  return row
    .split('.')
    .filter((word) => word.length > 0)
    .map((word) => word.length);
}

function getTypedFrame(grid: GridSize, seed?: number): Frame {
  const { frames } = generateTypewriter(grid, seed === undefined ? {} : { seed });
  return frames[frames.length - 1];
}

function getLineRows(grid: GridSize): number[] {
  return getLitRows(getTypedFrame(grid), grid);
}

describe('generateTypewriter', () => {
  it('seeds the word lengths by default', () => {
    expect(TYPEWRITER_DEFAULTS).toEqual({ seed: 31 });
  });

  it('types three dot-words on 10x3 behind a steady caret, then blinks twice', () => {
    expect(toOutputText(generateTypewriter(PRESET_GRID), PRESET_GRID.cols)).toEqual({
      frames: [
        '1000000000 1000000000 1000000000',
        '0100000000 1100000000 0100000000',
        '0010000000 1110000000 0010000000',
        '0001000000 1101000000 0001000000',
        '0000100000 1101100000 0000100000',
        '0000010000 1101110000 0000010000',
        '0000001000 1101111000 0000001000',
        '0000000100 1101110100 0000000100',
        '0000000010 1101110110 0000000010',
        '0000000001 1101110111 0000000001',
        '0000000000 1101110110 0000000000',
        '0000000001 1101110111 0000000001',
        '0000000000 1101110110 0000000000',
      ],
      durations: [530, 90, 90, 90, 90, 90, 90, 90, 90, 530, 530, 530, 530],
    });
  });

  it('wraps the text onto rows 1 and 3 on 5x5', () => {
    expect(toOutputText(generateTypewriter({ cols: 5, rows: 5 }), 5)).toEqual({
      frames: [
        '10000 10000 10000 00000 00000',
        '01000 11000 01000 00000 00000',
        '00100 11100 00100 00000 00000',
        '00000 11000 10000 10000 10000',
        '00000 11000 01000 11000 01000',
        '00000 11000 00100 11100 00100',
        '00000 11000 00010 11110 00010',
        '00000 11000 00000 11100 00000',
        '00000 11000 00010 11110 00010',
        '00000 11000 00000 11100 00000',
      ],
      durations: [530, 90, 90, 90, 90, 90, 530, 530, 530, 530],
    });
  });

  it('starts every loop with a cleared line and the caret at the left edge', () => {
    for (const grid of SHAPE_GRIDS) {
      const [first] = generateTypewriter(grid).frames;
      expect(countLit(first)).toBe(Math.min(grid.rows, CARET_HEIGHT));
      expect(getCaretColumns(first, grid)).toEqual([0]);
    }
  });

  it('types one dot per frame at 90 ms and keeps the caret on while typing', () => {
    for (const grid of SHAPE_GRIDS) {
      const { frames, durations } = generateTypewriter(grid);
      const typing = frames.slice(0, 1 - BLINK_FRAMES);
      typing.forEach((frame, index) => {
        expect(hasCaret(frame, grid)).toBe(true);
        if (index > 0) expect(countLit(frame) - countLit(typing[index - 1])).toBeLessThanOrEqual(1);
      });
      expect(durations.slice(1, -BLINK_FRAMES)).toEqual(typing.slice(1, -1).map(() => TYPE_MS));
    }
  });

  it('writes words of 2 to 5 dots with one-column gaps from the left edge', () => {
    for (const grid of SHAPE_GRIDS) {
      for (const seed of SEEDS) {
        const typed = getTypedFrame(grid, seed);
        for (const y of getLitRows(typed, grid)) {
          const row = getRow(typed, grid, y);
          expect(row.startsWith('#')).toBe(true);
          expect(row).not.toContain('#..#');
          getWordLengths(row).forEach((length) => {
            expect(length).toBeGreaterThanOrEqual(MIN_WORD);
            expect(length).toBeLessThanOrEqual(MAX_WORD);
          });
        }
      }
    }
  });

  it('leaves the last column free for the caret at the end of every line', () => {
    for (const grid of SHAPE_GRIDS) {
      for (const seed of SEEDS) {
        const typed = getTypedFrame(grid, seed);
        getLitRows(typed, grid).forEach((y) => expect(getRow(typed, grid, y).endsWith('#')).toBe(false));
      }
    }
  });

  it('blinks the caret off and on twice at 530 ms, then clears the line', () => {
    for (const grid of SHAPE_GRIDS) {
      const { frames, durations } = generateTypewriter(grid);
      const [on, off, onAgain, offAgain] = frames.slice(-BLINK_FRAMES);
      expect(durations.slice(-BLINK_FRAMES)).toEqual([BLINK_MS, BLINK_MS, BLINK_MS, BLINK_MS]);
      expect(onAgain).toEqual(on);
      expect(offAgain).toEqual(off);
      expect(countLit(on) - countLit(off)).toBe(Math.min(grid.rows, CARET_HEIGHT));
      expect(frames.filter((frame) => !hasCaret(frame, grid))).toHaveLength(CARET_OFF_FRAMES);
    }
  });

  it('holds the cleared line with the caret on for one blink before typing', () => {
    for (const grid of SHAPE_GRIDS) expect(generateTypewriter(grid).durations[0]).toBe(BLINK_MS);
  });

  it('keeps the caret blink under three flashes per second', () => {
    const minPhaseMs = MS_PER_SECOND / (2 * MAX_FLASHES_PER_SECOND);
    for (const grid of SHAPE_GRIDS) {
      const { frames, durations } = generateTypewriter(grid);
      frames.forEach((frame, index) => {
        if (hasCaret(frame, grid)) return;
        expect(durations[index]).toBeGreaterThanOrEqual(minPhaseMs);
        expect(durations[index - 1]).toBeGreaterThanOrEqual(minPhaseMs);
      });
    }
  });

  it('keeps one line on the middle row of short grids', () => {
    expect(getLineRows(PRESET_GRID)).toEqual([1]);
    expect(getLineRows({ cols: 7, rows: 4 })).toEqual([1]);
  });

  it('wraps onto rows 1, 3 and 5 on grids with five or more rows', () => {
    expect(getLineRows({ cols: 5, rows: 5 })).toEqual([1, 3]);
    expect(getLineRows({ cols: 8, rows: 6 })).toEqual([1, 3]);
    expect(getLineRows({ cols: 7, rows: 7 })).toEqual([1, 3, 5]);
  });

  it('centres the three lines vertically on taller grids', () => {
    expect(getLineRows({ cols: 12, rows: 9 })).toEqual([2, 4, 6]);
    expect(getLineRows({ cols: 16, rows: 16 })).toEqual([5, 7, 9]);
  });

  it('centres the three-dot caret on the line it is typing', () => {
    const grid: GridSize = { cols: 7, rows: 7 };
    const { frames } = generateTypewriter(grid);
    const lineRows = getLineRows(grid);
    frames
      .filter((frame) => hasCaret(frame, grid))
      .forEach((frame) => {
        const [x] = getCaretColumns(frame, grid);
        const centredOn = lineRows.filter((row) =>
          [row - 1, row, row + 1].every((y) => isLit(frame, grid, x, y)),
        );
        expect(centredOn).toHaveLength(1);
        expect(isLit(frame, grid, x, centredOn[0] + 2)).toBe(false);
      });
  });

  it('is deterministic for a seed and varies the words between seeds', () => {
    const first = generateTypewriter(PRESET_GRID, { seed: 4 });
    expect(generateTypewriter(PRESET_GRID, { seed: 4 })).toEqual(first);
    const lines = SEEDS.map((seed) => getRow(getTypedFrame(PRESET_GRID, seed), PRESET_GRID, 1));
    expect(new Set(lines).size).toBeGreaterThan(1);
  });

  it('ignores the frames param because the text sets the length', () => {
    expect(generateTypewriter(PRESET_GRID, { frames: 4 })).toEqual(generateTypewriter(PRESET_GRID));
  });
});
