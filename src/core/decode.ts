import { DEFAULT_FRAME_MS, GRID_MAX, GRID_MIN } from './constants';
import { isFrameDuration, isGridSide } from './frame';
import type { Bit, Clip, Frame, FramesStateDef, GridSize, IndicatorSet, Transition } from './types';

export const SET_VERSION = 1;
export const SET_ENCODING = 'rows-bitmask-msb-left';
const TRANSITIONS: readonly Transition[] = ['cut', 'flip', 'crossfade'];
const DEFAULT_TRANSITION: Transition = 'cut';
const IMPORTED_ID = 'imported';
const IMPORTED_NAME = 'Imported set';
const IMPORTED_AUTHOR = 'you';
const MIN_ROW_WIDTH = 1;
const MAX_VALUE_TEXT = 40;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const NOT_A_SET = 'Expected a Flickering Dots set with "grid" and "states".';
const NOT_FRAMES = 'Expected an array of frames, each an array of rows.';
const ROW_HINT = 'Rows are arrays of 0 and 1, or strings like "01110".';
const SIZE_HINT = `Flickering Dots supports ${GRID_MIN} to ${GRID_MAX} dots per side.`;

type JsonRecord = Record<string, unknown>;
type GridRows = Bit[][];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatValue(value: unknown): string {
  const text = typeof value === 'number' ? String(value) : stringifyValue(value);
  return text.length > MAX_VALUE_TEXT ? `${text.slice(0, MAX_VALUE_TEXT)}...` : text;
}

function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function parseJsonText(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`This isn't valid JSON: ${reason}`, { cause: error });
  }
}

function getRowMax(cols: number): number {
  return 2 ** cols - 1;
}

function isRowValue(value: unknown, cols: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= getRowMax(cols);
}

function assertRowWidth(caller: string, cols: number): void {
  if (Number.isInteger(cols) && cols >= MIN_ROW_WIDTH && cols <= GRID_MAX) return;
  throw new Error(
    `flickering-dots ${caller}: cols must be a whole number from ${MIN_ROW_WIDTH} to ${GRID_MAX}, got ${formatValue(cols)}`,
  );
}

function toRowBits(value: number, cols: number): Bit[] {
  return Array.from({ length: cols }, (_, x) => (Math.floor(value / 2 ** (cols - 1 - x)) % 2 === 1 ? 1 : 0));
}

/** Encodes each row as a bitmask, most significant bit on the left. */
export function rowsOf(frame: Frame, cols: number): number[] {
  assertRowWidth('rowsOf', cols);
  if (frame.length % cols !== 0) {
    throw new Error(
      `flickering-dots rowsOf: a frame of ${frame.length} cells does not split into rows of ${cols}`,
    );
  }
  return Array.from({ length: frame.length / cols }, (_, y) =>
    frame.slice(y * cols, (y + 1) * cols).reduce<number>((value, bit) => value * 2 + (bit ? 1 : 0), 0),
  );
}

/** Decodes bitmask rows (most significant bit on the left) into a frame `cols` wide. */
export function frameFromRows(rows: readonly number[], cols: number): Frame {
  assertRowWidth('frameFromRows', cols);
  rows.forEach((value, index) => {
    if (isRowValue(value, cols)) return;
    throw new Error(
      `flickering-dots frameFromRows: rows[${index}] is ${formatValue(value)}, but rows ${cols} wide are whole numbers from 0 to ${getRowMax(cols)}`,
    );
  });
  return rows.flatMap((value) => toRowBits(value, cols));
}

function assertFormat(input: JsonRecord): void {
  const { version, encoding } = input;
  if (version !== undefined && version !== SET_VERSION) {
    throw new Error(
      `This set uses format version ${formatValue(version)}, which this version of Flickering Dots cannot open.`,
    );
  }
  if (encoding !== undefined && encoding !== SET_ENCODING) {
    throw new Error(
      `This set uses the encoding ${formatValue(encoding)}. Flickering Dots reads "${SET_ENCODING}".`,
    );
  }
}

function toGrid(value: unknown): GridSize {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`The grid must be [columns, rows], got ${formatValue(value)}.`);
  }
  const [cols, rows] = value;
  if (!isGridSide(cols) || !isGridSide(rows)) {
    throw new Error(`The grid is ${formatValue(cols)}×${formatValue(rows)}. ${SIZE_HINT}`);
  }
  return { cols, rows };
}

function toText(value: unknown, fallback: string, message: string): string {
  if (value === undefined) return fallback;
  if (typeof value === 'string' && value.trim() !== '') return value;
  throw new Error(message);
}

function toAuthor(value: unknown): string {
  if (value === undefined) return IMPORTED_AUTHOR;
  if (typeof value === 'string') return value;
  throw new Error('The author must be text.');
}

function toTransition(value: unknown): Transition {
  if (value === undefined) return DEFAULT_TRANSITION;
  const match = TRANSITIONS.find((transition) => transition === value);
  if (match) return match;
  throw new Error(`The transition ${formatValue(value)} is not one of cut, flip or crossfade.`);
}

function toTags(value: unknown): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value) && value.every((tag) => typeof tag === 'string')) return [...value];
  throw new Error('Tags must be a list of text.');
}

function toRowValue(value: unknown, cols: number, label: string): number {
  if (isRowValue(value, cols)) return value;
  throw new Error(
    `${label} is ${formatValue(value)}. Rows of a ${cols}-dot grid are whole numbers from 0 to ${getRowMax(cols)}.`,
  );
}

function decodeFrame(value: unknown, grid: GridSize, label: string): Frame {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list of row numbers.`);
  if (value.length !== grid.rows) {
    throw new Error(`${label} has ${formatCount(value.length, 'row')} but the grid has ${grid.rows}.`);
  }
  const rows = value.map((row: unknown, index) => toRowValue(row, grid.cols, `${label}, row ${index + 1}`));
  return frameFromRows(rows, grid.cols);
}

function decodeDurations(value: unknown, frameCount: number, label: string): number[] {
  if (!Array.isArray(value)) throw new Error(`${label} needs one duration per frame.`);
  if (value.length !== frameCount) {
    throw new Error(
      `${label} has ${formatCount(frameCount, 'frame')} but ${formatCount(value.length, 'duration')}. Give one duration per frame.`,
    );
  }
  return value.map((duration: unknown, index) => {
    if (isFrameDuration(duration)) return duration;
    throw new Error(
      `${label}, frame ${index + 1} has a duration of ${formatValue(duration)}. Durations are positive numbers of milliseconds.`,
    );
  });
}

function toStateColor(value: unknown, label: string): Pick<FramesStateDef, 'on'> {
  if (value === undefined) return {};
  if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value)) return { on: value };
  throw new Error(`${label} has the colour ${formatValue(value)}. Use a hex colour like #1a2b3c.`);
}

function decodeState(name: string, value: unknown, grid: GridSize): FramesStateDef {
  const label = `State ${JSON.stringify(name)}`;
  if (!isRecord(value)) throw new Error(`${label} must have "frames" and "durations".`);
  const { frames, durations } = value;
  if (!Array.isArray(frames) || frames.length === 0) throw new Error(`${label} has no frames.`);
  return {
    kind: 'frames',
    frames: frames.map((frame: unknown, index) => decodeFrame(frame, grid, `${label}, frame ${index + 1}`)),
    durations: decodeDurations(durations, frames.length, label),
    ...toStateColor(value.on, label),
  };
}

function decodeTransitions(
  value: unknown,
  states: Readonly<Record<string, unknown>>,
): Pick<IndicatorSet, 'transitions'> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error('Transitions must be an object of state names.');
  const entries = Object.entries(value).map(([name, transition]) => {
    if (!Object.hasOwn(states, name))
      throw new Error(`The transition into ${JSON.stringify(name)} names no state of the set.`);
    return [name, toTransition(transition)] as const;
  });
  return entries.length === 0 ? {} : { transitions: Object.fromEntries(entries) };
}

function decodeStates(value: unknown, grid: GridSize): Record<string, FramesStateDef> {
  if (!isRecord(value)) throw new Error('States must be an object of named states.');
  const entries = Object.entries(value);
  if (entries.length === 0) throw new Error('The set has no states.');
  return Object.fromEntries(
    entries.map(([name, state]) => {
      if (name === '') throw new Error('State names must not be empty.');
      return [name, decodeState(name, state, grid)];
    }),
  );
}

/** Validates unknown input and returns a set with `source: 'mine'` and frames states. Throws a readable Error. */
export function decodeSet(data: unknown): IndicatorSet {
  const input = parseJsonText(data);
  if (!isRecord(input) || !('grid' in input) || !('states' in input)) throw new Error(NOT_A_SET);
  assertFormat(input);
  const grid = toGrid(input.grid);
  const states = decodeStates(input.states, grid);
  return {
    id: toText(input.id, IMPORTED_ID, 'The set id must be non-empty text.'),
    name: toText(input.name, IMPORTED_NAME, 'The set name must be non-empty text.'),
    cols: grid.cols,
    rows: grid.rows,
    states,
    transition: toTransition(input.transition),
    ...decodeTransitions(input.transitions, states),
    tags: toTags(input.tags),
    author: toAuthor(input.author),
    source: 'mine',
  };
}

function toFrameList(value: unknown): unknown[] {
  const frames = isRecord(value) ? value.frames : value;
  if (!Array.isArray(frames) || frames.length === 0) throw new Error(NOT_FRAMES);
  return frames;
}

function toCell(cell: unknown, label: string, dot: number): Bit {
  if (cell === 0 || cell === '0') return 0;
  if (cell === 1 || cell === '1') return 1;
  throw new Error(`${label} has ${formatValue(cell)} at dot ${dot}. Use 0 for off and 1 for on.`);
}

function toGridRow(row: unknown, label: string): Bit[] {
  const cells: unknown = typeof row === 'string' ? row.split('') : row;
  if (!Array.isArray(cells)) throw new Error(`${label} is not a row. ${ROW_HINT}`);
  return cells.map((cell: unknown, index) => toCell(cell, label, index + 1));
}

function toGridRows(frame: unknown, frameNumber: number): GridRows {
  if (!Array.isArray(frame)) throw new Error(`Frame ${frameNumber} is not a list of rows. ${ROW_HINT}`);
  return frame.map((row: unknown, index) => toGridRow(row, `Frame ${frameNumber}, row ${index + 1}`));
}

function getSize(rows: GridRows): GridSize {
  return { cols: rows[0]?.length ?? 0, rows: rows.length };
}

function assertSameSize(frame: GridRows, frameNumber: number, first: GridSize): void {
  const size = getSize(frame);
  if (size.cols !== first.cols || size.rows !== first.rows) {
    throw new Error(
      `Frame ${frameNumber} is ${size.cols}×${size.rows} but frame 1 is ${first.cols}×${first.rows}. Every frame must have the same size, between ${GRID_MIN} and ${GRID_MAX} per side.`,
    );
  }
  frame.forEach((row, index) => {
    if (row.length === size.cols) return;
    throw new Error(
      `Frame ${frameNumber}, row ${index + 1} has ${formatCount(row.length, 'dot')} but row 1 has ${size.cols}. Every row must be the same width.`,
    );
  });
}

/** Parses a flicker-dot style array of frames of 0/1 rows into a clip. Throws a readable Error. */
export function parseGridArray(input: unknown): Clip {
  const grids = toFrameList(parseJsonText(input)).map((frame, index) => toGridRows(frame, index + 1));
  const size = getSize(grids[0]);
  grids.forEach((frame, index) => assertSameSize(frame, index + 1, size));
  if (!isGridSide(size.cols) || !isGridSide(size.rows)) {
    throw new Error(`Grids are ${size.cols}×${size.rows}. ${SIZE_HINT}`);
  }
  return {
    cols: size.cols,
    rows: size.rows,
    frames: grids.map((frame) => frame.flat()),
    durations: grids.map(() => DEFAULT_FRAME_MS),
  };
}
