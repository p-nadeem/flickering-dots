import type { Frame, GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { drawBoard, flipFrames, settledFaces, slotPath } from './font-board';
import type { Underline } from './font-board';
import { FONT_HEIGHT } from './font-glyphs';
import { flipIn, FONT_HALF_MS, readBoard, wordFrame } from './font';
import type { Board } from './font';
import { joinOutputs, range, RESULT_HOLD_MS } from './shared';

const WAIT_GLYPH = 'WAIT';
const DONE_GLYPH = 'DONE';
const FAIL_GLYPH = 'FAIL';
const WAIT_HOLD_MS = 1200;
const WAIT_FLIPS = 4;
const PAUSE_MS = 200;
const FAIL_PAUSE_MS = 600;
const SWEEP_MS = 40;
const SHAKE_MS = 80;
const SHAKE_COUNT = 2;
const UNDERLINE_GAP_ROWS = 2;

function hold(frame: Frame, ms: number): RecipeOutput {
  return { frames: [frame], durations: [ms] };
}

/** The word holds, then its last character flips through three seeded characters and back; a loop. */
export function generateFontWait(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const board = readBoard(grid, params, WAIT_GLYPH);
  const word = board.words[0];
  const rest = hold(wordFrame(board, word), WAIT_HOLD_MS);
  if (board.layout.slots === 0) return rest;
  const lastSlot = word.length - 1;
  const cycling = slotPath(word[lastSlot], word[lastSlot], WAIT_FLIPS, board.random);
  const paths = [...word].map((character, slot) => (slot === lastSlot ? cycling : [character]));
  const flips = flipFrames(grid, board.layout, paths, FONT_HALF_MS);
  return joinOutputs(rest, { frames: flips.frames.slice(0, -1), durations: flips.durations.slice(0, -1) });
}

function underlineRow({ grid, layout }: Board): number | undefined {
  const below = layout.top + FONT_HEIGHT;
  const spare = grid.rows - below;
  if (spare < 1) return undefined;
  return spare >= UNDERLINE_GAP_ROWS ? below + 1 : below;
}

function sweep(board: Board, word: string, row: number): RecipeOutput {
  const faces = settledFaces(word);
  const frames = range(1, board.layout.width + 1).map((length): Frame => {
    const underline: Underline = { row, length };
    return drawBoard(board.grid, board.layout, { faces, underline });
  });
  return {
    frames,
    durations: frames.map((_, index) => (index === frames.length - 1 ? RESULT_HOLD_MS : SWEEP_MS)),
  };
}

/** DONE flips in, pauses, then an underline sweeps under it at 40 ms and holds. */
export function generateFontDone(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const board = readBoard(grid, params, DONE_GLYPH);
  const word = board.words[0];
  if (board.layout.slots === 0) return hold(wordFrame(board, word), RESULT_HOLD_MS);
  const row = underlineRow(board);
  if (row === undefined) return flipIn(board, word, RESULT_HOLD_MS);
  return joinOutputs(flipIn(board, word, PAUSE_MS), sweep(board, word, row));
}

function shakeDirection({ grid, layout }: Board): number {
  if (layout.left + layout.width < grid.cols) return 1;
  return layout.left > 0 ? -1 : 0;
}

/** FAIL flips in, pauses, then the board shakes one column twice at 80 ms and holds. */
export function generateFontFail(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const board = readBoard(grid, params, FAIL_GLYPH);
  const word = board.words[0];
  if (board.layout.slots === 0) return hold(wordFrame(board, word), RESULT_HOLD_MS);
  const shift = shakeDirection(board);
  if (shift === 0) return flipIn(board, word, RESULT_HOLD_MS);
  const faces = settledFaces(word);
  const shaken = drawBoard(grid, board.layout, { faces, shift });
  const still = wordFrame(board, word);
  const shake = range(0, SHAKE_COUNT).flatMap(() => [shaken, still]);
  const durations = shake.map((_, index) => (index === shake.length - 1 ? RESULT_HOLD_MS : SHAKE_MS));
  return joinOutputs(flipIn(board, word, FAIL_PAUSE_MS), { frames: shake, durations });
}
