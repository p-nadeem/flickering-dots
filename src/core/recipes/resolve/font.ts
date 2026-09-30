import { createRng } from '../../rng';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { createBlankFrame } from '../helpers';
import type { RecipeOutput } from '../helpers';
import { boardLayout, drawBoard, fitWord, flipFrames, settledFaces, slotPath } from './font-board';
import type { BoardLayout } from './font-board';
import { parseWords } from './font-glyphs';
import { joinOutputs, RESOLVE_DEFAULT_SEED } from './shared';

const HALF_MS = 50;
const WORD_HOLD_MS = 900;
const REST_MS = 1000;
const BASE_FLIPS = 3;
const IDLE_GLYPH = '----';
const BLANK_CHARACTER = ' ';

/** Everything a font variant needs to draw its board. */
export interface Board {
  grid: GridSize;
  layout: BoardLayout;
  words: string[];
  random: () => number;
}

/** Reads the glyph as board words fitted to the grid, with a seeded generator for the flips. */
export function readBoard(grid: GridSize, params: RecipeParams, fallback: string): Board {
  const parsed = parseWords(params.glyph ?? fallback);
  const layout = boardLayout(grid, Math.max(...parsed.map((word) => word.length)));
  const words = parsed.map((word) => fitWord(word, layout));
  return { grid, layout, words, random: createRng(params.seed ?? RESOLVE_DEFAULT_SEED) };
}

/** A still frame of one settled word. */
export function wordFrame({ grid, layout }: Board, word: string): Frame {
  return layout.slots === 0 ? createBlankFrame(grid) : drawBoard(grid, layout, { faces: settledFaces(word) });
}

/** Duration of one half-frame of a flip, in ms. */
export const FONT_HALF_MS = HALF_MS;

/** Flips from one word to the next, slot i through 3 + i seeded characters, and holds the new word. */
export function flipWord(board: Board, from: string, to: string, holdMs: number): RecipeOutput {
  const paths = [...to].map((character, slot) =>
    slotPath(from[slot], character, BASE_FLIPS + slot, board.random),
  );
  const { frames, durations } = flipFrames(board.grid, board.layout, paths, HALF_MS);
  return { frames, durations: durations.map((ms, index) => (index === durations.length - 1 ? holdMs : ms)) };
}

/** Flips a word in from a blank board and holds it for `holdMs`. */
export function flipIn(board: Board, word: string, holdMs: number): RecipeOutput {
  return flipWord(board, BLANK_CHARACTER.repeat(word.length), word, holdMs);
}

/** The board font: one word stands still; several words flip in turn, top rows first, and each holds 900 ms. */
export function generateFont(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const board = readBoard(grid, params, IDLE_GLYPH);
  const { words } = board;
  if (words.length === 1 || board.layout.slots === 0) {
    return { frames: [wordFrame(board, words[0])], durations: [REST_MS] };
  }
  const flips = words.map((word, index) =>
    flipWord(board, words[(index + words.length - 1) % words.length], word, WORD_HOLD_MS),
  );
  return { ...joinOutputs(...flips), still: flips[0].frames.length - 1 };
}
