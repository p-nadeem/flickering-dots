import { describe, expect, it } from 'vitest';

import { generateFont } from '../../../../src/core/recipes/resolve/font';
import {
  generateFontDone,
  generateFontFail,
  generateFontWait,
} from '../../../../src/core/recipes/resolve/font-results';
import { isFontGlyph } from '../../../../src/core/recipes/resolve/font-glyphs';
import type { Frame } from '../../../../src/core/types';

import { lastFrame, rowsOf } from './support-b';

const BOARD = { cols: 16, rows: 7 };
const BLANK = '................';
const WORDS = 'PLAN|READ|CODE|TEST';
const HALF_MS = 50;
const WORD_HOLD_MS = 900;
const SWEEP_MS = 40;
const SHAKE_MS = 80;
const PAUSE_MS = 200;
const FAIL_PAUSE_MS = 600;
const RESULT_HOLD_MS = 1500;
const WAIT_HOLD_MS = 1200;
const SLOT_WIDTH = 3;
const SLOT_PITCH = 4;
const FRAMES_PER_WORD = 12;

const PLAN = [
  '###.#....#..##..',
  '#.#.#...#.#.#.#.',
  '###.#...###.#.#.',
  '#...#...#.#.#.#.',
  '#...###.#.#.#.#.',
];
const READ = [
  '##..###..#..##..',
  '#.#.#...#.#.#.#.',
  '##..##..###.#.#.',
  '#.#.#...#.#.#.#.',
  '#.#.###.#.#.##..',
];
const CODE = [
  '.##..#..##..###.',
  '#...#.#.#.#.#...',
  '#...#.#.#.#.##..',
  '#...#.#.#.#.#...',
  '.##..#..##..###.',
];
const TEST = [
  '###.###..##.###.',
  '.#..#...#....#..',
  '.#..##...#...#..',
  '.#..#.....#..#..',
  '.#..###.##...#..',
];
const DONE = [
  '##...#..##..###.',
  '#.#.#.#.#.#.#...',
  '#.#.#.#.#.#.##..',
  '#.#.#.#.#.#.#...',
  '##...#..#.#.###.',
];
const FAIL = [
  '###..#..###.#...',
  '#...#.#..#..#...',
  '##..###..#..#...',
  '#...#.#..#..#...',
  '#...#.#.###.###.',
];
const WAIT = [
  '#.#..#..###.###.',
  '#.#.#.#..#...#..',
  '###.###..#...#..',
  '###.#.#..#...#..',
  '#.#.#.#.###..#..',
];

function board(text: readonly string[], underline = BLANK): string[] {
  return [BLANK, ...text, underline];
}

function slotColumns(frame: Frame, slot: number): string[] {
  const start = slot * SLOT_PITCH;
  return rowsOf(frame, BOARD.cols).map((row) => row.slice(start, start + SLOT_WIDTH));
}

function shifted(rows: readonly string[], dx: number): string[] {
  return rows.map((row) => (dx > 0 ? `${'.'.repeat(dx)}${row.slice(0, -dx)}` : row));
}

describe('resolve font', () => {
  it('draws four dashes, still, for the idle board', () => {
    const output = generateFont(BOARD, { variant: 'font', glyph: '----' });
    expect(output.frames.map((frame) => rowsOf(frame, BOARD.cols))).toEqual([
      board([BLANK, BLANK, '###.###.###.###.', BLANK, BLANK]),
    ]);
    expect(output.durations).toHaveLength(1);
  });

  it('flips through the four words, each settling left to right and holding 900 ms', () => {
    const output = generateFont(BOARD, { variant: 'font', glyph: WORDS });
    expect(output.frames).toHaveLength(4 * FRAMES_PER_WORD);
    [PLAN, READ, CODE, TEST].forEach((word, index) => {
      expect(rowsOf(output.frames[(index + 1) * FRAMES_PER_WORD - 1], BOARD.cols)).toEqual(board(word));
    });
    const perWord = [...Array.from({ length: FRAMES_PER_WORD - 1 }, () => HALF_MS), WORD_HOLD_MS];
    expect(output.durations).toEqual([...perWord, ...perWord, ...perWord, ...perWord]);
    expect(output.still).toBe(FRAMES_PER_WORD - 1);
  });

  it('turns the top rows first and locks slot i after 3 + i changes', () => {
    const output = generateFont(BOARD, { variant: 'font', glyph: WORDS });
    const settled = output.frames[FRAMES_PER_WORD - 1];
    expect(rowsOf(output.frames[0], BOARD.cols).slice(4, 6)).toEqual(board(TEST).slice(4, 6));
    [0, 1, 2, 3].forEach((slot) => {
      const lockedAt = 2 * (3 + slot) - 1;
      expect(slotColumns(output.frames[lockedAt - 1], slot).slice(0, 4)).toEqual(
        slotColumns(settled, slot).slice(0, 4),
      );
      output.frames.slice(lockedAt, FRAMES_PER_WORD).forEach((frame) => {
        expect(slotColumns(frame, slot)).toEqual(slotColumns(settled, slot));
      });
      expect(slotColumns(output.frames[lockedAt - 2], slot)).not.toEqual(slotColumns(settled, slot));
    });
  });

  it('keeps the same frames for the same seed and changes them for another', () => {
    const params = { variant: 'font', glyph: WORDS, seed: 3 };
    expect(generateFont(BOARD, params)).toEqual(generateFont(BOARD, params));
    expect(generateFont(BOARD, { ...params, seed: 4 })).not.toEqual(generateFont(BOARD, params));
  });

  it('holds WAIT and keeps flipping only its last character', () => {
    const output = generateFontWait(BOARD, { variant: 'font-wait' });
    expect(rowsOf(output.frames[0], BOARD.cols)).toEqual(board(WAIT));
    expect(output.durations).toEqual([WAIT_HOLD_MS, ...Array.from({ length: 7 }, () => HALF_MS)]);
    output.frames.forEach((frame) => {
      [0, 1, 2].forEach((slot) =>
        expect(slotColumns(frame, slot)).toEqual(slotColumns(output.frames[0], slot)),
      );
    });
    expect(new Set(output.frames.map((frame) => slotColumns(frame, 3).join(''))).size).toBe(8);
  });

  it('flips DONE in, pauses, sweeps an underline under it at 40 ms and holds', () => {
    const output = generateFontDone(BOARD, { variant: 'font-done' });
    const flip = [...Array.from({ length: FRAMES_PER_WORD - 1 }, () => HALF_MS), PAUSE_MS];
    const sweep = [...Array.from({ length: 14 }, () => SWEEP_MS), RESULT_HOLD_MS];
    expect(output.durations).toEqual([...flip, ...sweep]);
    expect(rowsOf(output.frames[FRAMES_PER_WORD - 1], BOARD.cols)).toEqual(board(DONE));
    expect(rowsOf(output.frames[FRAMES_PER_WORD], BOARD.cols)).toEqual(board(DONE, `#${BLANK.slice(1)}`));
    expect(rowsOf(lastFrame(output), BOARD.cols)).toEqual(board(DONE, '###############.'));
  });

  it('flips FAIL in, waits 600 ms, then shakes the board one column twice at 80 ms', () => {
    const output = generateFontFail(BOARD, { variant: 'font-fail' });
    const tail = output.frames.slice(-4).map((frame) => rowsOf(frame, BOARD.cols));
    expect(tail).toEqual([shifted(board(FAIL), 1), board(FAIL), shifted(board(FAIL), 1), board(FAIL)]);
    expect(output.durations.slice(-5)).toEqual([FAIL_PAUSE_MS, SHAKE_MS, SHAKE_MS, SHAKE_MS, RESULT_HOLD_MS]);
    expect(rowsOf(output.frames[FRAMES_PER_WORD - 1], BOARD.cols)).toEqual(board(FAIL));
  });

  it('shows as many characters as fit and crops a board shorter than the font', () => {
    const narrow = generateFont({ cols: 12, rows: 5 }, { variant: 'font', glyph: '----' });
    expect(rowsOf(narrow.frames[0], 12)).toEqual([
      '............',
      '............',
      '###.###.###.',
      '............',
      '............',
    ]);
    const short = generateFont({ cols: 16, rows: 3 }, { variant: 'font', glyph: 'PLAN' });
    expect(rowsOf(short.frames[0], 16)).toEqual(PLAN.slice(1, 4));
  });

  it('accepts words in any case and rejects characters the font cannot draw', () => {
    expect(generateFont(BOARD, { glyph: 'plan' })).toEqual(generateFont(BOARD, { glyph: 'PLAN' }));
    expect(() => generateFont(BOARD, { glyph: 'PL@N' })).toThrow(
      'flickering-dots resolve: glyph "PL@N" is not a font glyph; use letters, digits, spaces and dashes, with | between words',
    );
    expect(isFontGlyph('PLAN|READ')).toBe(true);
    expect(isFontGlyph('----')).toBe(true);
    expect(isFontGlyph('PLAN||READ')).toBe(false);
    expect(isFontGlyph('check')).toBe(true);
    expect(isFontGlyph('5-1')).toBe(true);
    expect(isFontGlyph('')).toBe(false);
  });
});
